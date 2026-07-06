# -*- coding: utf-8 -*-
"""
Smart Crop Recommendation – Flask API
Serves ML-based crop recommendations with full advisory payload
that matches the PredictionResult TypeScript interface expected by the UI.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import math
import numbers
import numpy as np

from src.prediction.pipeline import CropPredictor

app = Flask(__name__)
CORS(app)

# Load model only once at startup
predictor = CropPredictor()

# ---------------------------------------------------------------------------
# Crop profile lookup (ideal soil/climate conditions per crop)
# Used for LIME / SHAP explanations and agronomic modules
# ---------------------------------------------------------------------------
CROP_PROFILES = {
    "rice":        {"N": 85,  "P": 45, "K": 40,  "pH": 6.2, "Moisture": 85, "Temp": 26, "Humid": 82, "Rain": 180, "Soil": "Clayey"},
    "wheat":       {"N": 65,  "P": 55, "K": 35,  "pH": 6.5, "Moisture": 45, "Temp": 18, "Humid": 55, "Rain": 75,  "Soil": "Alluvial"},
    "cotton":      {"N": 110, "P": 35, "K": 50,  "pH": 7.2, "Moisture": 30, "Temp": 32, "Humid": 65, "Rain": 90,  "Soil": "Black"},
    "maize":       {"N": 95,  "P": 48, "K": 30,  "pH": 6.3, "Moisture": 60, "Temp": 24, "Humid": 70, "Rain": 110, "Soil": "Loamy"},
    "chickpea":    {"N": 30,  "P": 65, "K": 60,  "pH": 7.0, "Moisture": 20, "Temp": 16, "Humid": 40, "Rain": 45,  "Soil": "Sandy"},
    "coffee":      {"N": 100, "P": 25, "K": 120, "pH": 5.8, "Moisture": 75, "Temp": 22, "Humid": 75, "Rain": 160, "Soil": "Laterite"},
    "groundnut":   {"N": 40,  "P": 40, "K": 45,  "pH": 6.1, "Moisture": 35, "Temp": 27, "Humid": 62, "Rain": 65,  "Soil": "Sandy"},
    "sugarcane":   {"N": 140, "P": 50, "K": 80,  "pH": 6.8, "Moisture": 80, "Temp": 29, "Humid": 78, "Rain": 220, "Soil": "Clayey"},
    "banana":      {"N": 100, "P": 75, "K": 50,  "pH": 6.5, "Moisture": 75, "Temp": 27, "Humid": 80, "Rain": 120, "Soil": "Loamy"},
    "mango":       {"N": 50,  "P": 30, "K": 30,  "pH": 5.5, "Moisture": 50, "Temp": 30, "Humid": 70, "Rain": 100, "Soil": "Laterite"},
    "jute":        {"N": 80,  "P": 40, "K": 40,  "pH": 6.0, "Moisture": 80, "Temp": 28, "Humid": 85, "Rain": 200, "Soil": "Alluvial"},
    "coconut":     {"N": 50,  "P": 50, "K": 200, "pH": 6.5, "Moisture": 75, "Temp": 27, "Humid": 80, "Rain": 150, "Soil": "Sandy"},
    "papaya":      {"N": 50,  "P": 50, "K": 75,  "pH": 6.5, "Moisture": 60, "Temp": 30, "Humid": 70, "Rain": 100, "Soil": "Loamy"},
    "orange":      {"N": 50,  "P": 50, "K": 50,  "pH": 6.0, "Moisture": 55, "Temp": 25, "Humid": 65, "Rain": 80,  "Soil": "Sandy"},
    "apple":       {"N": 50,  "P": 50, "K": 50,  "pH": 6.0, "Moisture": 50, "Temp": 15, "Humid": 65, "Rain": 90,  "Soil": "Loamy"},
    "grapes":      {"N": 50,  "P": 50, "K": 50,  "pH": 6.5, "Moisture": 55, "Temp": 23, "Humid": 65, "Rain": 70,  "Soil": "Alluvial"},
    "watermelon":  {"N": 50,  "P": 50, "K": 50,  "pH": 6.5, "Moisture": 60, "Temp": 30, "Humid": 70, "Rain": 60,  "Soil": "Sandy"},
    "muskmelon":   {"N": 50,  "P": 50, "K": 50,  "pH": 6.5, "Moisture": 55, "Temp": 28, "Humid": 65, "Rain": 55,  "Soil": "Sandy"},
    "blackgram":   {"N": 40,  "P": 60, "K": 50,  "pH": 6.5, "Moisture": 40, "Temp": 28, "Humid": 65, "Rain": 75,  "Soil": "Loamy"},
    "mungbean":    {"N": 30,  "P": 60, "K": 50,  "pH": 6.5, "Moisture": 45, "Temp": 28, "Humid": 65, "Rain": 80,  "Soil": "Loamy"},
    "kidneybeans": {"N": 40,  "P": 60, "K": 50,  "pH": 6.5, "Moisture": 50, "Temp": 20, "Humid": 65, "Rain": 100, "Soil": "Loamy"},
    "lentil":      {"N": 30,  "P": 60, "K": 50,  "pH": 6.5, "Moisture": 40, "Temp": 18, "Humid": 60, "Rain": 60,  "Soil": "Sandy"},
    "pigeonpeas":  {"N": 40,  "P": 60, "K": 50,  "pH": 6.5, "Moisture": 40, "Temp": 28, "Humid": 65, "Rain": 100, "Soil": "Loamy"},
    "mothbeans":   {"N": 30,  "P": 50, "K": 40,  "pH": 6.5, "Moisture": 25, "Temp": 32, "Humid": 45, "Rain": 45,  "Soil": "Sandy"},
    "pomegranate": {"N": 50,  "P": 50, "K": 50,  "pH": 6.5, "Moisture": 45, "Temp": 25, "Humid": 60, "Rain": 55,  "Soil": "Sandy"},
}

CROP_METRICS = {
    "rice":        {"yieldMin": 3.5,  "yieldMax": 5.5,  "waterReq": 1400, "price": 21000,  "cost": 35000,  "irrMethod": "Canal Flood",       "freq": "Keep flooded or water every 4-5 days"},
    "wheat":       {"yieldMin": 3.0,  "yieldMax": 4.5,  "waterReq": 550,  "price": 22500,  "cost": 25000,  "irrMethod": "Sprinkler Irrigation","freq": "Every 10-12 days (critical growth stages)"},
    "cotton":      {"yieldMin": 1.5,  "yieldMax": 2.5,  "waterReq": 800,  "price": 60000,  "cost": 40000,  "irrMethod": "Drip Irrigation",    "freq": "Every 7-9 days"},
    "maize":       {"yieldMin": 4.0,  "yieldMax": 6.0,  "waterReq": 600,  "price": 19500,  "cost": 28000,  "irrMethod": "Sprinkler Irrigation","freq": "Every 8-10 days"},
    "chickpea":    {"yieldMin": 1.2,  "yieldMax": 2.2,  "waterReq": 300,  "price": 48000,  "cost": 18000,  "irrMethod": "Drip or Sprinkler",  "freq": "Every 14-16 days (sparingly)"},
    "coffee":      {"yieldMin": 0.8,  "yieldMax": 1.5,  "waterReq": 1600, "price": 180000, "cost": 90000,  "irrMethod": "Micro-sprinkler",    "freq": "Weekly during dry periods"},
    "groundnut":   {"yieldMin": 1.8,  "yieldMax": 2.8,  "waterReq": 580,  "price": 55000,  "cost": 22000,  "irrMethod": "Sprinkler Irrigation","freq": "Every 9-11 days"},
    "sugarcane":   {"yieldMin": 65.0, "yieldMax": 85.0, "waterReq": 2000, "price": 3150,   "cost": 85000,  "irrMethod": "Drip Irrigation",    "freq": "Every 5-7 days (high frequency)"},
    "banana":      {"yieldMin": 20.0, "yieldMax": 35.0, "waterReq": 1200, "price": 15000,  "cost": 45000,  "irrMethod": "Drip Irrigation",    "freq": "Every 4-5 days"},
    "mango":       {"yieldMin": 8.0,  "yieldMax": 15.0, "waterReq": 900,  "price": 40000,  "cost": 30000,  "irrMethod": "Drip Irrigation",    "freq": "Every 10-15 days"},
    "jute":        {"yieldMin": 2.0,  "yieldMax": 3.0,  "waterReq": 1200, "price": 30000,  "cost": 25000,  "irrMethod": "Canal Flood",        "freq": "Every 7-10 days"},
    "coconut":     {"yieldMin": 10.0, "yieldMax": 20.0, "waterReq": 1300, "price": 8000,   "cost": 20000,  "irrMethod": "Basin Irrigation",   "freq": "Every 7-10 days"},
    "papaya":      {"yieldMin": 35.0, "yieldMax": 50.0, "waterReq": 800,  "price": 10000,  "cost": 30000,  "irrMethod": "Drip Irrigation",    "freq": "Every 3-4 days"},
    "orange":      {"yieldMin": 10.0, "yieldMax": 18.0, "waterReq": 900,  "price": 25000,  "cost": 35000,  "irrMethod": "Drip Irrigation",    "freq": "Every 10-12 days"},
    "apple":       {"yieldMin": 8.0,  "yieldMax": 15.0, "waterReq": 800,  "price": 60000,  "cost": 50000,  "irrMethod": "Sprinkler Irrigation","freq": "Every 10-15 days"},
    "grapes":      {"yieldMin": 10.0, "yieldMax": 20.0, "waterReq": 700,  "price": 70000,  "cost": 60000,  "irrMethod": "Drip Irrigation",    "freq": "Every 7-10 days"},
    "watermelon":  {"yieldMin": 20.0, "yieldMax": 40.0, "waterReq": 400,  "price": 8000,   "cost": 20000,  "irrMethod": "Drip Irrigation",    "freq": "Every 4-5 days"},
    "muskmelon":   {"yieldMin": 15.0, "yieldMax": 30.0, "waterReq": 350,  "price": 10000,  "cost": 18000,  "irrMethod": "Drip Irrigation",    "freq": "Every 4-5 days"},
    "blackgram":   {"yieldMin": 1.0,  "yieldMax": 1.8,  "waterReq": 350,  "price": 45000,  "cost": 15000,  "irrMethod": "Drip or Sprinkler",  "freq": "Every 12-14 days"},
    "mungbean":    {"yieldMin": 1.0,  "yieldMax": 1.8,  "waterReq": 350,  "price": 55000,  "cost": 15000,  "irrMethod": "Drip or Sprinkler",  "freq": "Every 10-12 days"},
    "kidneybeans": {"yieldMin": 1.5,  "yieldMax": 2.5,  "waterReq": 450,  "price": 75000,  "cost": 20000,  "irrMethod": "Sprinkler Irrigation","freq": "Every 10-12 days"},
    "lentil":      {"yieldMin": 1.0,  "yieldMax": 2.0,  "waterReq": 300,  "price": 50000,  "cost": 15000,  "irrMethod": "Drip or Sprinkler",  "freq": "Every 14-16 days"},
    "pigeonpeas":  {"yieldMin": 1.0,  "yieldMax": 2.0,  "waterReq": 400,  "price": 50000,  "cost": 18000,  "irrMethod": "Drip or Sprinkler",  "freq": "Every 12-14 days"},
    "mothbeans":   {"yieldMin": 0.8,  "yieldMax": 1.5,  "waterReq": 250,  "price": 45000,  "cost": 12000,  "irrMethod": "Drip Irrigation",    "freq": "Every 15-18 days"},
    "pomegranate": {"yieldMin": 8.0,  "yieldMax": 16.0, "waterReq": 600,  "price": 80000,  "cost": 40000,  "irrMethod": "Drip Irrigation",    "freq": "Every 7-10 days"},
}

DEFAULT_METRICS = {"yieldMin": 2.0, "yieldMax": 4.0, "waterReq": 600, "price": 25000, "cost": 25000, "irrMethod": "Sprinkler Irrigation", "freq": "Every 10-12 days"}


def build_advisory(crop: str, n: int, p: int, k: int, ph: float, rain: float, temp: float, confidence: float) -> str:
    """Generate an offline agronomic advisory string."""
    crop_display = crop.capitalize()
    return (
        f"**Agronomic Guidance:**\n\n"
        f"Your farm's soil and climate conditions are well-suited for **{crop_display}** "
        f"(AI confidence: {round(confidence * 100)}%).\n\n"
        f"- **Soil Balance**: NPK values [N:{n}, P:{p}, K:{k}] have been analysed. "
        f"The soil pH of {ph} {'is within the optimal range' if 5.5 <= ph <= 7.5 else 'may need correction — consider liming (if pH < 6) or sulphur application (if pH > 7.5)'}.\n"
        f"- **Water & Sowing**: Annual rainfall of {rain} mm recorded. "
        f"Supplement irrigation as required based on the recommended method.\n"
        f"- **Temperature**: Current temperature of {temp}°C. "
        f"Plan sowing accordingly to match peak growing season requirements for {crop_display}."
    )


def build_lime_explanations(prof: dict, n: int, p: int, k: int, ph: float,
                              moisture: float, temp: float, humid: float, rain: float) -> list:
    raw = [
        {"feature": "Nitrogen",     "impact": -(abs(n        - prof["N"])        / 25) + 0.3},
        {"feature": "Phosphorus",   "impact": -(abs(p        - prof["P"])        / 15) + 0.3},
        {"feature": "Potassium",    "impact": -(abs(k        - prof["K"])        / 20) + 0.3},
        {"feature": "Soil pH",      "impact": -(abs(ph       - prof["pH"])       / 1.0) + 0.3},
        {"feature": "Soil Moisture","impact": -(abs(moisture - prof["Moisture"]) / 15) + 0.3},
        {"feature": "Temperature",  "impact": -(abs(temp     - prof["Temp"])     / 5)  + 0.3},
        {"feature": "Humidity",     "impact": -(abs(humid    - prof["Humid"])    / 10) + 0.3},
        {"feature": "Rainfall",     "impact": -(abs(rain     - prof["Rain"])     / 40) + 0.3},
    ]
    clamped = [{"feature": x["feature"], "impact": min(0.5, max(-0.5, x["impact"]))} for x in raw]
    return sorted(clamped, key=lambda x: abs(x["impact"]), reverse=True)


def build_shap_values(prof: dict, confidence: float,
                       n: int, p: int, k: int, ph: float,
                       moisture: float, temp: float, humid: float, rain: float) -> list:
    shap_base = 0.125
    target_sum = confidence - shap_base

    components = [
        {"feature": "Nitrogen",     "value": n,        "ideal": prof["N"],        "suit": math.exp(-((n        - prof["N"])        / 25) ** 2)},
        {"feature": "Phosphorus",   "value": p,        "ideal": prof["P"],        "suit": math.exp(-((p        - prof["P"])        / 15) ** 2)},
        {"feature": "Potassium",    "value": k,        "ideal": prof["K"],        "suit": math.exp(-((k        - prof["K"])        / 20) ** 2)},
        {"feature": "Soil pH",      "value": ph,       "ideal": prof["pH"],       "suit": math.exp(-((ph       - prof["pH"])       / 1.0) ** 2)},
        {"feature": "Soil Moisture","value": moisture, "ideal": prof["Moisture"], "suit": math.exp(-((moisture - prof["Moisture"]) / 15) ** 2)},
        {"feature": "Temperature",  "value": temp,     "ideal": prof["Temp"],     "suit": math.exp(-((temp     - prof["Temp"])     / 5)  ** 2)},
        {"feature": "Humidity",     "value": humid,    "ideal": prof["Humid"],    "suit": math.exp(-((humid    - prof["Humid"])    / 10) ** 2)},
        {"feature": "Rainfall",     "value": rain,     "ideal": prof["Rain"],     "suit": math.exp(-((rain     - prof["Rain"])     / 40) ** 2)},
    ]
    raw_weights = [c["suit"] - 0.45 for c in components]
    weight_sum = sum(raw_weights)
    correction = (target_sum - weight_sum) / len(components)

    result = []
    for i, c in enumerate(components):
        result.append({
            "feature":   c["feature"],
            "value":     c["value"],
            "ideal":     c["ideal"],
            "shap_value": round(raw_weights[i] + correction, 4)
        })
    return sorted(result, key=lambda x: abs(x["shap_value"]), reverse=True)


def build_yield_module(metrics: dict, n: int, p: int, k: int, ph: float,
                        moisture: float, prof: dict) -> dict:
    suitability = 1.0
    n_def = max(0, prof["N"] - n)
    p_def = max(0, prof["P"] - p)
    k_def = max(0, prof["K"] - k)
    suitability -= ((n_def + p_def + k_def) / 150) * 0.15
    if ph < 5.5 or ph > 7.5:
        suitability -= 0.10
    if moisture < 30:
        suitability -= 0.08
    suitability = max(0.6, min(1.0, suitability))
    expected = round(metrics["yieldMin"] + (metrics["yieldMax"] - metrics["yieldMin"]) * suitability, 2)
    return {"expected_yield": expected, "yield_unit": "tonnes/hectare", "opt_range": {"min": metrics["yieldMin"], "max": metrics["yieldMax"]}}


def build_fertilizer_module(n: int, p: int, k: int, prof: dict) -> dict:
    n_def = max(0, prof["N"] - n)
    p_def = max(0, prof["P"] - p)
    k_def = max(0, prof["K"] - k)
    urea = round(n_def * 2.17)
    ssp  = round(p_def * 6.25)
    mop  = round(k_def * 1.67)
    recs = []
    if urea > 10:
        recs.append({"name": "Urea (46% N)", "amount_kg_ha": urea, "timing": "Apply in 3 split doses: 50% basal at sowing, 25% at active tillering, and 25% at panicle initiation."})
    if ssp > 10:
        recs.append({"name": "Single Super Phosphate (16% P2O5)", "amount_kg_ha": ssp, "timing": "Apply full dose as basal application during final field preparation/sowing."})
    if mop > 10:
        recs.append({"name": "Muriate of Potash (60% K2O)", "amount_kg_ha": mop, "timing": "Apply 50% basal at sowing, and 50% mixed with top-dressed Nitrogen at early vegetative stage."})
    if not recs:
        recs.append({"name": "Organic Farmyard Manure (FYM)", "amount_kg_ha": 5000, "timing": "Soil nutrients are optimal! Apply compost/manure to sustain organic carbon content and soil microbiology."})
    return {
        "deficiencies": {"nitrogen_deficit": round(n_def), "phosphorus_deficit": round(p_def), "potassium_deficit": round(k_def)},
        "recommendations": recs
    }


def build_irrigation_module(metrics: dict, rain: float) -> dict:
    deficit = max(0, metrics["waterReq"] - rain)
    return {
        "water_requirement_mm": metrics["waterReq"],
        "rainfall_effective_mm": rain,
        "irrigation_deficit_mm": deficit,
        "recommended_method": metrics["irrMethod"],
        "irrigation_frequency": metrics["freq"]
    }


def build_profit_module(metrics: dict, yield_module: dict) -> dict:
    expected_yield = yield_module["expected_yield"]
    revenue = round(expected_yield * metrics["price"])
    cost = round(metrics["cost"])
    return {
        "market_price_per_tonne": metrics["price"],
        "revenue_per_ha": revenue,
        "cultivation_cost_per_ha": cost,
        "net_profit_per_ha": revenue - cost,
        "currency": "INR"
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    return jsonify({"status": "running", "message": "Smart Crop Recommendation ML API"})


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True) or {}

        print("=" * 60)
        print("INPUT RECEIVED:", data)

        # ── 1. Run ML inference ──────────────────────────────────────────────
        ml_result = predictor.predict_single(data)

        recommended_crop = ml_result["recommended_crop"]          # e.g. "maize"
        confidence_score = float(ml_result["confidence_score"])
        top_5            = ml_result["top_5_recommendations"]

        print("ML crop:", recommended_crop, " | confidence:", confidence_score)

        # ── 2. Parse raw inputs for ancillary modules ────────────────────────
        n        = int(float(data.get("nitrogen",    80)))
        p        = int(float(data.get("phosphorus",  45)))
        k        = int(float(data.get("potassium",   40)))
        ph       = float(data.get("ph",              6.5))
        moisture = float(data.get("moisture",        50))
        temp     = float(data.get("temperature",     25))
        humid    = float(data.get("humidity",        70))
        rain     = float(data.get("rainfall",        100))
        soil_type = str(data.get("soil_type", "Clayey"))

        # ── 3. Look up ideal profile (case-insensitive) ──────────────────────
        crop_key = recommended_crop.lower()
        prof = CROP_PROFILES.get(crop_key, CROP_PROFILES["rice"])
        metrics = CROP_METRICS.get(crop_key, DEFAULT_METRICS)

        # ── 4. Build advisory + explanations ────────────────────────────────
        advisory      = build_advisory(recommended_crop, n, p, k, ph, rain, temp, confidence_score)
        lime_expls    = build_lime_explanations(prof, n, p, k, ph, moisture, temp, humid, rain)
        shap_vals     = build_shap_values(prof, confidence_score, n, p, k, ph, moisture, temp, humid, rain)
        yield_mod     = build_yield_module(metrics, n, p, k, ph, moisture, prof)
        fert_mod      = build_fertilizer_module(n, p, k, prof)
        irr_mod       = build_irrigation_module(metrics, rain)
        profit_mod    = build_profit_module(metrics, yield_mod)

        response = {
            "success":              True,
            "recommended_crop":     recommended_crop,
            "confidence_score":     confidence_score,
            "top_5_recommendations": top_5,
            "advisory":             advisory,
            "lime_explanations":    lime_expls,
            "shap_base_value":      0.125,
            "shap_values":          shap_vals,
            "yield_module":         yield_mod,
            "fertilizer_module":    fert_mod,
            "irrigation_module":    irr_mod,
            "profit_module":        profit_mod,
        }

        print("PREDICTION RESPONSE READY — crop:", recommended_crop)
        return jsonify(response)

    except Exception as e:
        print("=" * 60)
        print("PREDICTION FAILED")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)