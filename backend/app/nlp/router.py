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
        name="search_analytics",
        function="searchKeywordAnalysis",
        keywords={"keyword": 4, "search": 3, "searches": 3.5, "find": 2, "typed": 2, "search bar": 4},
        phrases=[
            r"most.*search",
            r"search.*keyword",
            r"searches.*no result",
            r"search.*fail.*find"
        ]
    ),
    Intent(
        name="genre_analytics",
        function="genreAnalytics",
        keywords={"genre": 4, "genres": 4, "pop": 2, "rock": 2, "hip hop": 2, "electronic": 2, "bollywood": 2},
        phrases=[
            r"growing.*fastest.*genre",
            r"most popular genre",
            r"compare.*genre",
            r"genre.*retention",
            r"genre.*convert.*premium"
        ]
    ),
    Intent(
        name="language_analytics",
        function="languageAnalysis",
        keywords={"language": 4, "languages": 4, "hindi": 2.5, "english": 2.5, "spanish": 2.5, "streamed": 2},
        phrases=[
            r"language.*stream",
            r"compare.*hindi.*english",
            r"language.*grown",
            r"highest.*listening time.*language"
        ]
    ),
    Intent(
        name="subscription_analytics",
        function="subscriptionAnalytics",
        keywords={"free": 3, "premium": 3.5, "subscription": 3, "plan": 2.5, "revenue": 2, "convert": 2},
        phrases=[
            r"percentage.*free",
            r"percentage.*premium",
            r"country.*highest.*premium conversion",
            r"plan.*generate.*revenue"
        ]
    ),
    Intent(
        name="recommendation_analytics",
        function="recommendationAnalytics",
        keywords={"recommendation": 4, "recommend": 4, "ctr": 3, "click-through": 3, "skipped": 2.5, "algorithm": 3},
        phrases=[
            r"recommendation.*ctr",
            r"recommend.*song.*skip",
            r"recommendation algorithm"
        ]
    ),
    Intent(
        name="listening_behaviour",
        function="listeningBehaviour",
        keywords={"skipped": 3.5, "skip": 3, "artist": 3, "artists": 3.5, "playlist": 3, "playlists": 3.5, "binge": 3},
        phrases=[
            r"song.*skip.*most",
            r"artist.*increase.*listening time",
            r"playlist.*improve.*retention",
            r"binge-listen"
        ]
    ),
    Intent(
        name="geography_analytics",
        function="geographyAnalytics",
        keywords={"country": 3.5, "city": 3, "state": 3, "geographic": 2.5, "india": 2, "usa": 2},
        phrases=[
            r"country.*stream.*most",
            r"city.*highest.*premium",
            r"compare.*india.*usa"
        ]
    ),
    Intent(
        name="time_analytics",
        function="timeAnalytics",
        keywords={"time": 3, "hour": 3.5, "morning": 2.5, "evening": 2.5, "weekend": 3, "weekday": 3, "peak": 3.5},
        phrases=[
            r"peak listening hour",
            r"weekend.*weekday",
            r"time.*premium.*listen"
        ]
    )
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
