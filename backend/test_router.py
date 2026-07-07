"""
Precision regression suite for app.nlp.router.

Run: pytest tests/test_router.py -v

This is the gate: routing precision must stay >= 0.95 on this labeled set
before you ship any change to keywords/phrases/negative_keywords.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.nlp.router import route

# Each entry: (question, expected_function_or_status)
# "ambiguous"/"low_confidence"/"no_match" are valid expected outcomes too --
# a correctly-refused question is a PASS, not a failure.
LABELED_SET = [
    # retention_by_feature
    ("Which feature has the highest retention?", "retentionByFeature"),
    ("Show retention by feature", "retentionByFeature"),
    ("What's our day 30 retention for each feature?", "retentionByFeature"),
    ("Which feature retains users the most?", "retentionByFeature"),

    # plan_comparison -- these SHOULD NOT go to retention_by_feature
    ("Compare retention between Premium and Free users", "planComparison"),
    ("How does premium vs free retention look?", "planComparison"),
    ("Do premium users have better session length than free?", "planComparison"),

    # engagement_drop -- these SHOULD NOT go to dau_trend
    ("Why did engagement drop this week?", "engagementDropDiagnosis"),
    ("Why is DAU decreasing?", "engagementDropDiagnosis"),
    ("What caused the drop in daily active users?", "engagementDropDiagnosis"),

    # dau_trend -- plain trend request, no "why"
    ("Show me DAU over the last 60 days", "dauTrend"),
    ("What's the daily active users trend?", "dauTrend"),

    # funnel
    ("Where do users drop off in the funnel?", "funnelAnalysis"),
    ("Show checkout conversion funnel", "funnelAnalysis"),

    # acquisition
    ("Which acquisition channel converts best?", "acquisitionChannels"),
    ("Best campaign for new users?", "acquisitionChannels"),

    # revenue -- should not be stolen by feature/plan questions
    ("What's our MRR?", "revenueMetrics"),
    ("Show ARPU and LTV", "revenueMetrics"),

    # churn
    ("What's our churn rate and why are people leaving?", "churnAnalysis"),
    ("Why are customers canceling?", "churnAnalysis"),

    # feature_adoption -- should not be stolen by retention
    ("Which feature has the highest weekly adoption?", "featureAdoption"),
    ("What's our most popular feature?", "featureAdoption"),

    # engagement_by_feature
    ("Which users are most active?", "engagementByFeature"),
    ("Average session duration by feature?", "engagementByFeature"),

    # Deliberately vague / out-of-scope -- MUST NOT silently guess
    ("how's it going", "no_match"),
    ("tell me something interesting", "no_match"),
]


def test_routing_precision():
    correct = 0
    correctly_refused = 0
    wrong = []
    for question, expected in LABELED_SET:
        result = route(question)
        status = result["status"]
        actual = result.get("function", status)  # "matched" -> function name; else status string
        if actual == expected:
            correct += 1
            if status != "matched":
                correctly_refused += 1
        else:
            wrong.append((question, expected, result))

    precision = correct / len(LABELED_SET)
    print(f"\nPrecision: {precision:.2%} ({correct}/{len(LABELED_SET)})")
    for q, exp, got in wrong:
        print(f"  MISROUTE: '{q}' expected={exp} got={got}")

    assert precision >= 0.95, f"Routing precision {precision:.2%} below 0.95 gate. See misroutes above."


if __name__ == "__main__":
    test_routing_precision()
