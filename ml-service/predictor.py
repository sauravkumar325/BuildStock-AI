"""Small, explainable forecasting model. No pre-trained or fabricated predictions."""
from datetime import date, timedelta
from math import ceil, isfinite
from statistics import mean, pstdev, linear_regression


def _forecast(values, horizon, method):
    if method == "linear_trend":
        slope, intercept = linear_regression(range(len(values)), values)
        # Limit extrapolation to twice the recent peak to avoid runaway trends.
        cap = max(values[-14:], default=0) * 2
        return [min(cap, max(0, intercept + slope * (len(values) + i))) for i in range(horizon)]
    return [mean(values[-7:])] * horizon


def predict(item, horizon=7):
    history = item["history"]
    values = [float(day["quantity"]) for day in history]
    base = {"key": item["key"], "historyDays": len(values), "horizon": horizon}
    if len(values) < 14:
        return {**base, "status": "insufficient_data", "message": "At least 14 complete calendar days are required.", "anomaly": False}
    method = "moving_average"
    validation_mae = None
    if len(values) >= 21:
        training, actual = values[:-7], values[-7:]
        scores = {m: mean(abs(a-p) for a, p in zip(actual, _forecast(training, 7, m))) for m in ("moving_average", "linear_trend")}
        method = min(scores, key=scores.get)
        validation_mae = round(scores[method], 3)
    daily = _forecast(values, horizon, method)
    demand = round(sum(daily), 3)
    baseline = values[-28:]
    average, spread = mean(baseline), pstdev(baseline)
    # Stable or zero-usage series still has a meaningful tolerance.
    threshold = average + max(3 * spread, average * 0.5, 1)
    return {**base, "status": "ready", "method": method, "predictedDemand": demand,
            "shortage": round(max(0, demand - item["currentStock"]), 3),
            "recommendedReorder": round(max(0, demand + item["safetyStock"] - item["currentStock"]), 3),
            "dailyForecast": [round(v, 3) for v in daily], "validationMAE": validation_mae,
            "anomaly": item["todayUsage"] > threshold, "anomalyThreshold": round(threshold, 3),
            "todayUsage": item["todayUsage"], "averageDailyUsage": round(average, 3)}


def validate(payload):
    if not isinstance(payload, dict):
        raise ValueError("Request must be an object")
    horizon = payload.get("horizon", 7)
    if isinstance(horizon, bool) or not isinstance(horizon, int) or not 1 <= horizon <= 30:
        raise ValueError("horizon must be an integer between 1 and 30")
    series = payload.get("series")
    if not isinstance(series, list) or len(series) > 2000:
        raise ValueError("series must contain up to 2000 items")
    def number(value):
        return not isinstance(value, bool) and isinstance(value, (float, int)) and isfinite(value) and 0 <= value < 1e14
    for item in series:
        if not isinstance(item, dict) or not isinstance(item.get("key"), str):
            raise ValueError("Each series requires a key")
        if not all(number(item.get(k)) for k in ("currentStock", "safetyStock", "todayUsage")):
            raise ValueError("Stock and usage must be finite non-negative numbers")
        history = item.get("history")
        if not isinstance(history, list) or len(history) > 90:
            raise ValueError("History must have at most 90 days")
        previous = None
        for day in history:
            if not isinstance(day, dict) or not number(day.get("quantity")):
                raise ValueError("Invalid daily usage")
            current = date.fromisoformat(day["date"])
            if previous and current != previous + timedelta(days=1):
                raise ValueError("History must contain consecutive days including zero-use days")
            previous = current
    return horizon, series
