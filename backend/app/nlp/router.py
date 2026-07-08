"""
Deterministic, zero-cost NL intent router for the analytics function catalog.

Design goals (precision over recall):
  - Never silently guess when confidence is low or two intents are close.
  - Negative keywords are what actually fix cross-intent bleed
    (e.g. "premium vs free retention" must NOT route to retention_by_feature).
  - All params are extracted from a fixed vocabulary (feature names, plan
    names, metric names) -- never free text passed into a query.

This module has NO network calls and NO LLM dependency. It is pure,
synchronous, and unit-testable in isolation.
"""

import re
from dataclasses import dataclass, field
from typing import Callable, Optional

# ---------------------------------------------------------------------------
# Fixed vocabularies (must match your actual dataset's feature/plan names)
# ---------------------------------------------------------------------------
FEATURE_NAMES = ["playlists", "smart search", "offline sync", "lyrics translation", "recommendations", "favorites"]


def extract_feature(q: str) -> Optional[str]:
    for f in FEATURE_NAMES:
        if f in q:
            return f.title()
    return None


def extract_plan_metric(q: str) -> str:
    if any(t in q for t in ("revenue", "arpu", "pay", "spend")):
        return "weeklyRevenuePerUser"
    if any(t in q for t in ("session", "time spent", "engagement time")):
        return "avgSessionMin"
    return "retentionDay30"


def extract_retention_window(q: str) -> Optional[str]:
    if "day 1" in q or "day1" in q or "first day" in q:
        return "day1"
    if "day 7" in q or "day7" in q or "week" in q:
        return "day7"
    return "day30"  # default: the metric people mean when unspecified


# ---------------------------------------------------------------------------
# Intent definitions
# ---------------------------------------------------------------------------
@dataclass
class Intent:
    name: str
    function: str
    keywords: dict           # term -> weight
    phrases: list            # regex patterns; a match adds a large fixed bonus
    negative_keywords: dict = field(default_factory=dict)  # term -> penalty
    param_extractors: dict = field(default_factory=dict)   # param_name -> fn(q) -> value


PHRASE_MATCH_BONUS = 4.0
CONFIDENCE_THRESHOLD = 3.0   # below this: no_match / low_confidence
AMBIGUITY_MARGIN = 1.0       # top two scores closer than this: ambiguous

INTENTS = [
    Intent(
        name="retention_by_feature",
        function="retentionByFeature",
        keywords={"retention": 3, "retain": 3, "retained": 3},
        phrases=[
            r"which feature.*(highest|best|most).*retention",
            r"retention by feature",
            r"feature.*retention",
        ],
        # Fixes the exact bug class you likely have: a plan-comparison
        # question mentioning "retention" must not win this intent.
        negative_keywords={"premium": 2.5, "free": 2.5, "plan": 2, "vs": 1.5, "versus": 1.5},
        param_extractors={"window": extract_retention_window},
    ),
    Intent(
        name="plan_comparison",
        function="planComparison",
        keywords={"premium": 3, "free": 2.5, "compare": 2, "vs": 2, "versus": 2},
        phrases=[r"compare.*(premium|free)", r"(premium|free).*vs.*(premium|free)"],
        param_extractors={"metric": extract_plan_metric},
    ),
    Intent(
        name="engagement_drop",
        function="engagementDropDiagnosis",
        keywords={"drop": 3, "decrease": 3, "why": 2.5, "declin": 2.5, "fell": 2},
        phrases=[
            r"why (did|is|has).*(drop|decreas|declin|fell)",
            r"engagement.*(drop|down|fell)",
        ],
    ),
    Intent(
        name="dau_trend",
        function="dauTrend",
        keywords={"dau": 3, "daily active": 3, "trend": 1.5, "over time": 1.5, "60 days": 2},
        phrases=[r"dau.*(last|past|over)", r"daily active users.*(trend|last|past)"],
        # A "why did DAU drop" question is a diagnosis, not a raw trend --
        # penalize this intent when "why"/"drop" are present.
        negative_keywords={"why": 2.5, "drop": 2},
    ),
    Intent(
        name="funnel",
        function="funnelAnalysis",
        keywords={"funnel": 3, "drop off": 3, "dropoff": 3, "checkout": 2, "conversion": 1.5},
        phrases=[r"where.*(drop off|dropoff|do users leave)", r"funnel"],
    ),
    Intent(
        name="acquisition",
        function="acquisitionChannels",
        keywords={"channel": 3, "acquisition": 3, "campaign": 3, "convert": 1.5, "source": 1.5},
        phrases=[r"(best|top).*channel", r"acquisition channel", r"(best|top).*campaign"],
    ),
    Intent(
        name="revenue",
        function="revenueMetrics",
        keywords={"mrr": 3, "arpu": 3, "ltv": 3, "revenue": 2},
        phrases=[r"\b(mrr|arpu|ltv)\b", r"revenue metrics"],
        # "which feature increases revenue" or "premium vs free revenue"
        # belong to other intents -- don't let bare "revenue" steal those.
        negative_keywords={"premium": 1.5, "free": 1.5, "feature": 1.5},
    ),
    Intent(
        name="churn",
        function="churnAnalysis",
        keywords={"churn": 3, "cancel": 2},
        phrases=[r"churn rate", r"why.*(people|users|customers).*(leav|cancel)"],
    ),
    Intent(
        name="feature_adoption",
        function="featureAdoption",
        keywords={"adoption": 3, "most popular": 2.5, "least used": 2.5},
        phrases=[r"(most|highest) (popular|adopt)", r"weekly adoption"],
        negative_keywords={"retention": 2.5},
    ),
    Intent(
        name="engagement_by_feature",
        function="engagementByFeature",
        keywords={"session": 2, "active users": 2, "most active": 3},
        phrases=[r"(average|avg) session", r"most active"],
        negative_keywords={"drop": 2.5, "why": 2},
    ),
    Intent(
        name="genre_country_analytics",
        function="genreCountryAnalysis",
        keywords={"genre": 4, "country": 3, "music": 1.5, "genre country": 4},
        phrases=[r"most.*genre.*country", r"genre.*country", r"genre.*wise"],
    ),
    Intent(
        name="language_analytics",
        function="languageAnalysis",
        keywords={"language": 4, "languages": 4, "listen": 2.5, "listened": 2.5},
        phrases=[r"which language", r"most.*language", r"language.*listened"],
    ),
    Intent(
        name="search_keyword_analytics",
        function="searchKeywordAnalysis",
        keywords={"keyword": 4, "search bar": 3.5, "typed": 3, "search": 2},
        phrases=[r"common keyword", r"typed.*search", r"search.*keyword"],
    ),
    Intent(
        name="plan_distribution_analytics",
        function="planDistributionAnalysis",
        keywords={"freemium": 4, "paid subscription": 3.5, "percentage of user": 3, "percentage": 2.5, "premium vs free": 3},
        phrases=[r"how many.*freemium", r"percentage.*paid subscription", r"users.*freemium"],
    ),
]


def route(question: str) -> dict:
    """
    Returns one of:
      {"status": "matched", "function": ..., "params": {...}, "confidence": float}
      {"status": "ambiguous", "candidates": [name, name]}
      {"status": "low_confidence", "candidates": [name, ...]}
      {"status": "no_match"}
    Callers MUST branch on `status` -- only "matched" should trigger a
    function call. The other three should surface a clarification UI.
    """
    q = question.lower().strip()
    scored = []

    for intent in INTENTS:
        score = 0.0
        for kw, weight in intent.keywords.items():
            if kw in q:
                score += weight
        for pattern in intent.phrases:
            if re.search(pattern, q):
                score += PHRASE_MATCH_BONUS
        for nkw, penalty in intent.negative_keywords.items():
            if nkw in q:
                score -= penalty
        if score > 0:
            scored.append((score, intent))

    if not scored:
        return {"status": "no_match"}

    scored.sort(key=lambda x: -x[0])
    top_score, top_intent = scored[0]

    if top_score < CONFIDENCE_THRESHOLD:
        return {"status": "low_confidence", "candidates": [i.name for _, i in scored[:3]]}

    if len(scored) > 1 and (top_score - scored[1][0]) < AMBIGUITY_MARGIN:
        return {"status": "ambiguous", "candidates": [scored[0][1].name, scored[1][1].name]}

    params = {}
    for pname, extractor in top_intent.param_extractors.items():
        val = extractor(q)
        if val:
            params[pname] = val

    return {
        "status": "matched",
        "function": top_intent.function,
        "params": params,
        "confidence": round(top_score, 2),
    }
