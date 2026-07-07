import time
import subprocess
import sys
import urllib.request
import json

# Start FastAPI server in the background on port 8091
server_process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8091"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait a moment for server to spin up
time.sleep(3)

try:
    print("Testing /health endpoint...")
    req = urllib.request.Request("http://127.0.0.1:8091/health")
    with urllib.request.urlopen(req) as res:
        health_data = json.loads(res.read().decode())
        print("Health status:", health_data)
        assert health_data["status"] == "ok"
        
    print("\nTesting matched query 'Show revenue trend'...")
    query_data = json.dumps({"question": "Show revenue trend"}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8091/api/query",
        data=query_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        ans_data = json.loads(res.read().decode())
        print("Intent matched:", ans_data["intent"])
        print("Chart type:", ans_data["chart_type"])
        assert ans_data["intent"] == "Revenue Analytics"
        assert ans_data["chart_type"] == "line"

    print("\nTesting low confidence query 'hello'...")
    query_data = json.dumps({"question": "hello"}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8091/api/query",
        data=query_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        ans_data = json.loads(res.read().decode())
        print("Intent matched:", ans_data["intent"])
        print("Clarification answer:", ans_data["answer"])
        print("Follow-up chips count:", len(ans_data["follow_ups"]))
        assert ans_data["intent"] == "Clarification Required"
        assert "hello" not in ans_data["follow_ups"]

    print("\nTesting ambiguous query 'mrr and retention'...")
    query_data = json.dumps({"question": "mrr and retention"}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8091/api/query",
        data=query_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        ans_data = json.loads(res.read().decode())
        print("Intent matched:", ans_data["intent"])
        print("Clarification answer:", ans_data["answer"])
        assert ans_data["intent"] == "Clarification Required"

    print("\nALL API INTEGRATION TESTS PASSED!")
    
finally:
    # Terminate background server process
    server_process.terminate()
    server_process.wait()
    print("API server shut down successfully.")
