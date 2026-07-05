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
from typing import List, Tuple, Dict, Optional
from sklearn.feature_selection import mutual_info_classif
from sklearn.base import BaseEstimator, TransformerMixin

import config
from src.utils.logger import get_logger

logger = get_logger("FeatureSelection")


class FeatureSelector(BaseEstimator, TransformerMixin):
    """
    Reusable feature-selection transformer that fits on preprocessed features
    and applies the same selected columns during training and inference.
    """

    def __init__(
        self,
        feature_names: Optional[List[str]] = None,
        collinearity_threshold: float = 0.90,
        top_n_mi: Optional[int] = None,
    ):
        self.feature_names = feature_names
        self.collinearity_threshold = collinearity_threshold
        self.top_n_mi = top_n_mi
        self.selected_indices_ = None
        self.selected_feature_names_ = None
        self.keep_indices_ = None
        self.n_features_in_ = None

    def fit(self, X: np.ndarray, y: np.ndarray):
        if self.feature_names is None:
            raise ValueError("feature_names must be provided before fitting the selector")
        if X.shape[1] != len(self.feature_names):
            raise ValueError(
                f"Feature name count ({len(self.feature_names)}) does not match matrix column count ({X.shape[1]})!"
            )

        collinear_drops, _ = identify_collinear_features(
            X,
            self.feature_names,
            threshold=self.collinearity_threshold,
        )
        self.keep_indices_ = [
            i for i, name in enumerate(self.feature_names) if name not in collinear_drops
        ]

        X_filtered = X[:, self.keep_indices_]
        filtered_names = [self.feature_names[i] for i in self.keep_indices_]
        mi_rankings = compute_mutual_information(X_filtered, y, filtered_names)

        if self.top_n_mi and self.top_n_mi < len(filtered_names):
            selected_names = mi_rankings.head(self.top_n_mi)["Feature"].tolist()
            final_indices = [filtered_names.index(name) for name in selected_names]
        else:
            active_features_df = mi_rankings[mi_rankings["MI_Score"] > 0.001]
            selected_names = active_features_df["Feature"].tolist()
            final_indices = [filtered_names.index(name) for name in selected_names]

        self.selected_feature_names_ = selected_names
        self.selected_indices_ = [self.keep_indices_[i] for i in final_indices]
        self.n_features_in_ = X.shape[1]
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        if self.selected_indices_ is None:
            raise RuntimeError("FeatureSelector must be fitted before transform().")
        if X.shape[1] != self.n_features_in_:
            raise ValueError(
                f"Expected {self.n_features_in_} features, but received {X.shape[1]}."
            )
        return X[:, self.selected_indices_]

    def fit_transform(self, X: np.ndarray, y: np.ndarray) -> np.ndarray:
        return self.fit(X, y).transform(X)


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
) -> Tuple[np.ndarray, np.ndarray, List[str], List[int]]:
    """
    Combines collinearity dropping and Mutual Information selection into a final set.
    """
    logger.info("Running integrated feature selection...")

    selector = FeatureSelector(
        feature_names=feature_names,
        collinearity_threshold=collinearity_threshold,
        top_n_mi=top_n_mi,
    )
    X_train_final = selector.fit_transform(X_train, y_train)
    X_test_final = selector.transform(X_test)

    logger.info(
        f"Feature selection complete. Reduced features from {len(feature_names)} to {len(selector.selected_feature_names_)}."
    )

    return (
        X_train_final,
        X_test_final,
        selector.selected_feature_names_,
        selector.selected_indices_,
    )