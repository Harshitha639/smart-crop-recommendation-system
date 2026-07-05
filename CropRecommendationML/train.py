# -*- coding: utf-8 -*-
"""
Smart Crop Recommendation System - End-to-End ML Pipeline
Main pipeline executable. Handles dataset loading/synthesis, preprocessing,
feature selection, multi-model benchmarking, best model hyperparameter optimization,
model serialization, and global/local explainability.
"""

import os
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import RandomizedSearchCV

import config
from src.utils.logger import get_logger
from src.preprocessing.pipeline import preprocess_data
from src.feature_engineering.selection import FeatureSelector
from src.models.models import get_all_models
from src.evaluation.evaluator import evaluate_classifier, generate_comparison_report, plot_confusion_matrix
from src.explainability.explainer import run_shap_analysis, explain_local_prediction

logger = get_logger("TrainMain")


def main():
    logger.info("==================================================")
    logger.info("SMART CROP RECOMMENDATION SYSTEM - ML ENGINE INITIALIZED")
    logger.info("==================================================")
    
    # Step 1: Ensure Raw Data Exists (Self-bootstrapping)
    logger.info(f"Loading research dataset from {config.RAW_DATA_PATH}")

    if not os.path.exists(config.RAW_DATA_PATH):
        raise FileNotFoundError(
            f"Dataset not found: {config.RAW_DATA_PATH}"
            
        )

    df_raw = pd.read_csv(config.RAW_DATA_PATH)
    df_raw.rename(columns={
        "N": "Nitrogen",
        "P": "Phosphorus",
        "K": "Potassium",
        "temperature": "Temperature",
        "humidity": "Humidity",
        "ph": "Soil_pH",
        "rainfall": "Rainfall",
        "label": "Crop"
    }, inplace=True)
    df_raw.to_csv(config.RAW_DATA_PATH, index=False)


    logger.info(f"Dataset loaded successfully. Shape: {df_raw.shape}")
    print("DEBUG 1")
    plt.close()

    # Generate and save exploratory visual statistics
    logger.info("Creating dataset Exploratory Data Analysis (EDA) report visual graphs...")
    os.makedirs(config.IMAGES_DIR, exist_ok=True)
    
    # 1a. Soil Nitrogen/Phosphorus/Potassium distributions (Boxplot)
    plt.figure(figsize=(10, 5))
    sns.boxplot(data=df_raw, x="Crop", y="Nitrogen", palette="Set3")
    plt.title("Distribution of Soil Nitrogen Requirement across Crops")
    plt.xticks(rotation=30)
    plt.tight_layout()
    plt.savefig(os.path.join(config.IMAGES_DIR, "nitrogen_distribution_boxplot.png"), dpi=150)
    plt.close()
    
    # 1b. Temperature vs Humidity Scatterplot grouped by Crop
    plt.figure(figsize=(10, 6))
    sns.scatterplot(data=df_raw, x="Temperature", y="Humidity", hue="Crop", palette="bright", alpha=0.8)
    plt.title("Crop Distribution by Environmental Temperature and Humidity")
    plt.tight_layout()
    plt.savefig(os.path.join(config.IMAGES_DIR, "temperature_vs_humidity_scatter.png"), dpi=150)
    plt.close()
    
    # 1c. Crop target classes distribution
    plt.figure(figsize=(8, 4))
    sns.countplot(data=df_raw, x="Crop", order=df_raw["Crop"].value_counts().index, palette="pastel")
    plt.title("Target Crop Class Frequencies")
    plt.xticks(rotation=30)
    plt.tight_layout()
    plt.savefig(os.path.join(config.IMAGES_DIR, "target_class_distribution.png"), dpi=150)
    plt.close()
    print("DEBUG 3")

    # Step 2: Data Preprocessing Pipeline
    X_train, X_test, y_train, y_test, initial_features, preprocessor = preprocess_data()
    print("DEBUG 4")
    # Step 3: Feature Engineering & Selection
    selector = FeatureSelector(
        feature_names=initial_features,
        collinearity_threshold=0.85,
    )
    X_train_sel = selector.fit_transform(X_train, y_train)
    X_test_sel = selector.transform(X_test)
    selected_features = selector.selected_feature_names_
    selected_indices = selector.selected_indices_

    joblib.dump(selector, config.FEATURE_SELECTOR_PATH)
    joblib.dump(selected_indices, config.SELECTED_FEATURE_INDICES_PATH)
    logger.info(f"Final features selected for modeling: {selected_features}")
    from sklearn.preprocessing import LabelEncoder

    label_encoder = LabelEncoder()

    # Encode target labels for consistent modeling across all classifiers
    y_train_encoded = label_encoder.fit_transform(y_train)
    y_test_encoded = label_encoder.transform(y_test)
    joblib.dump(label_encoder, config.LABEL_ENCODER_PATH)
    logger.info(f"Saved label encoder to {config.LABEL_ENCODER_PATH}")
    # Step 4: Model Training and Benchmarking
    models_dict = get_all_models()
    evaluation_results = {}
    
    logger.info("Benchmarking 12 requested ML classification models...")
    for model_name, model in models_dict.items():
        logger.info(f"--- Training & Evaluating: {model_name} ---")
        try:
            # Fit model using encoded labels for consistency
            model.fit(X_train_sel, y_train_encoded)

            metrics = evaluate_classifier(
                model,
                X_train_sel,
                y_train_encoded,
                X_test_sel,
                y_test_encoded
            )
            evaluation_results[model_name] = metrics
            
            logger.info(f"Model: {model_name} | Accuracy: {metrics['Accuracy']:.4f} | F1: {metrics['F1_Score']:.4f}")
        except Exception as e:
            logger.error(f"Failed model run for {model_name}: {e}")
            
    # Compile multi-model benchmark reports
    df_compare = generate_comparison_report(evaluation_results)
    logger.info(f"Model Benchmark Summary:\n{df_compare.to_string(index=False)}")
    
    # Step 5: Best Model Selection and Confusion Matrix
    best_model_name = df_compare.iloc[0]["Model Name"]
    logger.info(f"*** AUTOMATIC BEST MODEL SELECTED: {best_model_name} ***")
    
    best_fitted_model = models_dict[best_model_name]
    # Use decoded class labels for reporting/plots
    classes = label_encoder.classes_.tolist()

    # Decode predicted labels for confusion matrix plotting
    y_test_decoded = label_encoder.inverse_transform(y_test_encoded)
    y_pred_encoded = evaluation_results[best_model_name]["y_pred"]
    try:
        y_pred_decoded = label_encoder.inverse_transform(y_pred_encoded)
    except Exception:
        # If predictions are already decoded or mapping fails, fall back
        y_pred_decoded = y_pred_encoded

    # Save confusion matrix for best model
    plot_confusion_matrix(
        y_test=y_test_decoded,
        y_pred=y_pred_decoded,
        classes=classes,
        model_name=best_model_name
    )

    # Step 6: Hyperparameter Optimization on Selected Champion
    logger.info(f"Starting Hyperparameter Optimization on: {best_model_name} using RandomizedSearchCV...")
    
    # Select appropriate grid based on model
    if "Forest" in best_model_name or "Trees" in best_model_name:
        param_grid = config.RF_PARAM_GRID
    elif "XGB" in best_model_name:
        param_grid = config.XGB_PARAM_GRID
    elif "LightGBM" in best_model_name or "LGBM" in best_model_name:
        param_grid = config.LGBM_PARAM_GRID
    elif "CatBoost" in best_model_name:
        param_grid = config.CATBOOST_PARAM_GRID
    elif "Support Vector" in best_model_name or "SVM" in best_model_name:
        param_grid = config.SVM_PARAM_GRID
    else:
        # Fallback simpler grid for search
        param_grid = {
            "max_depth": [5, 10, None],
            "n_estimators": [50, 100]
        }
        
    try:
        # We can construct the base model cleanly
        random_search = RandomizedSearchCV(
            estimator=best_fitted_model,
            param_distributions=param_grid,
            n_iter=10,
            cv=3,
            scoring="accuracy",
            random_state=config.RANDOM_STATE,
            n_jobs=-1
        )
        random_search.fit(X_train_sel, y_train)
        
        best_tuned_model = random_search.best_estimator_
        logger.info(f"Hyperparameter tuning completed! Best Params: {random_search.best_params_}")
        
        pre_tune_acc = evaluation_results[best_model_name]["Accuracy"]
        post_tune_acc = random_search.best_score_
        logger.info(f"Tuning performance shift: Pre-tuned Accuracy: {pre_tune_acc:.4f} vs CV Optimized: {post_tune_acc:.4f}")
        
        # Deploy tuned model
        final_model = best_tuned_model
    except Exception as e:
        logger.warning(f"Hyperparameter tuning failed or skipped due to: {e}. Defaulting to pre-tuned champion.")
        final_model = best_fitted_model

    # Save Best Model File
    joblib.dump(final_model, config.BEST_MODEL_PATH)
    logger.info(f"Successfully saved final model checkpoint to {config.BEST_MODEL_PATH}")

    # Step 7: Global and Local Explainability Reports (SHAP & LIME)
    # Global summary
    run_shap_analysis(final_model, X_train_sel, X_test_sel, selected_features)
    
    # Local report on test point index 0
    sample_test_idx = 0
    sample_instance = X_test_sel[sample_test_idx]
    
    local_contribs = explain_local_prediction(
        model=final_model,
        instance=sample_instance,
        X_train=X_train_sel,
        feature_names=selected_features,
        class_names=classes,
        instance_idx=sample_test_idx
    )

    # Step 8: Export Research Paper Academic Report (.txt)
    report_txt_path = os.path.join(config.REPORTS_DIR, "model_evaluation_report.txt")
    logger.info(f"Generating academic evaluation report TXT file at {report_txt_path}...")
    
    with open(report_txt_path, "w", encoding="utf-8") as f:
        f.write("================================================================================\n")
        f.write("         CROP RECOMMENDATION MACHINE LEARNING SYSTEM EVALUATION REPORT          \n")
        f.write("                     (ACADEMIC RESEARCH PAPER READY FORMAT)                     \n")
        f.write("================================================================================\n\n")
        
        f.write("1. ABSTRACT & INTRODUCTION\n")
        f.write("--------------------------\n")
        f.write("This report provides a rigorous benchmarking and interpretability evaluation of a\n")
        f.write("crop recommendation model designed for precision agriculture. The system takes multi-\n")
        f.write("dimensional soil chemistry, climate, spatial, water, and seasonal factors to predict\n")
        f.write("the optimal crop choice. Twelve state-of-the-art classification algorithms were evaluated,\n")
        f.write("and the top-performing model was optimized via Randomized Search cross-validation.\n\n")
        
        f.write("2. EXPERIMENTAL DATASET SPECIFICATION\n")
        f.write("-------------------------------------\n")
        f.write(f"Total instances evaluated: {df_raw.shape[0]} rows\n")
        f.write(f"Pre-processed features: {len(initial_features)} features\n")
        f.write(f"Selected active features: {len(selected_features)} features\n")
        f.write(f"Target crop classes: {len(classes)} ({', '.join(classes)})\n\n")
        
        f.write("3. MULTI-MODEL COMPARISON BENCHMARK TABLE\n")
        f.write("-----------------------------------------\n")
        f.write(df_compare.to_string(index=False))
        f.write("\n\n")
        
        f.write("4. CHAMPION MODEL PERFORMANCE CHARACTERISTICS\n")
        f.write("----------------------------------------------\n")
        f.write(f"Best Model Selected: {best_model_name}\n")
        best_metrics = evaluation_results[best_model_name]
        f.write(f"  - Test Accuracy:          {best_metrics['Accuracy']:.4f} ({best_metrics['Accuracy']*100:.2f}%)\n")
        f.write(f"  - Precision (Macro avg): {best_metrics['Precision']:.4f} ({best_metrics['Precision']*100:.2f}%)\n")
        f.write(f"  - Recall (Macro avg):    {best_metrics['Recall']:.4f} ({best_metrics['Recall']*100:.2f}%)\n")
        f.write(f"  - F1-Score (Macro avg):  {best_metrics['F1_Score']:.4f} ({best_metrics['F1_Score']*100:.2f}%)\n")
        f.write(f"  - Cross-Val Accuracy:    {best_metrics['CV_Mean']:.4f} +/- {best_metrics['CV_Std']:.4f}\n")
        f.write(f"  - Area Under ROC (AUC):  {best_metrics['ROC_AUC']:.4f}\n\n")
        
        f.write("5. FEATURE IMPORTANCE & MUTUAL INFORMATION (MI)\n")
        f.write("-----------------------------------------------\n")
        f.write("The top features by mutual information score with the target class:\n")
        for idx, feat in enumerate(selected_features[:15]):
            f.write(f"  Rank {idx+1:02d}: {feat}\n")
        f.write("\n")
        
        f.write("6. EXPLAINABLE AI (XAI) SUMMARY\n")
        f.write("------------------------------\n")
        f.write("A. Global Explainability (SHAP):\n")
        f.write("SHAP (Shapley Additive exPlanations) summary values illustrate the impact of each\n")
        f.write("feature across all sample predictions. Features with high SHAP values are highly decisive\n")
        f.write("in separating crop categories (e.g., Nitrogen content heavily dictates rice vs chickpea).\n\n")
        
        f.write("B. Local Explainability (LIME):\n")
        f.write(f"LIME local explanation for test instance index {sample_test_idx}:\n")
        predicted_class_idx = np.argmax(best_metrics['y_prob'][sample_test_idx]) if best_metrics['y_prob'] is not None else 0
        predicted_crop = classes[predicted_class_idx]
        confidence = best_metrics['y_prob'][sample_test_idx][predicted_class_idx] if best_metrics['y_prob'] is not None else 1.0
        f.write(f"Predicted Crop: {predicted_crop} (Confidence: {confidence:.2%})\n")
        f.write("Local feature attributions for this specific recommendation:\n")
        for feat, weight in local_contribs.items():
            f.write(f"  - {feat:35s}: Impact = {weight:+.6f}\n")
        f.write("\n")
        
        f.write("================================================================================\n")
        f.write("                  REPORT GENERATION SUCCESSFUL - END OF FILE                    \n")
        f.write("================================================================================\n")
    
    logger.info("==================================================")
    logger.info("SMART CROP RECOMMENDATION SYSTEM PIPELINE COMPLETED")
    logger.info("Model artifacts and visual reports successfully saved!")
    logger.info("==================================================")


if __name__ == "__main__":
    main()
