from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

from src.prediction.pipeline import CropPredictor

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize predictor
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
        # Read JSON request
        data = request.get_json()

        if data is None:
            return jsonify({
                "success": False,
                "error": "No JSON body received."
            }), 400

        # Print request for debugging
        print("\n========== REQUEST RECEIVED ==========")
        print(data)

        # Run prediction
        result = predictor.predict_single(data)

        # Print result
        print("\n========== PREDICTION RESULT ==========")
        print(result)

        return jsonify(result)

    except Exception as e:
        print("\n========== ERROR ==========")
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)