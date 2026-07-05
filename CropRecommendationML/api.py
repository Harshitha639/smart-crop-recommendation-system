from flask import Flask, request, jsonify
from flask_cors import CORS

from src.prediction.pipeline import CropPredictor

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

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

        result = predictor.predict_single(data)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)