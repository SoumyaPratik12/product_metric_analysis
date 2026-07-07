import sys
from app.nlp.router import route

test_cases = [
    ("Which feature has the highest retention?", "matched", "retention"),
    ("Why did engagement decrease this week?", "matched", "engagement"),
    ("Show revenue trend", "matched", "revenue"),
    ("Where do users drop off in the funnel?", "matched", "funnel"),
    ("what is the retention rate for notes?", "matched", "retention"),
    ("signup conversion funnel drop-off", "matched", "funnel"),
    ("mrr growth and monthly recurring revenue", "matched", "revenue"),
    ("dau active sessions minutes", "matched", "engagement"),
    ("hello", "low_confidence", None),
    ("who are you", "low_confidence", None),
    ("mrr and retention feature", "low_confidence", None)
]

failed = False
for q, expected_status, expected_fn in test_cases:
    res = route(q)
    status = res["status"]
    fn = res.get("function")
    
    if status != expected_status or (expected_fn and fn != expected_fn):
        print(f"FAILED: query='{q}' expected=({expected_status}, {expected_fn}) got=({status}, {fn})")
        failed = True
    else:
        print(f"PASSED: query='{q}' -> status={status} function={fn}")

if failed:
    sys.exit(1)
else:
    print("ALL TESTS PASSED!")
    sys.exit(0)
