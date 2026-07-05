# -*- coding: utf-8 -*-
"""
Crop Recommendation System - Feature Engineering & Selection
Handles:
- Mutual Information scoring & ranking for multi-class classification
- Correlation-based collinearity analysis and redundant feature removal
- Feature selection execution and reporting
"""

import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Tuple, Dict
from sklearn.feature_selection import mutual_info_classif

import config
from src.utils.logger import get_logger

logger = get_logger("FeatureSelection")


def compute_mutual_information(
    X: np.ndarray, 
    y: np.ndarray, 
    feature_names: List[str]
) -> pd.DataFrame:
    """
    Computes Mutual Information (MI) classification score for each transformed feature.
    
    Args:
        X (np.ndarray): Transformed features.
        y (np.ndarray): Target classes (encoded or original labels).
        feature_names (List[str]): Matching feature names.
        
    Returns:
        pd.DataFrame: Ranked features with their corresponding MI scores.
    """
    logger.info("Computing Mutual Information scores...")
    
    # Check dimensions
    if X.shape[1] != len(feature_names):
        raise ValueError(f"Feature name count ({len(feature_names)}) does not match matrix column count ({X.shape[1]})!")
        
    # Standardize target to factorize/ints if string
    if isinstance(y[0], str):
        y_encoded = pd.factorize(y)[0]
    else:
        y_encoded = y
        
    mi_scores = mutual_info_classif(X, y_encoded, random_state=config.RANDOM_STATE)
    
    mi_df = pd.DataFrame({
        "Feature": feature_names,
        "MI_Score": mi_scores
    }).sort_values(by="MI_Score", ascending=False).reset_index(drop=True)
    
    logger.info(f"Top 5 features by Mutual Information:\n{mi_df.head().to_string(index=False)}")
    
    # Save a report visualization
    plt.figure(figsize=(10, 6))
    sns.barplot(data=mi_df.head(15), x="MI_Score", y="Feature", palette="viridis")
    plt.title("Top 15 Transformed Features by Mutual Information Score")
    plt.tight_layout()
    
    os.makedirs(config.IMAGES_DIR, exist_ok=True)
    plot_path = os.path.join(config.IMAGES_DIR, "mutual_information_ranking.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    logger.info(f"Saved Mutual Information plot to {plot_path}")
    
    return mi_df


def identify_collinear_features(
    X: np.ndarray, 
    feature_names: List[str], 
    threshold: float = 0.90
) -> Tuple[List[str], pd.DataFrame]:
    """
    Computes Pearson Correlation matrix and identifies features with collinearity above threshold.
    
    Args:
        X (np.ndarray): Transformed features.
        feature_names (List[str]): Matching names.
        threshold (float): Pearson correlation threshold.
        
    Returns:
        Tuple[List[str], pd.DataFrame]: 
            - List of feature names to drop.
            - Full correlation DataFrame.
    """
    logger.info(f"Analyzing collinear features with threshold correlation > {threshold}")
    
    df_temp = pd.DataFrame(X, columns=feature_names)
    corr_matrix = df_temp.corr().abs()
    
    # Select upper triangle of correlation matrix
    upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
    
    # Find features with correlation greater than threshold
    to_drop = [column for column in upper.columns if any(upper[column] > threshold)]
    
    logger.info(f"Collinear features identified to drop (correlation > {threshold}): {to_drop}")
    
    # Save Heatmap of correlation
    plt.figure(figsize=(12, 10))
    # Clip size of shown correlation matrix if extremely wide to keep readable
    if len(feature_names) > 25:
        # Show top 25 features based on highest overall correlations
        top_correlated = corr_matrix.mean().sort_values(ascending=False).index[:25]
        sub_corr = corr_matrix.loc[top_correlated, top_correlated]
        sns.heatmap(sub_corr, annot=True, fmt=".2f", cmap="coolwarm", cbar=True, square=True)
        plt.title("Correlation Matrix Heatmap (Top 25 Most Correlated Features)")
    else:
        sns.heatmap(corr_matrix, annot=True, fmt=".2f", cmap="coolwarm", cbar=True, square=True)
        plt.title("Correlation Matrix Heatmap of All Transformed Features")
        
    plt.tight_layout()
    plot_path = os.path.join(config.IMAGES_DIR, "correlation_heatmap.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    logger.info(f"Saved Correlation Heatmap plot to {plot_path}")
    
    return to_drop, corr_matrix


def run_feature_selection(
    X_train: np.ndarray, 
    X_test: np.ndarray, 
    y_train: np.ndarray, 
    feature_names: List[str],
    collinearity_threshold: float = 0.90,
    top_n_mi: int = None
) -> Tuple[np.ndarray, np.ndarray, List[str],List[int]]:
    """
    Combines collinearity dropping and Mutual Information selection into a final set.
    """
    logger.info("Running integrated feature selection...")
    
    # 1. Drop highly collinear variables
    collinear_drops, _ = identify_collinear_features(X_train, feature_names, threshold=collinearity_threshold)
    
    # Get index positions of non-collinear features
    keep_indices = [i for i, name in enumerate(feature_names) if name not in collinear_drops]
    
    X_train_filtered = X_train[:, keep_indices]
    X_test_filtered = X_test[:, keep_indices]
    filtered_names = [feature_names[i] for i in keep_indices]
    
    logger.info(f"Removed {len(collinear_drops)} collinear columns. Remaining: {X_train_filtered.shape[1]}")
    
    # 2. Compute MI rankings on filtered features
    mi_rankings = compute_mutual_information(X_train_filtered, y_train, filtered_names)
    
    # 3. Drop features with extremely low Mutual Information (or select top_n_mi)
    if top_n_mi and top_n_mi < len(filtered_names):
        logger.info(f"Selecting top {top_n_mi} features by Mutual Information score...")
        selected_names = mi_rankings.head(top_n_mi)["Feature"].tolist()
        
        # Re-index arrays to top-N
        final_indices = [filtered_names.index(name) for name in selected_names]
        X_train_final = X_train_filtered[:, final_indices]
        X_test_final = X_test_filtered[:, final_indices]
        
        logger.info(f"Feature selection complete. Reduced features from {len(feature_names)} to {top_n_mi}.")
        selected_original_indices = [keep_indices[i] for i in final_indices]

        return (
            X_train_final,
            X_test_final,
            selected_names,
            selected_original_indices
        )
    # If no top_n_mi, just drop features with MI_Score == 0.0
    active_features_df = mi_rankings[mi_rankings["MI_Score"] > 0.001]
    selected_names = active_features_df["Feature"].tolist()
    
    final_indices = [filtered_names.index(name) for name in selected_names]
    X_train_final = X_train_filtered[:, final_indices]
    X_test_final = X_test_filtered[:, final_indices]
    
    logger.info(f"Dropped features with zero mutual information. Active features: {len(selected_names)}/{len(filtered_names)}")
    
    selected_original_indices = [keep_indices[i] for i in final_indices]

    return (
        X_train_final,
        X_test_final,
        selected_names,
        selected_original_indices
    )