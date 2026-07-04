# -*- coding: utf-8 -*-
"""
Crop Recommendation System - Prediction Pipeline
Loads the preprocessor pipeline and trained model, and exposes a clean interface
for single-point or batch predictions.
"""

import os
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
    def __init__(
        self, 
        preprocessor_path: str = config.PREPROCESSOR_PATH,
        model_path: str = config.BEST_MODEL_PATH,
        feature_names_path: str = config.FEATURE_NAMES_PATH
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
        
        # Load final trained feature names (after preprocessor)
        if os.path.exists(feature_names_path):
            self.selected_features = joblib.load(feature_names_path)
            logger.info(f"Loaded feature names list ({len(self.selected_features)} features).")
        else:
            self.selected_features = None
            
        # Extract original classes
        if hasattr(self.model, "classes_"):
            self.classes_ = self.model.classes_.tolist()
            logger.info(f"Loaded target classes ({len(self.classes_)} crops).")
        else:
            self.classes_ = []

    def _validate_and_format_input(self, user_input: Dict[str, Any]) -> pd.DataFrame:
        """
        Ensures user input conforms to schema expectations and fills missing keys with NaNs.
        """
        # Ensure proper key spacing / capitalization
        cleaned_input = {}
        for key, val in user_input.items():
            # Clean underscores or capitalization
            norm_key = key.replace(" ", "_").capitalize()
            # Handle acronyms or special names
            if norm_key == "Soil_ph":
                norm_key = "Soil_pH"
            cleaned_input[norm_key] = val
            
        # Create single row DataFrame
        input_df = pd.DataFrame([cleaned_input])
        
        # Ensure all required features exist in the DataFrame in correct order
        for feature in config.ALL_FEATURES:
            if feature not in input_df.columns:
                logger.debug(f"Input feature missing: '{feature}'. Initializing with NaN.")
                input_df[feature] = np.nan
                
        # Fill in engineered features on the fly
        npk_sum = input_df["Nitrogen"].fillna(80.0) + input_df["Phosphorus"].fillna(45.0) + input_df["Potassium"].fillna(40.0) + 1e-5
        input_df["NPK_Ratio_N"] = input_df["Nitrogen"].fillna(80.0) / npk_sum
        input_df["NPK_Ratio_P"] = input_df["Phosphorus"].fillna(45.0) / npk_sum
        input_df["NPK_Ratio_K"] = input_df["Potassium"].fillna(40.0) / npk_sum
        
        base_npk = (input_df["Nitrogen"].fillna(80.0) * 0.4 + input_df["Phosphorus"].fillna(45.0) * 0.3 + input_df["Potassium"].fillna(40.0) * 0.3)
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
                
        # Reorder to match exactly
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
        
        # 2. Transform using pipeline preprocessor
        transformed_arr = self.preprocessor.transform(formatted_df)
        
        # 3. Model predict
        prediction = self.model.predict(transformed_arr)[0]
        
        # 4. Calculate Probabilities
        probabilities = {}
        top_5_recommendations = []
        confidence_score = 1.0
        
        if hasattr(self.model, "predict_proba"):
            probs_arr = self.model.predict_proba(transformed_arr)[0]
            
            # Map classes to their probabilities
            probabilities = {self.classes_[i]: float(probs_arr[i]) for i in range(len(self.classes_))}
            
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
            
        return {
            "recommended_crop": prediction,
            "confidence_score": float(confidence_score),
            "top_5_recommendations": top_5_recommendations,
            "all_probabilities": probabilities,
            "transformed_features": transformed_arr[0].tolist()
        }

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
