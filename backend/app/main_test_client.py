# util para probar endpoints localmente
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    r = client.post('/parse', files={})
    assert r.status_code != 500
