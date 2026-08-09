import unittest
from fastapi.testclient import TestClient

from server import app

client = TestClient(app)


class ServerApiTests(unittest.TestCase):
    def test_health_check_returns_200(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")

    def test_extract_endpoint_validates_empty_url(self):
        response = client.post("/api/extract", json={"url": "   "})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)

    def test_download_endpoint_validates_urls(self):
        response = client.post("/api/download", json={"urls": ""})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)


if __name__ == "__main__":
    unittest.main()
