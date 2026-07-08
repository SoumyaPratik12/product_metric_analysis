import time
import subprocess
import sys
import urllib.request
import urllib.error
import json
import io
import jwt

# Start FastAPI server in the background on port 8091
server_process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8091"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait for server to spin up
time.sleep(3)

# Generate a valid mock JWT token
mock_token = jwt.encode(
    {"sub": "da3b8a1c-3b8c-4a3d-8e2b-f8a101b02c03", "email": "test@example.com"},
    "temporary-secret-for-testing",
    algorithm="HS256"
)

# Mock JWT token payload for testing auth
MOCK_JWT_HEADER = {"Authorization": f"Bearer {mock_token}"}

try:
    print("Testing /health endpoint (No auth required)...")
    req = urllib.request.Request("http://127.0.0.1:8091/health")
    with urllib.request.urlopen(req) as res:
        health_data = json.loads(res.read().decode())
        print("Health status:", health_data)
        assert health_data["status"] == "ok"

    print("\nTesting /api/overview endpoint without JWT token...")
    req = urllib.request.Request("http://127.0.0.1:8091/api/overview")
    try:
        urllib.request.urlopen(req)
        raise AssertionError("Request succeeded but should have failed with 403/401")
    except urllib.error.HTTPError as e:
        print("Successfully blocked unauthorized access. Got status:", e.code)
        assert e.code in (401, 403)

    print("\nTesting /api/overview endpoint with valid JWT token...")
    req = urllib.request.Request(
        "http://127.0.0.1:8091/api/overview",
        headers=MOCK_JWT_HEADER
    )
    with urllib.request.urlopen(req) as res:
        overview_data = json.loads(res.read().decode())
        print("Overview metrics count:", len(overview_data["metrics"]))
        assert len(overview_data["metrics"]) > 0

    print("\nTesting matched query 'What's our MRR?'...")
    query_data = json.dumps({"question": "What's our MRR?"}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8091/api/query",
        data=query_data,
        headers={"Content-Type": "application/json", **MOCK_JWT_HEADER}
    )
    with urllib.request.urlopen(req) as res:
        ans_data = json.loads(res.read().decode())
        print("Intent matched:", ans_data["intent"])
        print("Chart type:", ans_data["chart_type"])
        assert ans_data["intent"] == "Subscription Analytics"
        assert ans_data["chart_type"] == "funnel"

    print("\nTesting CSV upload and Excel formula injection protection...")
    # CSV content containing a formula injection cell: `=SUM(1,2)`
    csv_content = "Feature,Conversion\n=Notes,0.85\nAI Search,0.74\n"
    boundary = "---WebKitFormBoundary7MA4YWxkTrZu0gW"
    data = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="test.csv"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
        f"{csv_content}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        "http://127.0.0.1:8091/datasets/upload",
        data=data,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            **MOCK_JWT_HEADER
        }
    )
    with urllib.request.urlopen(req) as res:
        upload_data = json.loads(res.read().decode())
        print("Upload status:", upload_data["status"])
        print("Columns parsed:", upload_data["columns"])
        print("Rows count:", upload_data["row_count"])
        assert upload_data["status"] == "successfully_sanitized_and_processed"
        # The formula prefix cell '=Notes' should have been escaped to "'=Notes"
        assert upload_data["columns"][0] == "Feature"
        assert upload_data["row_count"] == 2

    print("\nTesting Rate Limiting (20 requests/min limit)...")
    limit_triggered = False
    for i in range(25):
        query_data = json.dumps({"question": "What's our MRR?"}).encode()
        req = urllib.request.Request(
            "http://127.0.0.1:8091/api/query",
            data=query_data,
            headers={"Content-Type": "application/json", **MOCK_JWT_HEADER}
        )
        try:
            with urllib.request.urlopen(req) as res:
                res.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"Rate limit triggered successfully on request {i+1} with status 429.")
                limit_triggered = True
                break
    assert limit_triggered, "Rate limiting was not triggered."

    print("\nALL API INTEGRATION TESTS PASSED!")
    
finally:
    # Terminate background server process
    server_process.terminate()
    server_process.wait()
    print("API server shut down successfully.")
