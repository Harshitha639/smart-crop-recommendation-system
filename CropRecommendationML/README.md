# Smart Crop Recommendation System for Precision Agriculture

An intelligent, production-grade Machine Learning system designed to optimize agricultural crop yields by recommending the most suitable crop based on multi-dimensional soil, weather, location, water, and seasonal features.

This codebase features an end-to-end pipeline that preprocesses raw datasets, handles outliers, conducts multi-model benchmarking across 12 modern classification algorithms, auto-selects the best classifier, optimizes its hyperparameters using RandomizedSearchCV, and evaluates and explains models globally (SHAP) and locally (LIME).

---

## 📁 Project Structure

```text
CropRecommendationML/
│
├── data/
│   ├── raw/
│   │   ├── generate_data.py               # Self-bootstrapping agrarian dataset generator
│   │   └── crop_recommendation_raw.csv    # Synthesized raw database (generated on first run)
│   ├── processed/
│   │   └── crop_recommendation_processed.csv # Tabular cleaned dataset
│   └── external/                          # Placeholder for optional external data layers
│
├── notebooks/                             # Data Science exploration notebooks
│
├── src/
│   ├── preprocessing/
│   │   └── pipeline.py                    # ColumnTransformer pipeline (imputation, clipping, scaling, OHE)
│   ├── feature_engineering/
│   │   └── selection.py                   # Redundant collinearity removal & Mutual Info selection
│   ├── models/
│   │   └── models.py                      # Constructors for the 12 requested ML models
│   ├── training/
│   │   └── trainer.py                     # Holds modular model search and tuning parameters
│   ├── evaluation/
│   │   └── evaluator.py                   # Benchmarker calculating F1, Accuracy, CV, AUC & Confusion Heatmaps
│   ├── prediction/
│   │   └── pipeline.py                    # Production-grade inference wrapper for CropPredictor
│   ├── explainability/
│   │   └── explainer.py                   # SHAP Global explainers and LIME Local perturbers
│   └── utils/
│       └── logger.py                      # Standard Logging formatter (stdout + file)
│
├── models/
│   ├── preprocessor_pipeline.joblib       # Fitted ColumnTransformer object
│   ├── best_crop_recommendation_model.joblib # Saved optimal tuned ML model checkpoint
│   └── feature_names.joblib               # List of active features matching processed columns
│
├── reports/
│   ├── images/
│   │   ├── mutual_information_ranking.png # Mutual Information score rank graph
│   │   ├── correlation_heatmap.png        # Multicollinarity correlation map
│   │   ├── model_metrics_comparison.png   # Performance index bar chart
│   │   ├── shap_summary_plot.png          # SHAP global impact summary
│   │   ├── lime_local_explanation.png     # Local prediction explanation breakdown
│   │   └── [model_name]_confusion_matrix.png # Classifier visual error matrix
│   ├── model_comparison_table.csv         # Benchmark metrics csv
│   └── pipeline_execution.log             # Execution standard logging output file
│
├── requirements.txt                       # Python dependencies (pip installer list)
├── train.py                               # Pipeline main CLI script (fits preprocessor, models, outputs graphs)
├── predict.py                             # Reusable inference CLI script (makes predictions from parameters)
└── config.py                              # Centralized system configurations and grids
```

---

## 🚀 Getting Started

### 1. Environment Setup

It is highly recommended to use a clean virtual environment (using `conda` or `venv` with Python 3.12+):

```bash
# Create environment
python -m venv venv

# Activate on Linux/macOS
source venv/bin/activate

# Activate on Windows
venv\Scripts\activate
```

### 2. Install Dependencies

Install all core data science and booster libraries:

```bash
pip install -r requirements.txt
```

---

## 🛠️ Pipeline Execution

### Step 1: Train, Optimize & Explain (End-to-End)

Run the master script to fit the entire pipeline. If no raw data is found, it will automatically synthesize a highly realistic, 2200-row agricultural dataset matching agrarian soil/weather patterns:

```bash
python train.py
```

**What this script does:**
1. **Generates Data**: Auto-synthesis of `crop_recommendation_raw.csv` with logical multivariate structures.
2. **Preprocesses**: Computes IQR boundaries to clip outliers, imputes missing records, encodes categorical labels (One-Hot), and normalizes numerical ranges (StandardScaler).
3. **Selects Features**: Auto-removes multicollinear parameters with correlations above `0.85` and ranks active features using Mutual Information.
4. **Benchmarks 12 Classifiers**: Fits and evaluates:
   - Logistic Regression, Decision Tree, Random Forest, Extra Trees, Support Vector Machine, K-Nearest Neighbors, Naive Bayes, Gradient Boosting, AdaBoost, XGBoost, CatBoost, and LightGBM.
5. **Tunes Champion**: Optimizes hyperparameters of the best model (e.g., Random Forest or XGBoost) using `RandomizedSearchCV`.
6. **Explains Predictions**: Runs SHAP global analysis and creates a LIME visual report showing local feature attribution.
7. **Saves Objects**: Dumpsfitted pipeline, best model, and reports in the `models/` and `reports/` folders.

### Step 2: Running Predictions (CLI Interface)

You can run predictions on specific soil/weather conditions using `predict.py` with arguments:

```bash
python predict.py \
  --nitrogen 85.0 \
  --phosphorus 45.0 \
  --potassium 40.0 \
  --ph 6.2 \
  --moisture 85.0 \
  --soil_type Clayey \
  --temperature 26.5 \
  --humidity 82.0 \
  --rainfall 180.0 \
  --season Kharif
```

**JSON Output Format**:
For programmatic microservices integrations, append the `--json` flag:

```bash
python predict.py --nitrogen 110.0 --phosphorus 35.0 --potassium 50.0 --ph 7.2 --moisture 30.0 --temperature 32.0 --humidity 65.0 --rainfall 90.0 --json
```

---

## 📊 Comprehensive Input Feature Schema

| Group | Feature Name | Description / Normal Bounds |
|---|---|---|
| **Soil** | `Nitrogen` | Nitrogen level (mg/kg) [0 - 150] |
| | `Phosphorus` | Phosphorus level (mg/kg) [5 - 100] |
| | `Potassium` | Potassium level (mg/kg) [5 - 150] |
| | `Soil_pH` | Soil pH level [4.0 - 9.5] |
| | `Soil_Moisture` | Soil Moisture percentage [5% - 100%] |
| | `Soil_Type` | Alluvial, Clayey, Black, Loamy, Laterite, Red, Sandy |
| | `Organic_Carbon` | Organic Carbon percentage [0.1 - 2.5] |
| | `Electrical_Conductivity` | Soil EC (dS/m) [0.1 - 3.5] |
| **Weather** | `Temperature` | Atmospheric Temperature in °C [10 - 45] |
| | `Humidity` | Relative Humidity percentage [15% - 100%] |
| | `Rainfall` | Rainfall depth (mm) [10 - 300] |
| | `Wind_Speed` | Average Wind Speed (km/h) |
| | `Solar_Radiation` | Solar irradiance index |
| | `Sunshine_Hours` | Average Daily Sunshine hours |
| **Location**| `State` | Regional State name |
| | `District` | Local District |
| | `Latitude` / `Longitude` | Coordinate details |
| | `Altitude` | Land Altitude (meters above sea level) |
| | `Agro_Climatic_Zone` | Climatic macro-zone classification |
| **Water** | `Irrigation_Type` | Drip, Sprinkler, Canal Flood, Rainfed Only |
| | `Water_Availability` | High, Medium, Low |
| | `Groundwater_Level` | Soil water table depth (meters) |
| **Seasonal**| `Season` | Kharif, Rabi, Annual |
| | `Month` | Month of planting |
