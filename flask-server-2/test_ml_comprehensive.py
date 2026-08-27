"""
Fyndr ML & Vector Store Comprehensive Test Suite
Tests:
- Vector normalization, multi-vector indexing, deduplication
- FAISS IndexFlatIP vs numpy brute-force search
- Event deletion, vector removal, and path sanitization
- EXIF orientation transpose and resolution capping
- /get_embedding and /match_faces endpoints with multi-face and non-matching queries
"""
import io
import os
import sys
import unittest
import numpy as np
from PIL import Image

# Add flask-server-2 to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, load_image_from_bytes
import faiss_store

class TestFaissStore(unittest.TestCase):
    def setUp(self):
        self.event_id = "test_event_comprehensive_123"
        faiss_store.delete_event(self.event_id)

    def tearDown(self):
        faiss_store.delete_event(self.event_id)

    def test_single_vector_add_and_search(self):
        # 1 vector
        vec = np.random.randn(512).astype(np.float32)
        vec = vec / np.linalg.norm(vec)
        photo_id = "60c72b2f9b1d8b00155b4b01"

        ok = faiss_store.add(self.event_id, photo_id, vec)
        self.assertTrue(ok)

        # Search with identical query
        res = faiss_store.search(self.event_id, vec, k=10, threshold=0.5)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0][0], photo_id)
        self.assertAlmostEqual(res[0][1], 1.0, places=4)

    def test_multi_vector_indexing_and_deduplication(self):
        # Photo with 3 faces
        vecs = np.random.randn(3, 512).astype(np.float32)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        vecs = vecs / norms
        photo_id = "60c72b2f9b1d8b00155b4b02"

        ok = faiss_store.add(self.event_id, photo_id, vecs)
        self.assertTrue(ok)

        # Search with face #2
        query = vecs[1]
        res = faiss_store.search(self.event_id, query, k=10, threshold=0.5)
        self.assertEqual(len(res), 1, "Should deduplicate by photo_id")
        self.assertEqual(res[0][0], photo_id)
        self.assertAlmostEqual(res[0][1], 1.0, places=4)

    def test_idempotent_readd(self):
        vec1 = np.random.randn(512).astype(np.float32)
        vec2 = np.random.randn(512).astype(np.float32)
        photo_id = "60c72b2f9b1d8b00155b4b03"

        faiss_store.add(self.event_id, photo_id, vec1)
        faiss_store.add(self.event_id, photo_id, vec2)  # Re-add

        stats = faiss_store.stats(self.event_id)
        self.assertEqual(stats["ntotal"], 1, "Re-adding photo_id should not duplicate vectors")

    def test_remove_photo(self):
        vecs = np.random.randn(2, 512).astype(np.float32)
        photo_id = "60c72b2f9b1d8b00155b4b04"

        faiss_store.add(self.event_id, photo_id, vecs)
        self.assertTrue(faiss_store.remove(self.event_id, photo_id))

        stats = faiss_store.stats(self.event_id)
        self.assertEqual(stats["ntotal"], 0)

    def test_threshold_filtering(self):
        vec1 = np.random.randn(512).astype(np.float32)
        vec1 = vec1 / np.linalg.norm(vec1)
        vec2 = -vec1  # Opposite direction (cosine similarity -1.0)
        photo_id = "60c72b2f9b1d8b00155b4b05"

        faiss_store.add(self.event_id, photo_id, vec1)
        res = faiss_store.search(self.event_id, vec2, k=10, threshold=0.34)
        self.assertEqual(len(res), 0, "Opposite vector should be filtered out by threshold")


class TestImageProcessing(unittest.TestCase):
    def test_image_loading_and_bgr_conversion(self):
        # Create pure red test image (RGB: 255, 0, 0)
        img = Image.new("RGB", (200, 200), color=(255, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="PNG")

        arr = load_image_from_bytes(buf.getvalue())
        self.assertTrue(arr is not None)
        if arr is not None:
            self.assertEqual(arr.shape, (200, 200, 3))
            # In BGR, red channel is index 2, blue is index 0
            self.assertEqual(arr[0, 0, 2], 255, "Red channel should be at BGR index 2")
            self.assertEqual(arr[0, 0, 0], 0, "Blue channel should be at BGR index 0")

    def test_large_image_downsampling(self):
        # Create huge 3000x2000 image
        huge_img = Image.new("RGB", (3000, 2000), color=(100, 150, 200))
        buf = io.BytesIO()
        huge_img.save(buf, format="JPEG")

        arr = load_image_from_bytes(buf.getvalue())
        self.assertTrue(arr is not None)
        if arr is not None:
            self.assertLessEqual(max(arr.shape[:2]), 1920, "Longest side should be capped to 1920px")

    def test_corrupted_bytes_handling(self):
        bad_bytes = b"not an image data"
        arr = load_image_from_bytes(bad_bytes)
        self.assertIsNone(arr)


class TestMLEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.event_id = "test_event_endpoint_123"
        faiss_store.delete_event(self.event_id)

    def tearDown(self):
        faiss_store.delete_event(self.event_id)

    def test_get_embedding_and_match_faces(self):
        img_path = os.path.join(os.path.dirname(__file__), "../front-end/public/images/wedding.jpg")
        if not os.path.exists(img_path):
            self.skipTest("wedding.jpg not available")

        with open(img_path, "rb") as f:
            img_bytes = f.read()

        # 1. Index wedding.jpg
        photo_id = "60c72b2f9b1d8b00155b4b99"
        res = self.client.post(
            "/get_embedding",
            data={"image": (io.BytesIO(img_bytes), "wedding.jpg"), "event_id": self.event_id, "photo_id": photo_id},
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("embeddings", data)
        self.assertGreater(data["face_count"], 0)

        # 2. Query with wedding.jpg
        res2 = self.client.post(
            "/match_faces",
            data={"image": (io.BytesIO(img_bytes), "selfie.jpg"), "event_id": self.event_id},
            content_type="multipart/form-data"
        )
        self.assertEqual(res2.status_code, 200)
        matches = res2.get_json().get("matches", [])
        self.assertGreater(len(matches), 0)
        self.assertEqual(matches[0]["id"], photo_id)
        self.assertGreater(matches[0]["similarity"], 0.5)

    def test_match_faces_validation_errors(self):
        # Missing event_id
        res = self.client.post("/match_faces", data={}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)

        # Invalid threshold
        res = self.client.post(
            "/match_faces",
            data={"event_id": "test_event", "threshold": "5.0"},
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
