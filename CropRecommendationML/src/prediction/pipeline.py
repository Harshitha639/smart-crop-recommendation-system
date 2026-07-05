# -*- coding: utf-8 -*-
"""
Crop Recommendation System - Prediction Pipeline
Loads the preprocessor pipeline and trained model, and exposes a clean interface
for single-point or batch predictions.
"""

import os
import numbers
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Union

import config
from src.utils.logger import get_logger

logger = get_logger("PredictionPipeline")


class CropPredictor:
    """
    Production-grade crop predictor. Loads pipeline elements and processes
    raw tabular inputs to output recommendations with confidence rankings.
    """

    @staticmethod
    def _to_native(value: Any) -> Any:
        """Recursively convert NumPy/scalar values to plain Python types for JSON compatibility."""
        if isinstance(value, dict):
            return {CropPredictor._to_native(k): CropPredictor._to_native(v) for k, v in value.items()}
        if isinstance(value, (list, tuple)):
            return [CropPredictor._to_native(item) for item in value]
        if isinstance(value, np.ndarray):
            return [CropPredictor._to_native(item) for item in value.tolist()]
        if isinstance(value, np.generic):
            return value.item()
        if isinstance(value, numbers.Number) and not isinstance(value, bool):
            return value.item() if hasattr(value, "item") else value
        return value

    def __init__(
        self, 
        preprocessor_path: str = config.PREPROCESSOR_PATH,
        model_path: str = config.BEST_MODEL_PATH,
        feature_names_path: str = config.FEATURE_NAMES_PATH,
        feature_selector_path: str = config.FEATURE_SELECTOR_PATH,
        label_encoder_path: str = config.LABEL_ENCODER_PATH,
    ):
        logger.info("Initializing CropPredictor pipeline...")
        
        # Load Preprocessing ColumnTransformer
        if not os.path.exists(preprocessor_path):
            raise FileNotFoundError(f"Preprocessor not found at: {preprocessor_path}. Did you train the model first?")
        self.preprocessor = joblib.load(preprocessor_path)
        logger.info("Loaded preprocessor pipeline.")
        
        # Load Best Model
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at: {model_path}. Did you train the model first?")
        self.model = joblib.load(model_path)
        logger.info("Loaded trained classification model.")
        
        self.feature_selector = None
        self.selected_features = None
        self.selected_indices = None

        if os.path.exists(feature_selector_path):
            self.feature_selector = joblib.load(feature_selector_path)
            self.selected_features = getattr(self.feature_selector, "selected_feature_names_", None)
            self.selected_indices = getattr(self.feature_selector, "selected_indices_", None)
            logger.info("Loaded fitted feature selector.")
        else:
            if os.path.exists(feature_names_path):
                self.selected_features = joblib.load(feature_names_path)
                logger.info(f"Loaded feature names list ({len(self.selected_features)} features).")

            indices_path = config.SELECTED_FEATURE_INDICES_PATH
            if not os.path.exists(indices_path):
                raise FileNotFoundError("selected_feature_indices.joblib not found")

            self.selected_indices = joblib.load(indices_path)

        self.label_encoder = None
        if os.path.exists(label_encoder_path):
            self.label_encoder = joblib.load(label_encoder_path)
            logger.info("Loaded label encoder.")

        # Extract original classes
        if self.label_encoder is not None:
            self.classes_ = self.label_encoder.classes_.tolist()
            logger.info(f"Loaded target classes ({len(self.classes_)} crops).")
        elif hasattr(self.model, "classes_"):
            self.classes_ = self.model.classes_.tolist()
            logger.info(f"Loaded target classes ({len(self.classes_)} crops).")
        else:
            self.classes_ = []

    def _validate_and_format_input(self, user_input: Dict[str, Any]) -> pd.DataFrame:
        """
        Ensures user input conforms to schema expectations and fills missing keys with NaNs.
        """
        cleaned_input = {}

        key_map = {
            "nitrogen": "Nitrogen",
            "phosphorus": "Phosphorus",
            "potassium": "Potassium",
            "ph": "Soil_pH",
            "soil_ph": "Soil_pH",
            "soil_ph": "Soil_pH",
            "moisture": "Soil_Moisture",
            "soil_moisture": "Soil_Moisture",
            "soil_type": "Soil_Type",
            "temperature": "Temperature",
            "humidity": "Humidity",
            "rainfall": "Rainfall",
            "organic_carbon": "Organic_Carbon",
            "electrical_conductivity": "Electrical_Conductivity",
            "wind_speed": "Wind_Speed",
            "solar_radiation": "Solar_Radiation",
            "sunshine_hours": "Sunshine_Hours",
            "state": "State",
            "district": "District",
            "latitude": "Latitude",
            "longitude": "Longitude",
            "altitude": "Altitude",
            "agro_climatic_zone": "Agro_Climatic_Zone",
            "irrigation_type": "Irrigation_Type",
            "water_availability": "Water_Availability",
            "groundwater_level": "Groundwater_Level",
            "season": "Season",
            "month": "Month",
        }

        for key, value in user_input.items():
            mapped = key_map.get(key.lower(), key)
            cleaned_input[mapped] = value

        input_df = pd.DataFrame([cleaned_input])

        for feature in config.ALL_FEATURES:
            if feature not in input_df.columns:
                logger.debug(f"Input feature missing: '{feature}'. Initializing with NaN.")
                input_df[feature] = np.nan

        npk_sum = (
            input_df["Nitrogen"].fillna(80.0)
            + input_df["Phosphorus"].fillna(45.0)
            + input_df["Potassium"].fillna(40.0)
            + 1e-5
        )
        input_df["NPK_Ratio_N"] = input_df["Nitrogen"].fillna(80.0) / npk_sum
        input_df["NPK_Ratio_P"] = input_df["Phosphorus"].fillna(45.0) / npk_sum
        input_df["NPK_Ratio_K"] = input_df["Potassium"].fillna(40.0) / npk_sum

        base_npk = (
            input_df["Nitrogen"].fillna(80.0) * 0.4
            + input_df["Phosphorus"].fillna(45.0) * 0.3
            + input_df["Potassium"].fillna(40.0) * 0.3
        )
        oc_factor = input_df["Organic_Carbon"].fillna(0.75) / 0.8
        ph_penalty = 1.0 - np.minimum(0.5, np.abs(input_df["Soil_pH"].fillna(6.5) - 6.5) / 3.0)
        input_df["Soil_Fertility_Index"] = base_npk * oc_factor * ph_penalty

        rain_val = input_df["Rainfall"].fillna(100.0).iloc[0]
        input_df["Rainfall_Category_Code"] = 0 if rain_val < 80.0 else (1 if rain_val <= 150.0 else 2)

        temp_val = input_df["Temperature"].fillna(25.0).iloc[0]
        input_df["Temperature_Category_Code"] = 0 if temp_val < 18.0 else (1 if temp_val < 26.0 else (2 if temp_val < 32.0 else 3))

        season_val = input_df["Season"].fillna("Kharif").iloc[0]
        season_map = {"Rabi": 0, "Kharif": 1, "Annual": 2}
        input_df["Season_Code"] = season_map.get(season_val, 1)

        input_df["Crop_Suitability_Score"] = 0.85

        return input_df[config.ALL_FEATURES]

    def predict_single(self, raw_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes crop recommendation for a single user query.
        
        Args:
            raw_input (Dict[str, Any]): Dictionary of input soil/environmental parameters.
            
        Returns:
            Dict[str, Any]: Recommendation results including confidence and probabilities.
        """
        # 1. Format input
        formatted_df = self._validate_and_format_input(raw_input)
        
        # 2. Transform using pipeline preprocessor and the fitted feature selector
        transformed_arr = self.preprocessor.transform(formatted_df)

        if self.feature_selector is not None:
            transformed_arr = self.feature_selector.transform(transformed_arr)
        else:
            transformed_arr = transformed_arr[:, self.selected_indices]

        if getattr(self.model, "n_features_in_", None) is not None and transformed_arr.shape[1] != self.model.n_features_in_:
            raise ValueError(
                f"Feature mismatch: transformed input has {transformed_arr.shape[1]} features, "
                f"but model expects {self.model.n_features_in_}."
            )

        encoded_prediction = self.model.predict(transformed_arr)[0]
        if self.label_encoder is not None:
            prediction = self.label_encoder.inverse_transform([encoded_prediction])[0]
        else:
            prediction = encoded_prediction
        
        # 4. Calculate Probabilities
        probabilities = {}
        top_5_recommendations = []
        confidence_score = 1.0
        
        if hasattr(self.model, "predict_proba"):
            probs_arr = self.model.predict_proba(transformed_arr)[0]
            
            # Map encoded model classes to human-readable labels when available
            class_labels = self.label_encoder.classes_.tolist() if self.label_encoder is not None else self.classes_
            probabilities = {class_labels[i]: float(probs_arr[i]) for i in range(len(class_labels))}
            
            # Sort to get top 5
            sorted_probs = sorted(probabilities.items(), key=lambda item: item[1], reverse=True)
            top_5_recommendations = [
                {"crop": crop, "probability": prob} for crop, prob in sorted_probs[:5]
            ]
            
            # Extract target confidence score
            confidence_score = probabilities.get(prediction, 1.0)
            
        else:
            # Fallback if probability estimates not supported
            probabilities = {prediction: 1.0}
            top_5_recommendations = [{"crop": prediction, "probability": 1.0}]
            
        result = {
            "recommended_crop": prediction,
            "confidence_score": float(confidence_score),
            "top_5_recommendations": top_5_recommendations,
            "all_probabilities": probabilities,
            "transformed_features": transformed_arr[0].tolist()
        }
        return self._to_native(result)

    def predict_batch(self, raw_inputs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Processes batch of user inputs for crop recommendations.
        """
        logger.info(f"Processing batch predictions for {len(raw_inputs)} items...")
        results = []
        for i, item in enumerate(raw_inputs):
            try:
                results.append(self.predict_single(item))
            except Exception as e:
                logger.error(f"Failed to predict item at index {i} due to: {e}")
                results.append({"error": str(e)})
        return results
