import hmac
import os
from flask import Flask, request, jsonify
from predictor import predict, validate
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def forecast():
    key = os.environ.get("ML_API_KEY", "")
    if not key or not hmac.compare_digest(request.headers.get("X-API-Key", ""), key):
        return jsonify(error="Unauthorized"), 401
    try:
        horizon, series = validate(request.get_json())
        return jsonify(predictions=[predict(item, horizon) for item in series])
    except (ValueError, TypeError, KeyError):
        return jsonify(error="Invalid prediction request"), 400

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "8000")))
