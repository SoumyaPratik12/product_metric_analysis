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
    # searchKeywordAnalysis
    ("What is the most searched keyword?", "searchKeywordAnalysis"),
    ("Which searches return no results?", "searchKeywordAnalysis"),
    ("What do users search for in India?", "searchKeywordAnalysis"),
    ("Which keyword is growing this month?", "searchKeywordAnalysis"),

    # genreAnalytics
    ("Which genre is most popular in Germany?", "genreAnalytics"),
    ("Compare Pop vs Rock listening time.", "genreAnalytics"),
    ("Which genre has the highest retention?", "genreAnalytics"),
    ("Which genre converts users to Premium?", "genreAnalytics"),

    # languageAnalysis
    ("Which language is streamed the most?", "languageAnalysis"),
    ("Compare Hindi vs English.", "languageAnalysis"),
    ("Which language has grown this month?", "languageAnalysis"),

    # subscriptionAnalytics
    ("What percentage of users are Free?", "subscriptionAnalytics"),
    ("What percentage of users are Premium?", "subscriptionAnalytics"),
    ("Which plan generates the most revenue?", "subscriptionAnalytics"),

    # recommendationAnalytics
    ("Which recommendations have the highest click-through rate?", "recommendationAnalytics"),
    ("Which recommended songs are skipped?", "recommendationAnalytics"),
    ("Which recommendation algorithm performs best?", "recommendationAnalytics"),

    # listeningBehaviour
    ("Which songs are skipped most?", "listeningBehaviour"),
    ("Which artists increase listening time?", "listeningBehaviour"),
    ("Which playlists improve retention?", "listeningBehaviour"),

    # geographyAnalytics
    ("Which country streams the most music?", "geographyAnalytics"),
    ("Which city has the highest Premium adoption?", "geographyAnalytics"),
    ("Compare India vs USA.", "geographyAnalytics"),

    # timeAnalytics
    ("Peak listening hour.", "timeAnalytics"),
    ("Weekend vs weekday.", "timeAnalytics"),
    ("What time do Premium users listen to music?", "timeAnalytics"),

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
