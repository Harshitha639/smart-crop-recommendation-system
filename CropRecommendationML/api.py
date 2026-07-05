from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import numbers
import numpy as np

from src.prediction.pipeline import CropPredictor

app = Flask(__name__)
CORS(app)

# Load model only once
predictor = CropPredictor()


@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "message": "Smart Crop Recommendation API"
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        print("=" * 60)
        print("INPUT RECEIVED:")
        print(data)

        result = predictor.predict_single(data)

        print("=" * 60)
        print("PREDICTION SUCCESS:")
        print(result)

        def to_native(value):
            if isinstance(value, dict):
                return {to_native(k): to_native(v) for k, v in value.items()}
            if isinstance(value, (list, tuple)):
                return [to_native(item) for item in value]
            if isinstance(value, np.ndarray):
                return [to_native(item) for item in value.tolist()]
            if isinstance(value, np.generic):
                return value.item()
            if isinstance(value, numbers.Number) and not isinstance(value, bool):
                return value.item() if hasattr(value, "item") else value
            return value

        return jsonify({
            "success": True,
            **to_native(result)
        })

    except Exception as e:
        print("=" * 60)
        print("PREDICTION FAILED")
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)