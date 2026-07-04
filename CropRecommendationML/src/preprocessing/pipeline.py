# -*- coding: utf-8 -*-
"""
Crop Recommendation System - Preprocessing Pipeline
Handles:
- Missing value detection & imputation
- Duplicate removal
- Outlier mitigation (IQR clamping)
- Categorical One-Hot Encoding
- Numerical Scaling (StandardScaler)
- Pipeline serialization using Joblib
"""

import os
import joblib
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.base import BaseEstimator, TransformerMixin

import config
from src.utils.logger import get_logger

logger = get_logger("PreprocessingPipeline")


class OutlierClipper(BaseEstimator, TransformerMixin):
    """
    Custom Scikit-Learn transformer to clip numerical features to a specified IQR range
    to robustly mitigate outlier impacts without dropping valuable rows.
    """
    def __init__(self, factor: float = 1.5):
        self.factor = factor
        self.lower_bounds_ = {}
        self.upper_bounds_ = {}

    def fit(self, X, y=None):
        X_df = pd.DataFrame(X)
        for col in X_df.columns:
            q25 = X_df[col].quantile(0.25)
            q75 = X_df[col].quantile(0.75)
            iqr = q75 - q25
            self.lower_bounds_[col] = q25 - (self.factor * iqr)
            self.upper_bounds_[col] = q75 + (self.factor * iqr)
        return self

    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        for col in X_df.columns:
            if col in self.lower_bounds_:
                X_df[col] = np.clip(X_df[col], self.lower_bounds_[col], self.upper_bounds_[col])
        return X_df.values


def inspect_raw_data(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Inspect raw dataset for missing values, shape, duplicate records, and basic statistics.
    
    Args:
        df (pd.DataFrame): Input raw dataframe.
        
    Returns:
        Dict[str, Any]: Report metrics.
    """
    missing_count = df.isnull().sum().to_dict()
    duplicate_count = int(df.duplicated().sum())
    
    report = {
        "shape": df.shape,
        "duplicate_rows": duplicate_count,
        "missing_values": missing_count
    }
    
    logger.info(f"Dataset Shape: {df.shape}")
    logger.info(f"Duplicate records detected: {duplicate_count}")
    total_missing = sum(missing_count.values())
    logger.info(f"Total missing values: {total_missing}")
    
    return report


def build_preprocessing_pipeline(
    numerical_cols: List[str], 
    categorical_cols: List[str]
) -> ColumnTransformer:
    """
    Builds a robust, production-grade ColumnTransformer pipeline for numerical and categorical features.
    
    Numerical features: SimpleImputer (median) -> OutlierClipper -> StandardScaler
    Categorical features: SimpleImputer (most_frequent) -> OneHotEncoder
    """
    # Numerical Sub-pipeline
    num_pipeline = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("outlier_clipper", OutlierClipper(factor=1.5)),
        ("scaler", StandardScaler())
    ])
    
    # Categorical Sub-pipeline
    cat_pipeline = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    
    # Combined Pipeline
    preprocessor = ColumnTransformer(transformers=[
        ("num", num_pipeline, numerical_cols),
        ("cat", cat_pipeline, categorical_cols)
    ], remainder="drop")
    
    return preprocessor


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    logger.info("Engineering agricultural domain features...")
    
    # 1. N:P:K Ratio
    npk_sum = df["Nitrogen"] + df["Phosphorus"] + df["Potassium"] + 1e-5
    df["NPK_Ratio_N"] = df["Nitrogen"] / npk_sum
    df["NPK_Ratio_P"] = df["Phosphorus"] / npk_sum
    df["NPK_Ratio_K"] = df["Potassium"] / npk_sum
    
    # 2. Soil Fertility Index
    base_npk = (df["Nitrogen"] * 0.4 + df["Phosphorus"] * 0.3 + df["Potassium"] * 0.3)
    oc_factor = df["Organic_Carbon"] / 0.8
    ph_penalty = 1.0 - np.minimum(0.5, np.abs(df["Soil_pH"] - 6.5) / 3.0)
    df["Soil_Fertility_Index"] = base_npk * oc_factor * ph_penalty
    
    # 3. Rainfall Category (0: Low, 1: Medium, 2: High)
    df["Rainfall_Category_Code"] = np.where(df["Rainfall"] < 80.0, 0, np.where(df["Rainfall"] <= 150.0, 1, 2))
    
    # 4. Temperature Category (0: Cool, 1: Moderate, 2: Warm, 3: Hot)
    df["Temperature_Category_Code"] = np.where(df["Temperature"] < 18.0, 0,
                                      np.where(df["Temperature"] < 26.0, 1,
                                      np.where(df["Temperature"] < 32.0, 2, 3)))
    
    # 5. Seasonal Encoding
    season_map = {"Rabi": 0, "Kharif": 1, "Annual": 2}
    df["Season_Code"] = df["Season"].map(season_map).fillna(1).astype(int)
    
    # 6. Crop Suitability Score
    crop_profiles = {
        "Rice": { "N": 85, "P": 45, "K": 40, "pH": 6.2, "Temp": 26, "Rain": 180 },
        "Wheat": { "N": 65, "P": 55, "K": 35, "pH": 6.5, "Temp": 18, "Rain": 75 },
        "Cotton": { "N": 110, "P": 35, "K": 50, "pH": 7.2, "Temp": 32, "Rain": 90 },
        "Maize": { "N": 95, "P": 48, "K": 30, "pH": 6.3, "Temp": 24, "Rain": 110 },
        "Chickpea": { "N": 30, "P": 65, "K": 60, "pH": 7.0, "Temp": 16, "Rain": 45 },
        "Coffee": { "N": 100, "P": 25, "K": 120, "pH": 5.8, "Temp": 22, "Rain": 160 },
        "Groundnut": { "N": 40, "P": 40, "K": 45, "pH": 6.1, "Temp": 27, "Rain": 65 },
        "Sugarcane": { "N": 140, "P": 50, "K": 80, "pH": 6.8, "Temp": 29, "Rain": 220 }
    }
    
    suitability_scores = []
    for _, row in df.iterrows():
        crop = row["Crop"]
        prof = crop_profiles.get(crop, crop_profiles["Rice"])
        n_dist = abs(row["Nitrogen"] - prof["N"]) / 25
        p_dist = abs(row["Phosphorus"] - prof["P"]) / 15
        k_dist = abs(row["Potassium"] - prof["K"]) / 20
        ph_dist = abs(row["Soil_pH"] - prof["pH"]) / 1.0
        temp_dist = abs(row["Temperature"] - prof["Temp"]) / 5
        rain_dist = abs(row["Rainfall"] - prof["Rain"]) / 40
        total_dist = n_dist + p_dist + k_dist + ph_dist + temp_dist + rain_dist
        score = np.exp(-total_dist / 6.0)
        suitability_scores.append(float(score))
        
    df["Crop_Suitability_Score"] = suitability_scores
    return df


def preprocess_data(
    raw_data_path: str = config.RAW_DATA_PATH,
    output_dir: str = config.PROCESSED_DATA_DIR,
    test_size: float = config.TEST_SIZE,
    random_state: int = config.RANDOM_STATE
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str], ColumnTransformer]:
    """
    Executes the entire end-to-end preprocessing pipeline.
    Reads raw CSV, handles missing/duplicate values, fits scaling/encoding,
    saves the pipeline object and returns splits ready for training.
    """
    logger.info(f"Loading raw dataset from {raw_data_path}")
    if not os.path.exists(raw_data_path):
        raise FileNotFoundError(f"Raw data file not found at: {raw_data_path}")
        
    df = pd.read_csv(raw_data_path)
    
    # 1. Run raw inspection & duplicates removal
    inspect_raw_data(df)
    if df.duplicated().any():
        logger.info("Dropping duplicate rows from raw data...")
        df = df.drop_duplicates().reset_index(drop=True)
        
    # Apply feature engineering
    df = engineer_features(df)
        
    # Check that target column exists
    if config.TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{config.TARGET_COLUMN}' not found in dataset!")
        
    # 2. Separate Features and Target
    X = df[config.ALL_FEATURES]
    y = df[config.TARGET_COLUMN]
    
    # Save a copy of processed data in tabular format
    processed_df_path = os.path.join(output_dir, "crop_recommendation_processed.csv")
    df.to_csv(processed_df_path, index=False)
    logger.info(f"Saved processed tabular data to {processed_df_path}")
    
    # 3. Build & Fit Preprocessing Pipeline
    logger.info("Building ColumnTransformer preprocessing pipeline...")
    preprocessor = build_preprocessing_pipeline(
        numerical_cols=config.NUMERICAL_FEATURES,
        categorical_cols=config.CATEGORICAL_FEATURES
    )
    
    # Train-test split before scaling/encoding to prevent data leakage
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, 
        test_size=test_size, 
        random_state=random_state, 
        stratify=y
    )
    
    logger.info("Fitting and transforming train features...")
    X_train_transformed = preprocessor.fit_transform(X_train_raw)
    
    logger.info("Transforming test features...")
    X_test_transformed = preprocessor.transform(X_test_raw)
    
    # 4. Extract Transformed Feature Names (for feature importance and SHAP)
    # Get numeric names
    num_feature_names = config.NUMERICAL_FEATURES.copy()
    
    # Get categorical names from fitted one-hot encoder
    try:
        cat_encoder = preprocessor.named_transformers_["cat"].named_steps["encoder"]
        cat_feature_names = cat_encoder.get_feature_names_out(config.CATEGORICAL_FEATURES).tolist()
    except Exception as e:
        logger.warning(f"Could not automatically extract feature names from one-hot encoder: {e}")
        cat_feature_names = [f"cat_feature_{i}" for i in range(X_train_transformed.shape[1] - len(num_feature_names))]
        
    transformed_feature_names = num_feature_names + cat_feature_names
    
    # Ensure directory for models is present and save pipeline
    os.makedirs(os.path.dirname(config.PREPROCESSOR_PATH), exist_ok=True)
    joblib.dump(preprocessor, config.PREPROCESSOR_PATH)
    joblib.dump(transformed_feature_names, config.FEATURE_NAMES_PATH)
    logger.info(f"Saved Preprocessor Pipeline to {config.PREPROCESSOR_PATH}")
    logger.info(f"Saved Transformed Feature Names to {config.FEATURE_NAMES_PATH}")
    
    return (
        X_train_transformed, 
        X_test_transformed, 
        y_train.values, 
        y_test.values, 
        transformed_feature_names, 
        preprocessor
    )
