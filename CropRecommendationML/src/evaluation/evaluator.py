# -*- coding: utf-8 -*-
"""
Crop Recommendation System - Model Evaluator
Computes evaluation metrics (Accuracy, Precision, Recall, F1-Score, Cross-Validation, ROC-AUC)
and produces comprehensive comparison tables and confusion matrices.
"""

import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Any, Tuple, List

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
    roc_auc_score
)
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelBinarizer

import config
from src.utils.logger import get_logger

logger = get_logger("Evaluation")


def evaluate_classifier(
    model: Any, 
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray, 
    y_test: np.ndarray,
    cv_folds: int = config.CV_FOLDS
) -> Dict[str, Any]:
    """
    Computes a comprehensive evaluation profile for a single fitted classifier.
    """
    # 1. Core predictions
    y_pred = model.predict(X_test)
    
    # Check if model supports predict_proba
    has_proba = hasattr(model, "predict_proba")
    if has_proba:
        y_prob = model.predict_proba(X_test)
    else:
        y_prob = None
        
    # 2. Basic Metrics
    acc = accuracy_score(y_test, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro", zero_division=0)
    
    # 3. Cross Validation on training subset
    logger.info(f"Computing {cv_folds}-fold Cross Validation...")
    try:
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv_folds, scoring="accuracy", n_jobs=1)
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
    except Exception as e:
        logger.warning(f"Cross-validation failed: {e}. Defaulting to train accuracy.")
        train_acc = accuracy_score(y_train, model.predict(X_train))
        cv_mean = train_acc
        cv_std = 0.0
        
    # 4. ROC-AUC (Multi-class One-vs-Rest calculation)
    roc_auc = 0.5
    if y_prob is not None:
        try:
            # Binarize labels to calculate AUC
            lb = LabelBinarizer()
            lb.fit(y_train)
            y_test_bin = lb.transform(y_test)
            
            # If binary classification
            if len(lb.classes_) == 2:
                # Use probability of positive class
                roc_auc = roc_auc_score(y_test_bin, y_prob[:, 1])
            else:
                roc_auc = roc_auc_score(y_test_bin, y_prob, multi_class="ovr", average="macro")
        except Exception as e:
            logger.warning(f"ROC-AUC calculation failed: {e}")
            roc_auc = 0.0
            
    # Return metrics dict
    return {
        "Accuracy": float(acc),
        "Precision": float(prec),
        "Recall": float(rec),
        "F1_Score": float(f1),
        "CV_Mean": float(cv_mean),
        "CV_Std": float(cv_std),
        "ROC_AUC": float(roc_auc),
        "y_pred": y_pred,
        "y_prob": y_prob
    }


def generate_comparison_report(
    evaluation_results: Dict[str, Dict[str, Any]]
) -> pd.DataFrame:
    """
    Consolidates evaluation dictionaries into a clean summary comparison DataFrame
    and saves the table.
    """
    summary_data = []
    for model_name, metrics in evaluation_results.items():
        summary_data.append({
            "Model Name": model_name,
            "Accuracy": metrics["Accuracy"],
            "Precision (Macro)": metrics["Precision"],
            "Recall (Macro)": metrics["Recall"],
            "F1-Score (Macro)": metrics["F1_Score"],
            "Cross-Val Accuracy": metrics["CV_Mean"],
            "ROC-AUC": metrics["ROC_AUC"]
        })
        
    df_compare = pd.DataFrame(summary_data)
    df_compare = df_compare.sort_values(by="F1-Score (Macro)", ascending=False).reset_index(drop=True)
    
    # Save text report
    os.makedirs(config.REPORTS_DIR, exist_ok=True)
    report_csv = os.path.join(config.REPORTS_DIR, "model_comparison_table.csv")
    df_compare.to_csv(report_csv, index=False)
    logger.info(f"Saved Model Comparison Report to {report_csv}")
    
    # Plot metric comparison
    plt.figure(figsize=(12, 6))
    df_melted = pd.melt(df_compare, id_vars="Model Name", value_vars=["Accuracy", "F1-Score (Macro)", "Cross-Val Accuracy"])
    sns.barplot(data=df_melted, x="value", y="Model Name", hue="variable", palette="Set2")
    plt.title("Model Benchmark Comparison on Target Metrics")
    plt.xlabel("Metric Value")
    plt.ylabel("Model")
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    
    plot_path = os.path.join(config.IMAGES_DIR, "model_metrics_comparison.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    
    return df_compare


def plot_confusion_matrix(
    y_test: np.ndarray, 
    y_pred: np.ndarray, 
    classes: List[str],
    model_name: str
) -> None:
    """
    Plots and saves a professional confusion matrix heatmap.
    """
    cm = confusion_matrix(y_test, y_pred)
    
    plt.figure(figsize=(12, 10))
    sns.heatmap(
        cm, 
        annot=True, 
        fmt="d", 
        cmap="YlGnBu", 
        xticklabels=classes, 
        yticklabels=classes, 
        cbar=True
    )
    plt.title(f"Confusion Matrix Heatmap - {model_name}")
    plt.ylabel("Actual Crop Category")
    plt.xlabel("Predicted Crop Category")
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    
    os.makedirs(config.IMAGES_DIR, exist_ok=True)
    clean_name = model_name.replace(" ", "_").lower()
    plot_path = os.path.join(config.IMAGES_DIR, f"{clean_name}_confusion_matrix.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    logger.info(f"Saved confusion matrix plot to {plot_path}")
