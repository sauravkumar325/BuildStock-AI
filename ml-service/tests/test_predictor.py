import unittest
from datetime import date, timedelta
from predictor import predict, validate

def series(values):
    start = date(2026, 1, 1)
    return {"key":"1:1","currentStock":250,"safetyStock":50,"todayUsage":180,
            "history":[{"date":str(start+timedelta(days=i)),"quantity":v} for i,v in enumerate(values)]}

class Predictions(unittest.TestCase):
    def test_cold_start(self):
        self.assertEqual(predict(series([50]*13))["status"], "insufficient_data")
    def test_constant_usage(self):
        p=predict(series([50]*28))
        self.assertEqual(p["predictedDemand"],350)
        self.assertEqual(p["shortage"],100)
        self.assertEqual(p["recommendedReorder"],150)
        self.assertTrue(p["anomaly"])
    def test_no_negative_reorder(self):
        s=series([0]*28);s["currentStock"]=1000;s["todayUsage"]=0
        p=predict(s);self.assertEqual(p["recommendedReorder"],0);self.assertFalse(p["anomaly"])
    def test_learns_trend(self):
        p=predict(series(list(range(1,36))))
        self.assertEqual(p["method"],"linear_trend")
        self.assertEqual(p["predictedDemand"],273)
    def test_rejects_nan(self):
        s=series([50]*28);s["currentStock"]=float("nan")
        with self.assertRaises(ValueError):validate({"series":[s]})
    def test_requires_contiguous_days(self):
        s=series([50]*28);s["history"].pop(10)
        with self.assertRaises(ValueError):validate({"series":[s]})

if __name__ == "__main__":unittest.main()
