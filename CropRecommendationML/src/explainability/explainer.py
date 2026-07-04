# -*- coding: utf-8 -*-
"""
Crop Recommendation System - Explainable AI (XAI)
Implements:
- SHAP (Shapley Additive exPlanations) for global feature impacts
- LIME (Local Interpretable Model-agnostic Explanations) for local point-of-interest explanations
Handles graceful fallback if libraries are not installed.
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Any, List, Dict

# Optional imports for XAI
try:
    import shap
    _has_shap = True
except ImportError:
    _has_shap = False

try:
    import lime
    import lime.lime_tabular
    _has_lime = True
except ImportError:
    _has_lime = False

import config
from src.utils.logger import get_logger

logger = get_logger("Explainability")


def run_shap_analysis(
    model: Any, 
    X_train: np.ndarray, 
    X_test: np.ndarray, 
    feature_names: List[str]
) -> None:
    """
    Computes SHAP values and saves global feature importance and summary plots.
    """
    logger.info("Initializing SHAP global explainability analysis...")
    os.makedirs(config.IMAGES_DIR, exist_ok=True)
    
    if not _has_shap:
        logger.warning("SHAP library is not installed in the current environment. Faking SHAP analysis using internal feature importance values.")
        # Draw fake SHAP plot using model's feature importance
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            indices = np.argsort(importances)[::-1]
            top_indices = indices[:15]
            
            plt.figure(figsize=(10, 6))
            sns.barplot(
                x=importances[top_indices], 
                y=[feature_names[i] for i in top_indices],
                palette="rocket"
            )
            plt.title("Feature Impact Proxy (Global Feature Importance - Tree Node Impurity)")
            plt.xlabel("Mean Impurity Decrease (Proxy for SHAP Mean Attribute)")
            plt.tight_layout()
            
            plot_path = os.path.join(config.IMAGES_DIR, "shap_summary_plot.png")
            plt.savefig(plot_path, dpi=150)
            plt.close()
            logger.info(f"Saved global feature importance proxy plot to {plot_path}")
        return
        
    try:
        # Select background dataset for SHAP explainer
        background = X_train[:50]  # Sub-sample background for computational speed
        
        # Use TreeExplainer for ensembles, KernelExplainer as fallback
        if "Forest" in type(model).__name__ or "Tree" in type(model).__name__ or "XGB" in type(model).__name__ or "LGBM" in type(model).__name__:
            explainer = shap.TreeExplainer(model)
        else:
            explainer = shap.KernelExplainer(model.predict_proba, background)
            
        # Compute shap values on test set slice
        shap_values = explainer.shap_values(X_test[:20])
        
        # Plot SHAP summary and save
        plt.figure(figsize=(10, 6))
        shap.summary_plot(shap_values, X_test[:20], feature_names=feature_names, show=False)
        plt.title("SHAP Global Summary Plot - Feature Contribution Across Test Set")
        plt.tight_layout()
        
        plot_path = os.path.join(config.IMAGES_DIR, "shap_summary_plot.png")
        plt.savefig(plot_path, dpi=150)
        plt.close()
        logger.info(f"Successfully computed SHAP and saved summary plot to {plot_path}")
        
    except Exception as e:
        logger.error(f"SHAP calculations failed: {e}")


def explain_local_prediction(
    model: Any, 
    instance: np.ndarray, 
    X_train: np.ndarray, 
    feature_names: List[str],
    class_names: List[str],
    instance_idx: int = 0
) -> Dict[str, float]:
    """
    Applies LIME to explain a single point prediction.
    Returns feature contributions for the predicted class.
    """
    logger.info(f"Generating local LIME explanation for index {instance_idx}...")
    
    # Target prediction
    pred_probs = model.predict_proba(instance.reshape(1, -1))[0]
    predicted_class_idx = np.argmax(pred_probs)
    predicted_class = class_names[predicted_class_idx]
    confidence = pred_probs[predicted_class_idx]
    
    logger.info(f"Predicted Crop: {predicted_class} (Confidence: {confidence:.2%})")
    
    contributions: Dict[str, float] = {}
    
    if not _has_lime:
        logger.warning("LIME library is not installed. Computing pseudo-LIME explanation based on feature contribution estimation.")
        # Calculate localized importance using delta perturbation
        epsilon = 0.1
        for i, feat in enumerate(feature_names):
            perturbed_instance = instance.copy()
            perturbed_instance[i] += epsilon
            
            p_prob = model.predict_proba(perturbed_instance.reshape(1, -1))[0]
            delta = p_prob[predicted_class_idx] - confidence
            contributions[feat] = float(delta)
            
        # Sort and filter top contributors
        sorted_contribs = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)[:10]
        contributions = dict(sorted_contribs)
        
        # Save a local explanation bar chart
        plt.figure(figsize=(10, 5))
        feats = list(contributions.keys())
        impacts = list(contributions.values())
        colors = ["#2ecc71" if x > 0 else "#e74c3c" for x in impacts]
        
        sns.barplot(x=impacts, y=feats, palette=colors, hue=feats, legend=False)
        plt.axvline(x=0, color="gray", linestyle="--", linewidth=1)
        plt.title(f"Pseudo-LIME Local Explanation\nPrediction: {predicted_class} (Confidence: {confidence:.2%})")
        plt.xlabel("Estimated Influence Value (Impact on Prediction Probability)")
        plt.ylabel("Feature")
        plt.tight_layout()
        
        os.makedirs(config.IMAGES_DIR, exist_ok=True)
        plot_path = os.path.join(config.IMAGES_DIR, "lime_local_explanation.png")
        plt.savefig(plot_path, dpi=150)
        plt.close()
        logger.info(f"Saved pseudo-LIME local explanation plot to {plot_path}")
        
        return contributions

    try:
        # Fit LIME Tabular Explainer
        explainer = lime.lime_tabular.LimeTabularExplainer(
            training_data=X_train,
            feature_names=feature_names,
            class_names=class_names,
            mode="classification"
        )
        
        # Explain instance
        exp = explainer.explain_instance(
            data_row=instance,
            predict_fn=model.predict_proba,
            num_features=10,
            labels=[predicted_class_idx]
        )
        
        # Parse map
        exp_list = exp.as_list(label=predicted_class_idx)
        for feature_cond, weight in exp_list:
            contributions[feature_cond] = float(weight)
            
        # Save HTML local explanation
        os.makedirs(config.REPORTS_DIR, exist_ok=True)
        html_path = os.path.join(config.REPORTS_DIR, "lime_local_explanation.html")
        exp.save_to_file(html_path)
        logger.info(f"Successfully ran LIME. Saved interactive HTML report to {html_path}")
        
    except Exception as e:
        logger.error(f"LIME calculation failed: {e}")
        
    return contributions
