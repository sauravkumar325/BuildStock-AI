import os
import unittest
from app import app

class API(unittest.TestCase):
    def setUp(self):
        self.old_key = os.environ.get('ML_API_KEY')
        os.environ['ML_API_KEY'] = 'test-only-shared-key'
        self.client = app.test_client()
    def tearDown(self):
        if self.old_key is None:
            os.environ.pop('ML_API_KEY', None)
        else:
            os.environ['ML_API_KEY'] = self.old_key
    def test_requires_key(self):
        self.assertEqual(self.client.post('/predict', json={'series':[]}).status_code,401)
    def test_valid_empty_request(self):
        result=self.client.post('/predict',headers={'X-API-Key':'test-only-shared-key'},json={'series':[]})
        self.assertEqual(result.status_code,200)
        self.assertEqual(result.json,{'predictions':[]})
    def test_invalid_input(self):
        result=self.client.post('/predict',headers={'X-API-Key':'test-only-shared-key'},json={'series':[], 'horizon':0})
        self.assertEqual(result.status_code,400)
