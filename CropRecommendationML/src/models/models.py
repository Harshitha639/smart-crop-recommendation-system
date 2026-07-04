# -*- coding: utf-8 -*-
"""
Crop Recommendation System - Model Factory
Defines and returns standard instances of the 12 requested Machine Learning algorithms:
1. Logistic Regression
2. Decision Tree
3. Random Forest
4. Extra Trees
5. Support Vector Machine (SVC)
6. K-Nearest Neighbors (KNN)
7. Gaussian Naive Bayes (GNB)
8. Gradient Boosting (GBDT)
9. AdaBoost
10. XGBoost
11. CatBoost
12. LightGBM
"""

import numpy as np
from typing import Dict, Any

# Scikit-learn models
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    GradientBoostingClassifier,
    AdaBoostClassifier
)
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB

# Optional packages with fallback handling
try:
    from xgboost import XGBClassifier
    _has_xgboost = True
except ImportError:
    _has_xgboost = False

try:
    from catboost import CatBoostClassifier
    _has_catboost = True
except ImportError:
    _has_catboost = False

try:
    from lightgbm import LGBMClassifier
    _has_lightgbm = True
except ImportError:
    _has_lightgbm = False

import config
from src.utils.logger import get_logger

logger = get_logger("ModelFactory")


def get_all_models(random_state: int = config.RANDOM_STATE) -> Dict[str, Any]:
    """
    Initializes and returns a dictionary of the 12 requested ML model instances.
    """
    models: Dict[str, Any] = {
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            random_state=random_state
        ),
        "Decision Tree": DecisionTreeClassifier(
            random_state=random_state
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100, 
            random_state=random_state, 
            n_jobs=-1
        ),
        "Extra Trees": ExtraTreesClassifier(
            n_estimators=100, 
            random_state=random_state, 
            n_jobs=-1
        ),
        "Support Vector Machine": SVC(
            probability=True, 
            kernel="rbf", 
            random_state=random_state
        ),
        "K-Nearest Neighbors": KNeighborsClassifier(
            n_neighbors=5,
            n_jobs=-1
        ),
        "Gaussian Naive Bayes": GaussianNB(),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=100, 
            random_state=random_state
        ),
        "AdaBoost": AdaBoostClassifier(
            random_state=random_state
        )
    }
    
    # 10. Add XGBoost
    if _has_xgboost:
        models["XGBoost"] = XGBClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            eval_metric="mlogloss",
            random_state=random_state,
            n_jobs=1
        )
    else:
        logger.warning("xgboost is not installed. Initializing Scikit-learn Random Forest clone with max_depth=12 as placeholder.")
        models["XGBoost"] = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            random_state=random_state,
            n_jobs=-1
        )
        
    # 11. Add CatBoost
    if _has_catboost:
        models["CatBoost"] = CatBoostClassifier(
            iterations=300,
            learning_rate=0.1,
            depth=6,
            random_seed=random_state,
            verbose=False
        )
    else:
        logger.warning("catboost is not installed. Initializing Scikit-learn Extra Trees clone with max_depth=12 as placeholder.")
        models["CatBoost"] = ExtraTreesClassifier(
            n_estimators=100,
            max_depth=12,
            random_state=random_state,
            n_jobs=-1
        )
        
    # 12. Add LightGBM
    if _has_lightgbm:
        models["LightGBM"] = LGBMClassifier(
            n_estimators=200,
            learning_rate=0.1,
            random_state=random_state,
            n_jobs=1,
            verbosity=-1
        )
    else:
        logger.warning("lightgbm is not installed. Initializing Scikit-learn Gradient Boosting clone with max_depth=6 as placeholder.")
        models["LightGBM"] = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=6,
            random_state=random_state
        )
        
    logger.info(f"Initialized {len(models)} model instances for evaluation and comparison.")
    return models
