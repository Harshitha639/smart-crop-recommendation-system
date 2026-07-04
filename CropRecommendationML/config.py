# -*- coding: utf-8 -*-
"""
Crop Recommendation System Configuration
Defines paths, feature definitions, model hyperparameters, and global configurations.
"""

import os

# ==============================================================================
# 1. PATH CONFIGURATIONS
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DATA_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DATA_DIR = os.path.join(DATA_DIR, "processed")
EXTERNAL_DATA_DIR = os.path.join(DATA_DIR, "external")

MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
IMAGES_DIR = os.path.join(REPORTS_DIR, "images")

# Ensure directories exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, EXTERNAL_DATA_DIR, MODELS_DIR, REPORTS_DIR, IMAGES_DIR]:
    os.makedirs(directory, exist_ok=True)

# File Paths
RAW_DATA_PATH = os.path.join(RAW_DATA_DIR, "crop_recommendation_raw.csv")
PROCESSED_DATA_PATH = os.path.join(PROCESSED_DATA_DIR, "crop_recommendation_processed.csv")
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, "preprocessor_pipeline.joblib")
BEST_MODEL_PATH = os.path.join(MODELS_DIR, "best_crop_recommendation_model.joblib")
FEATURE_NAMES_PATH = os.path.join(MODELS_DIR, "feature_names.joblib")

# ==============================================================================
# 2. FEATURE GROUPS
# ==============================================================================
SOIL_FEATURES = [
    "Nitrogen", "Phosphorus", "Potassium", "Soil_pH",
    "Soil_Moisture", "Soil_Type", "Organic_Carbon", "Electrical_Conductivity"
]

WEATHER_FEATURES = [
    "Temperature", "Humidity", "Rainfall", "Wind_Speed",
    "Solar_Radiation", "Sunshine_Hours"
]

LOCATION_FEATURES = [
    "State", "District", "Latitude", "Longitude", "Altitude", "Agro_Climatic_Zone"
]

WATER_FEATURES = [
    "Irrigation_Type", "Water_Availability", "Groundwater_Level"
]

SEASONAL_FEATURES = [
    "Season", "Month"
]

# Total list of initial input features
ENGINEERED_NUMERICAL_FEATURES = [
    "NPK_Ratio_N", "NPK_Ratio_P", "NPK_Ratio_K",
    "Soil_Fertility_Index", "Rainfall_Category_Code", "Temperature_Category_Code",
    "Season_Code", "Crop_Suitability_Score"
]

ALL_FEATURES = (
    SOIL_FEATURES + WEATHER_FEATURES + LOCATION_FEATURES +
    WATER_FEATURES + SEASONAL_FEATURES + ENGINEERED_NUMERICAL_FEATURES
)

TARGET_COLUMN = "Crop"

# Feature types for pipeline
NUMERICAL_FEATURES = [
    "Nitrogen", "Phosphorus", "Potassium", "Soil_pH", "Soil_Moisture",
    "Organic_Carbon", "Electrical_Conductivity", "Temperature", "Humidity",
    "Rainfall", "Wind_Speed", "Solar_Radiation", "Sunshine_Hours",
    "Latitude", "Longitude", "Altitude", "Groundwater_Level"
] + ENGINEERED_NUMERICAL_FEATURES

CATEGORICAL_FEATURES = [
    "Soil_Type", "State", "District", "Agro_Climatic_Zone",
    "Irrigation_Type", "Water_Availability", "Season", "Month"
]

# ==============================================================================
# 3. HYPERPARAMETERS AND PIPELINE SETTINGS
# ==============================================================================
RANDOM_STATE = 42
TEST_SIZE = 0.2
CV_FOLDS = 5

# Hyperparameter Tuning Grids for top algorithms
RF_PARAM_GRID = {
    "n_estimators": [50, 100, 200],
    "max_depth": [None, 10, 20, 30],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf": [1, 2, 4],
    "criterion": ["gini", "entropy"]
}

XGB_PARAM_GRID = {
    "n_estimators": [50, 100, 200],
    "learning_rate": [0.01, 0.05, 0.1, 0.2],
    "max_depth": [3, 5, 7, 9],
    "subsample": [0.8, 1.0],
    "colsample_bytree": [0.8, 1.0]
}

LGBM_PARAM_GRID = {
    "n_estimators": [50, 100, 200],
    "learning_rate": [0.01, 0.05, 0.1, 0.2],
    "max_depth": [3, 5, 7, 10],
    "num_leaves": [15, 31, 63]
}

CATBOOST_PARAM_GRID = {
    "iterations": [50, 100, 150],
    "learning_rate": [0.01, 0.05, 0.1],
    "depth": [4, 6, 8]
}

SVM_PARAM_GRID = {
    "C": [0.1, 1, 10],
    "kernel": ["rbf", "linear"]
}
