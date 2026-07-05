from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

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

        return jsonify({
            "success": True,
            **result
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