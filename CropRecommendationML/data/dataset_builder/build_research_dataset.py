"""
build_research_dataset.py
================================================================================
RESEARCH-GRADE ENRICHMENT PIPELINE FOR THE KAGGLE CROP RECOMMENDATION DATASET
================================================================================

Author role   : Senior ML Engineer / Data Scientist / Agricultural Data Engineer
Purpose       : Take the original Kaggle "Crop Recommendation" dataset
                (columns: N, P, K, temperature, humidity, ph, rainfall, label)
                and enrich every row with realistic, agriculturally-grounded
                metadata (geography, soil, irrigation, climate) plus a set of
                engineered features suitable for downstream ML research.

Design principles
------------------
1. REPRODUCIBILITY   -> a single seeded NumPy Generator (seed=42) drives every
                         random draw, in a fixed, deterministic call order.
2. DOMAIN REALISM    -> every synthetic field is sampled from a crop- or
                         state-specific range/category derived from publicly
                         known Indian agro-climatic knowledge (e.g. rice is
                         grown mostly in flooded alluvial soils of West Bengal,
                         Punjab, coastal Andhra Pradesh, etc.), NOT from a
                         single global distribution.
3. NO CONSTANT COLUMNS -> every generated numeric column is drawn from a
                         range (uniform/normal) so within-crop and within-state
                         variance is preserved; no column is ever a constant.
4. DATA-DRIVEN FEATURE ENGINEERING -> engineered features such as
                         Crop_Suitability_Score and Fertility_Index are
                         computed FROM the actual N/P/K/temperature/humidity/
                         ph/rainfall values already present in the dataset,
                         not invented independently, so they remain internally
                         consistent with the original Kaggle columns.
5. NO EXTERNAL CALLS  -> pure pandas / numpy, no internet, no APIs.

Input  : data/raw/crop_recommendation_kaggle.csv
Output : data/raw/crop_recommendation_raw.csv

Requirements: Python 3.11, pandas, numpy
================================================================================
"""

import os
import sys
import warnings

import numpy as np
import pandas as pd

# ==============================================================================
# 0. GLOBAL CONFIGURATION
# ==============================================================================

RANDOM_SEED = 42

INPUT_PATH = os.path.join("data", "raw", "crop_recommendation_kaggle.csv")
OUTPUT_PATH = os.path.join("data", "raw", "crop_recommendation_raw.csv")

# The 7 numeric + 1 categorical columns that MUST already exist in the
# Kaggle dataset. The pipeline preserves these exactly as-is.
REQUIRED_COLUMNS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "label"]

# The 22 crops officially supported by the Kaggle Crop Recommendation dataset.
SUPPORTED_CROPS = [
    "rice", "maize", "chickpea", "kidneybeans", "pigeonpeas", "mothbeans",
    "mungbean", "blackgram", "lentil", "pomegranate", "banana", "mango",
    "grapes", "watermelon", "muskmelon", "apple", "orange", "papaya",
    "coconut", "cotton", "jute", "coffee",
]


# ==============================================================================
# 1. DOMAIN KNOWLEDGE: GEOGRAPHY
# ==============================================================================

ALL_STATES = [
    "Punjab", "Haryana", "Rajasthan", "Gujarat", "Maharashtra", "Karnataka",
    "Kerala", "Tamil Nadu", "Andhra Pradesh", "Telangana", "West Bengal",
    "Odisha", "Bihar", "Jharkhand", "Madhya Pradesh", "Uttar Pradesh",
    "Chhattisgarh", "Assam", "Himachal Pradesh", "Jammu and Kashmir",
]

# Which Indian states realistically grow each crop (used for weighted-random
# assignment of State/District per row). Not exhaustive -- a curated,
# agronomically defensible subset per crop.
CROP_STATE_MAP = {
    "rice": ["West Bengal", "Punjab", "Uttar Pradesh", "Tamil Nadu", "Andhra Pradesh", "Odisha"],
    "maize": ["Karnataka", "Madhya Pradesh", "Bihar", "Uttar Pradesh", "Rajasthan"],
    "chickpea": ["Madhya Pradesh", "Rajasthan", "Maharashtra", "Uttar Pradesh"],
    "kidneybeans": ["Himachal Pradesh", "Jammu and Kashmir", "Madhya Pradesh", "Uttar Pradesh"],
    "pigeonpeas": ["Maharashtra", "Karnataka", "Madhya Pradesh", "Uttar Pradesh"],
    "mothbeans": ["Rajasthan", "Gujarat"],
    "mungbean": ["Rajasthan", "Maharashtra", "Madhya Pradesh", "Andhra Pradesh"],
    "blackgram": ["Madhya Pradesh", "Maharashtra", "Tamil Nadu", "Andhra Pradesh"],
    "lentil": ["Uttar Pradesh", "Madhya Pradesh", "West Bengal", "Bihar"],
    "pomegranate": ["Maharashtra", "Karnataka", "Gujarat", "Andhra Pradesh"],
    "banana": ["Tamil Nadu", "Maharashtra", "Gujarat", "Andhra Pradesh", "Karnataka"],
    "mango": ["Uttar Pradesh", "Andhra Pradesh", "Karnataka", "Bihar", "Gujarat"],
    "grapes": ["Maharashtra", "Karnataka", "Tamil Nadu", "Andhra Pradesh"],
    "watermelon": ["Uttar Pradesh", "Karnataka", "Andhra Pradesh", "Madhya Pradesh"],
    "muskmelon": ["Uttar Pradesh", "Punjab", "Haryana", "Rajasthan"],
    "apple": ["Himachal Pradesh", "Jammu and Kashmir"],
    "orange": ["Maharashtra", "Madhya Pradesh", "Punjab"],
    "papaya": ["Andhra Pradesh", "Karnataka", "Gujarat", "Maharashtra"],
    "coconut": ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh"],
    "cotton": ["Gujarat", "Maharashtra", "Telangana", "Andhra Pradesh", "Punjab", "Haryana"],
    "jute": ["West Bengal", "Bihar", "Assam", "Odisha"],
    "coffee": ["Karnataka", "Kerala", "Tamil Nadu"],
}

# A handful of realistic districts per state.
STATE_DISTRICT_MAP = {
    "Punjab": ["Ludhiana", "Amritsar", "Patiala", "Bathinda"],
    "Haryana": ["Karnal", "Hisar", "Rohtak", "Sirsa"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Bikaner", "Kota"],
    "Gujarat": ["Ahmedabad", "Rajkot", "Surat", "Junagadh"],
    "Maharashtra": ["Nashik", "Pune", "Nagpur", "Kolhapur"],
    "Karnataka": ["Belagavi", "Mysuru", "Hassan", "Chikkamagaluru"],
    "Kerala": ["Kozhikode", "Thrissur", "Wayanad", "Kottayam"],
    "Tamil Nadu": ["Coimbatore", "Madurai", "Thanjavur", "Salem"],
    "Andhra Pradesh": ["Guntur", "Krishna", "Chittoor", "Anantapur"],
    "Telangana": ["Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    "West Bengal": ["Bardhaman", "Nadia", "Murshidabad", "Hooghly"],
    "Odisha": ["Cuttack", "Puri", "Balasore", "Ganjam"],
    "Bihar": ["Patna", "Bhagalpur", "Muzaffarpur", "Gaya"],
    "Jharkhand": ["Ranchi", "Dhanbad", "Hazaribagh", "Bokaro"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Ujjain", "Jabalpur"],
    "Uttar Pradesh": ["Meerut", "Lucknow", "Varanasi", "Kanpur"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Bastar"],
    "Assam": ["Jorhat", "Dibrugarh", "Nagaon", "Barpeta"],
    "Himachal Pradesh": ["Shimla", "Kullu", "Mandi", "Solan"],
    "Jammu and Kashmir": ["Srinagar", "Anantnag", "Baramulla", "Jammu"],
}

# Approximate state centroid (lat, lon) in decimal degrees + a jitter radius
# (degrees) used to scatter individual farm/district coordinates realistically
# around that centroid.
STATE_COORDINATES = {
    "Punjab": (31.0, 75.5, 0.6),
    "Haryana": (29.2, 76.3, 0.5),
    "Rajasthan": (26.9, 73.8, 1.2),
    "Gujarat": (22.5, 71.5, 1.0),
    "Maharashtra": (19.5, 75.7, 1.2),
    "Karnataka": (15.0, 76.0, 1.0),
    "Kerala": (10.5, 76.3, 0.6),
    "Tamil Nadu": (11.0, 78.5, 1.0),
    "Andhra Pradesh": (15.9, 79.7, 1.0),
    "Telangana": (17.9, 79.0, 0.7),
    "West Bengal": (23.0, 87.5, 0.8),
    "Odisha": (20.5, 84.5, 0.9),
    "Bihar": (25.7, 85.5, 0.7),
    "Jharkhand": (23.6, 85.3, 0.6),
    "Madhya Pradesh": (23.5, 78.5, 1.3),
    "Uttar Pradesh": (27.0, 80.5, 1.3),
    "Chhattisgarh": (21.3, 81.8, 0.8),
    "Assam": (26.2, 92.9, 0.7),
    "Himachal Pradesh": (31.9, 77.2, 0.6),
    "Jammu and Kashmir": (33.5, 75.5, 0.8),
}

# Realistic altitude range (metres above sea level) per state.
STATE_ALTITUDE_RANGE = {
    "Punjab": (180, 300), "Haryana": (200, 280), "Rajasthan": (150, 500),
    "Gujarat": (0, 300), "Maharashtra": (300, 750), "Karnataka": (300, 900),
    "Kerala": (0, 250), "Tamil Nadu": (0, 450), "Andhra Pradesh": (0, 500),
    "Telangana": (250, 600), "West Bengal": (5, 100), "Odisha": (10, 300),
    "Bihar": (40, 100), "Jharkhand": (300, 700), "Madhya Pradesh": (300, 600),
    "Uttar Pradesh": (100, 300), "Chhattisgarh": (250, 500), "Assam": (30, 150),
    "Himachal Pradesh": (900, 2600), "Jammu and Kashmir": (1000, 3200),
}


# ==============================================================================
# 2. DOMAIN KNOWLEDGE: SOIL
# ==============================================================================

ALL_SOIL_TYPES = ["Alluvial", "Black", "Red", "Clayey", "Loamy", "Laterite", "Sandy"]

CROP_SOIL_MAP = {
    "rice": ["Alluvial", "Clayey"], "maize": ["Alluvial", "Loamy"],
    "chickpea": ["Black", "Loamy"], "kidneybeans": ["Loamy", "Alluvial"],
    "pigeonpeas": ["Black", "Red"], "mothbeans": ["Sandy", "Red"],
    "mungbean": ["Loamy", "Sandy"], "blackgram": ["Black", "Loamy"],
    "lentil": ["Alluvial", "Loamy"], "pomegranate": ["Black", "Red"],
    "banana": ["Alluvial", "Loamy"], "mango": ["Alluvial", "Laterite"],
    "grapes": ["Black", "Red"], "watermelon": ["Sandy", "Alluvial"],
    "muskmelon": ["Sandy", "Alluvial"], "apple": ["Loamy", "Clayey"],
    "orange": ["Black", "Red"], "papaya": ["Loamy", "Alluvial"],
    "coconut": ["Laterite", "Sandy"], "cotton": ["Black", "Alluvial"],
    "jute": ["Alluvial", "Clayey"], "coffee": ["Laterite", "Red"],
}

# Realistic (min, max) ranges per soil type.
#   organic_carbon : percent (%)
#   ec             : electrical conductivity, dS/m
#   moisture       : volumetric soil moisture, percent (%)
SOIL_PROPERTY_RANGES = {
    "Alluvial": {"organic_carbon": (0.40, 0.90), "ec": (0.10, 0.60), "moisture": (20, 35)},
    "Black":    {"organic_carbon": (0.50, 1.20), "ec": (0.20, 0.80), "moisture": (25, 40)},
    "Red":      {"organic_carbon": (0.30, 0.70), "ec": (0.10, 0.50), "moisture": (15, 28)},
    "Clayey":   {"organic_carbon": (0.45, 1.00), "ec": (0.20, 0.90), "moisture": (30, 45)},
    "Loamy":    {"organic_carbon": (0.50, 1.10), "ec": (0.15, 0.55), "moisture": (22, 38)},
    "Laterite": {"organic_carbon": (0.20, 0.60), "ec": (0.05, 0.35), "moisture": (12, 25)},
    "Sandy":    {"organic_carbon": (0.10, 0.40), "ec": (0.05, 0.30), "moisture": (8, 18)},
}

# Groundwater level range (metres below ground level) per state. Deeper in
# heavily-extracted north-west states (Punjab/Haryana/Rajasthan), shallow in
# coastal/delta states (Kerala/West Bengal).
STATE_GROUNDWATER_RANGE = {
    "Punjab": (10, 30), "Haryana": (10, 28), "Rajasthan": (15, 40),
    "Gujarat": (8, 25), "Maharashtra": (6, 18), "Karnataka": (6, 20),
    "Kerala": (2, 8), "Tamil Nadu": (5, 15), "Andhra Pradesh": (5, 15),
    "Telangana": (6, 18), "West Bengal": (2, 8), "Odisha": (3, 10),
    "Bihar": (3, 10), "Jharkhand": (5, 15), "Madhya Pradesh": (6, 18),
    "Uttar Pradesh": (4, 12), "Chhattisgarh": (5, 14), "Assam": (2, 7),
    "Himachal Pradesh": (3, 10), "Jammu and Kashmir": (3, 12),
}

# ICAR-style agro-climatic zone (simplified, one representative zone/state).
STATE_AGRO_CLIMATIC_ZONE = {
    "Punjab": "Trans-Gangetic Plains Region",
    "Haryana": "Trans-Gangetic Plains Region",
    "Rajasthan": "Western Dry Region",
    "Gujarat": "Gujarat Plains and Hills Region",
    "Maharashtra": "Western Plateau and Hills Region",
    "Karnataka": "Southern Plateau and Hills Region",
    "Kerala": "West Coast Plains and Ghats Region",
    "Tamil Nadu": "East Coast Plains and Hills Region",
    "Andhra Pradesh": "East Coast Plains and Hills Region",
    "Telangana": "Southern Plateau and Hills Region",
    "West Bengal": "Lower Gangetic Plains Region",
    "Odisha": "East Coast Plains and Hills Region",
    "Bihar": "Middle Gangetic Plains Region",
    "Jharkhand": "Eastern Plateau and Hills Region",
    "Madhya Pradesh": "Central Plateau and Hills Region",
    "Uttar Pradesh": "Upper Gangetic Plains Region",
    "Chhattisgarh": "Eastern Plateau and Hills Region",
    "Assam": "Eastern Himalayan Region",
    "Himachal Pradesh": "Western Himalayan Region",
    "Jammu and Kashmir": "Western Himalayan Region",
}


# ==============================================================================
# 3. DOMAIN KNOWLEDGE: IRRIGATION & WATER AVAILABILITY
# ==============================================================================

ALL_IRRIGATION_TYPES = ["Canal", "Drip", "Sprinkler", "Rainfed", "Tube Well", "Flood"]

CROP_IRRIGATION_MAP = {
    "rice": ["Flood", "Canal"], "maize": ["Canal", "Tube Well"],
    "chickpea": ["Rainfed", "Sprinkler"], "kidneybeans": ["Sprinkler", "Rainfed"],
    "pigeonpeas": ["Rainfed"], "mothbeans": ["Rainfed"],
    "mungbean": ["Rainfed", "Sprinkler"], "blackgram": ["Rainfed"],
    "lentil": ["Rainfed", "Canal"], "pomegranate": ["Drip"],
    "banana": ["Drip"], "mango": ["Drip", "Rainfed"],
    "grapes": ["Drip"], "watermelon": ["Drip", "Sprinkler"],
    "muskmelon": ["Drip", "Sprinkler"], "apple": ["Sprinkler", "Rainfed"],
    "orange": ["Drip"], "papaya": ["Drip"],
    "coconut": ["Drip", "Tube Well"], "cotton": ["Canal", "Drip"],
    "jute": ["Flood", "Canal"], "coffee": ["Sprinkler", "Rainfed"],
}

# P(Water_Availability category | irrigation type). Canal/Flood/Tube-Well
# systems skew towards High/Medium availability; Rainfed skews towards Low.
IRRIGATION_WATER_PROB = {
    "Canal":     {"High": 0.55, "Medium": 0.35, "Low": 0.10},
    "Flood":     {"High": 0.60, "Medium": 0.30, "Low": 0.10},
    "Tube Well": {"High": 0.45, "Medium": 0.40, "Low": 0.15},
    "Drip":      {"High": 0.35, "Medium": 0.50, "Low": 0.15},
    "Sprinkler": {"High": 0.25, "Medium": 0.50, "Low": 0.25},
    "Rainfed":   {"High": 0.05, "Medium": 0.35, "Low": 0.60},
}


# ==============================================================================
# 4. DOMAIN KNOWLEDGE: SEASON / MONTH / CLIMATE
# ==============================================================================

# (season, [typical sowing/growing months]) per crop. Perennial fruit/plantation
# crops use "Perennial" with their main flowering/planting months.
CROP_SEASON_MONTH_MAP = {
    "rice": ("Kharif", ["June", "July"]),
    "maize": ("Kharif", ["June", "July"]),
    "chickpea": ("Rabi", ["October", "November"]),
    "kidneybeans": ("Kharif", ["July", "August"]),
    "pigeonpeas": ("Kharif", ["June", "July"]),
    "mothbeans": ("Kharif", ["June", "July"]),
    "mungbean": ("Kharif", ["June", "July"]),
    "blackgram": ("Kharif", ["June", "July"]),
    "lentil": ("Rabi", ["October", "November"]),
    "pomegranate": ("Perennial", ["January", "February", "June", "July"]),
    "banana": ("Perennial", ["June", "July", "February", "March"]),
    "mango": ("Perennial", ["December", "January", "February"]),
    "grapes": ("Perennial", ["October", "November"]),
    "watermelon": ("Zaid", ["February", "March"]),
    "muskmelon": ("Zaid", ["February", "March"]),
    "apple": ("Perennial", ["March", "April"]),
    "orange": ("Perennial", ["January", "February", "March"]),
    "papaya": ("Perennial", ["February", "March", "June", "July"]),
    "coconut": ("Perennial", ["June", "July"]),
    "cotton": ("Kharif", ["May", "June"]),
    "jute": ("Kharif", ["March", "April"]),
    "coffee": ("Perennial", ["March", "April"]),
}

# Base (min, max) climate ranges per state.
#   wind      : km/h
#   solar     : solar radiation, MJ/m^2/day
#   sunshine  : sunshine hours/day
STATE_CLIMATE_RANGE = {
    "Punjab":             {"wind": (6, 14), "solar": (18, 22), "sunshine": (7, 9)},
    "Haryana":            {"wind": (6, 14), "solar": (18, 22), "sunshine": (7, 9)},
    "Rajasthan":          {"wind": (8, 18), "solar": (20, 24), "sunshine": (8, 10)},
    "Gujarat":            {"wind": (8, 16), "solar": (19, 23), "sunshine": (7, 9)},
    "Maharashtra":        {"wind": (5, 14), "solar": (18, 22), "sunshine": (7, 9)},
    "Karnataka":          {"wind": (4, 12), "solar": (17, 21), "sunshine": (6, 8)},
    "Kerala":             {"wind": (3, 10), "solar": (15, 19), "sunshine": (5, 7)},
    "Tamil Nadu":         {"wind": (5, 14), "solar": (18, 22), "sunshine": (6, 8)},
    "Andhra Pradesh":     {"wind": (5, 14), "solar": (18, 22), "sunshine": (6, 8)},
    "Telangana":          {"wind": (5, 13), "solar": (18, 22), "sunshine": (6, 8)},
    "West Bengal":        {"wind": (4, 10), "solar": (15, 19), "sunshine": (5, 7)},
    "Odisha":             {"wind": (5, 12), "solar": (16, 20), "sunshine": (6, 8)},
    "Bihar":              {"wind": (4, 10), "solar": (15, 19), "sunshine": (5, 7)},
    "Jharkhand":          {"wind": (4, 10), "solar": (16, 20), "sunshine": (6, 8)},
    "Madhya Pradesh":     {"wind": (5, 13), "solar": (18, 22), "sunshine": (7, 9)},
    "Uttar Pradesh":      {"wind": (4, 11), "solar": (16, 20), "sunshine": (6, 8)},
    "Chhattisgarh":       {"wind": (4, 11), "solar": (16, 20), "sunshine": (6, 8)},
    "Assam":              {"wind": (3, 9),  "solar": (13, 17), "sunshine": (4, 6)},
    "Himachal Pradesh":   {"wind": (5, 15), "solar": (17, 21), "sunshine": (6, 8)},
    "Jammu and Kashmir":  {"wind": (5, 15), "solar": (17, 21), "sunshine": (6, 8)},
}

# Seasonal multiplicative adjustment applied on top of the state base range
# (monsoon/Kharif reduces sunshine & solar radiation but increases wind;
# summer/Zaid increases solar & sunshine).
SEASON_CLIMATE_ADJUSTMENT = {
    "Kharif":    {"wind": 1.10, "solar": 0.90, "sunshine": 0.85},
    "Rabi":      {"wind": 0.90, "solar": 0.95, "sunshine": 1.00},
    "Zaid":      {"wind": 1.00, "solar": 1.10, "sunshine": 1.15},
    "Perennial": {"wind": 1.00, "solar": 1.00, "sunshine": 1.00},
}


# ==============================================================================
# 5. LOADING & VALIDATION
# ==============================================================================

def load_kaggle_dataset(input_path: str) -> pd.DataFrame:
    """
    Load the raw Kaggle Crop Recommendation CSV and validate its schema.

    Parameters
    ----------
    input_path : str
        Path to crop_recommendation_kaggle.csv

    Returns
    -------
    pd.DataFrame
        The untouched original dataframe (N, P, K, temperature, humidity,
        ph, rainfall, label).
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(
            f"Input file not found at '{input_path}'.\n"
            f"Please place the Kaggle Crop Recommendation CSV at this path "
            f"with columns: {REQUIRED_COLUMNS}"
        )

    df = pd.read_csv(INPUT_PATH, sep="\t")

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Input dataset is missing required columns: {missing_cols}")

    unknown_crops = sorted(set(df["label"].unique()) - set(SUPPORTED_CROPS))
    if unknown_crops:
        warnings.warn(
            f"Found labels not in SUPPORTED_CROPS, will fall back to generic "
            f"(state/soil/irrigation) pools for these: {unknown_crops}"
        )

    return df


# ==============================================================================
# 6. FEATURE GENERATORS -- GEOGRAPHY
# ==============================================================================

def assign_state_and_district(labels: np.ndarray, rng: np.random.Generator):
    """Randomly (but crop-appropriately) assign State and District per row."""
    n_rows = len(labels)
    states = np.empty(n_rows, dtype=object)
    districts = np.empty(n_rows, dtype=object)

    for crop in np.unique(labels):
        crop_mask = labels == crop
        n_crop = int(crop_mask.sum())
        candidate_states = CROP_STATE_MAP.get(crop, ALL_STATES)

        chosen_states = rng.choice(candidate_states, size=n_crop)
        states[crop_mask] = chosen_states

        # District depends on which state was drawn for each row, so we
        # resolve it state-by-state within this crop's subset.
        crop_districts = np.empty(n_crop, dtype=object)
        for state in np.unique(chosen_states):
            state_mask = chosen_states == state
            n_state = int(state_mask.sum())
            crop_districts[state_mask] = rng.choice(STATE_DISTRICT_MAP[state], size=n_state)
        districts[crop_mask] = crop_districts

    return states, districts


def assign_coordinates(states: np.ndarray, rng: np.random.Generator):
    """Scatter Latitude/Longitude around each state's centroid."""
    n_rows = len(states)
    lat = np.empty(n_rows, dtype=float)
    lon = np.empty(n_rows, dtype=float)

    for state in np.unique(states):
        mask = states == state
        n_state = int(mask.sum())
        lat_c, lon_c, jitter = STATE_COORDINATES[state]
        lat[mask] = rng.normal(lat_c, jitter / 2.0, size=n_state)
        lon[mask] = rng.normal(lon_c, jitter / 2.0, size=n_state)

    return np.round(lat, 6), np.round(lon, 6)


def assign_altitude(states: np.ndarray, rng: np.random.Generator):
    """Sample Altitude (m) uniformly within each state's realistic range."""
    n_rows = len(states)
    altitude = np.empty(n_rows, dtype=float)

    for state in np.unique(states):
        mask = states == state
        n_state = int(mask.sum())
        lo, hi = STATE_ALTITUDE_RANGE[state]
        altitude[mask] = rng.uniform(lo, hi, size=n_state)

    return np.round(altitude, 1)


# ==============================================================================
# 7. FEATURE GENERATORS -- SOIL
# ==============================================================================

def assign_soil_type(labels: np.ndarray, rng: np.random.Generator):
    """Randomly assign a crop-appropriate Soil_Type per row."""
    n_rows = len(labels)
    soil = np.empty(n_rows, dtype=object)

    for crop in np.unique(labels):
        mask = labels == crop
        n_crop = int(mask.sum())
        options = CROP_SOIL_MAP.get(crop, ALL_SOIL_TYPES)
        soil[mask] = rng.choice(options, size=n_crop)

    return soil


def assign_soil_properties(soil_types: np.ndarray, rng: np.random.Generator):
    """Sample Organic_Carbon (%), Electrical_Conductivity (dS/m) and
    Soil_Moisture (%) from ranges keyed by the row's soil type."""
    n_rows = len(soil_types)
    organic_carbon = np.empty(n_rows, dtype=float)
    ec = np.empty(n_rows, dtype=float)
    moisture = np.empty(n_rows, dtype=float)

    for soil in np.unique(soil_types):
        mask = soil_types == soil
        n_soil = int(mask.sum())
        ranges = SOIL_PROPERTY_RANGES[soil]
        organic_carbon[mask] = rng.uniform(*ranges["organic_carbon"], size=n_soil)
        ec[mask] = rng.uniform(*ranges["ec"], size=n_soil)
        moisture[mask] = rng.uniform(*ranges["moisture"], size=n_soil)

    return np.round(organic_carbon, 3), np.round(ec, 3), np.round(moisture, 2)


def assign_groundwater_level(states: np.ndarray, rng: np.random.Generator):
    """Sample Groundwater_Level (metres below ground level) per state range."""
    n_rows = len(states)
    groundwater = np.empty(n_rows, dtype=float)

    for state in np.unique(states):
        mask = states == state
        n_state = int(mask.sum())
        lo, hi = STATE_GROUNDWATER_RANGE[state]
        groundwater[mask] = rng.uniform(lo, hi, size=n_state)

    return np.round(groundwater, 2)


def assign_agro_climatic_zone(states: np.ndarray):
    """Deterministic lookup of ICAR-style Agro_Climatic_Zone from state."""
    return np.array([STATE_AGRO_CLIMATIC_ZONE[s] for s in states], dtype=object)


# ==============================================================================
# 8. FEATURE GENERATORS -- IRRIGATION & WATER
# ==============================================================================

def assign_irrigation_and_water(labels: np.ndarray, rng: np.random.Generator):
    """Assign Irrigation_Type per crop, then Water_Availability conditioned
    on the irrigation type actually drawn."""
    n_rows = len(labels)
    irrigation = np.empty(n_rows, dtype=object)

    for crop in np.unique(labels):
        mask = labels == crop
        n_crop = int(mask.sum())
        options = CROP_IRRIGATION_MAP.get(crop, ALL_IRRIGATION_TYPES)
        irrigation[mask] = rng.choice(options, size=n_crop)

    water = np.empty(n_rows, dtype=object)
    for irr in np.unique(irrigation):
        mask = irrigation == irr
        n_irr = int(mask.sum())
        prob_map = IRRIGATION_WATER_PROB[irr]
        categories = list(prob_map.keys())
        probs = list(prob_map.values())
        water[mask] = rng.choice(categories, size=n_irr, p=probs)

    return irrigation, water


# ==============================================================================
# 9. FEATURE GENERATORS -- SEASON, MONTH & CLIMATE
# ==============================================================================

def assign_season_and_month(labels: np.ndarray, rng: np.random.Generator):
    """Assign Season (Kharif/Rabi/Zaid/Perennial) and a representative Month
    per crop."""
    n_rows = len(labels)
    season = np.empty(n_rows, dtype=object)
    month = np.empty(n_rows, dtype=object)

    for crop in np.unique(labels):
        mask = labels == crop
        n_crop = int(mask.sum())
        crop_season, crop_months = CROP_SEASON_MONTH_MAP.get(crop, ("Kharif", ["June"]))
        season[mask] = crop_season
        month[mask] = rng.choice(crop_months, size=n_crop)

    return season, month


def assign_climate_features(states: np.ndarray, seasons: np.ndarray, rng: np.random.Generator):
    """Sample Wind_Speed (km/h), Solar_Radiation (MJ/m^2/day) and
    Sunshine_Hours (h/day) from the state's base range, adjusted by season,
    plus small Gaussian jitter so no two rows are identical."""
    n_rows = len(states)
    wind = np.empty(n_rows, dtype=float)
    solar = np.empty(n_rows, dtype=float)
    sunshine = np.empty(n_rows, dtype=float)

    # Step 1: state-level base draw.
    for state in np.unique(states):
        mask = states == state
        n_state = int(mask.sum())
        ranges = STATE_CLIMATE_RANGE[state]
        wind[mask] = rng.uniform(*ranges["wind"], size=n_state)
        solar[mask] = rng.uniform(*ranges["solar"], size=n_state)
        sunshine[mask] = rng.uniform(*ranges["sunshine"], size=n_state)

    # Step 2: seasonal multiplicative adjustment.
    for season in np.unique(seasons):
        mask = seasons == season
        adj = SEASON_CLIMATE_ADJUSTMENT.get(season, {"wind": 1.0, "solar": 1.0, "sunshine": 1.0})
        wind[mask] *= adj["wind"]
        solar[mask] *= adj["solar"]
        sunshine[mask] *= adj["sunshine"]

    # Step 3: small independent noise for extra row-to-row realism.
    wind = wind + rng.normal(0, 0.5, size=n_rows)
    solar = solar + rng.normal(0, 0.3, size=n_rows)
    sunshine = sunshine + rng.normal(0, 0.2, size=n_rows)

    # Physical floor so noise never pushes a value below plausibility.
    wind = np.clip(wind, 1.0, None)
    solar = np.clip(solar, 5.0, None)
    sunshine = np.clip(sunshine, 1.0, None)

    return np.round(wind, 2), np.round(solar, 2), np.round(sunshine, 2)


# ==============================================================================
# 10. ENGINEERED FEATURES
# ==============================================================================

def engineer_npk_features(df: pd.DataFrame) -> pd.DataFrame:
    """NPK_Total and the share of Total contributed by each nutrient."""
    total = df["N"] + df["P"] + df["K"]
    total_safe = total.replace(0, np.nan)  # guard against divide-by-zero

    df["NPK_Total"] = total
    df["NPK_Ratio_N"] = (df["N"] / total_safe).fillna(0.0).round(4)
    df["NPK_Ratio_P"] = (df["P"] / total_safe).fillna(0.0).round(4)
    df["NPK_Ratio_K"] = (df["K"] / total_safe).fillna(0.0).round(4)
    return df


def engineer_fertility_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    A composite 0-100 Fertility_Index combining (globally min-max normalised)
    macro-nutrients, soil organic carbon, and pH optimality (pH 6.5 is
    generally considered the agronomic optimum for nutrient availability).

    Weights: N 0.25, P 0.25, K 0.20, Organic_Carbon 0.15, pH-optimality 0.15.
    """
    def minmax(series: pd.Series) -> pd.Series:
        rng_span = series.max() - series.min()
        if rng_span == 0:
            return series * 0.0
        return (series - series.min()) / rng_span

    norm_n = minmax(df["N"])
    norm_p = minmax(df["P"])
    norm_k = minmax(df["K"])
    norm_oc = minmax(df["Organic_Carbon"])

    ph_deviation = (df["ph"] - 6.5).abs()
    max_deviation = ph_deviation.max() if ph_deviation.max() > 0 else 1.0
    ph_score = 1.0 - (ph_deviation / max_deviation)

    fertility = 100 * (
        0.25 * norm_n + 0.25 * norm_p + 0.20 * norm_k + 0.15 * norm_oc + 0.15 * ph_score
    )
    df["Fertility_Index"] = fertility.round(2)
    return df


def engineer_crop_suitability_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    A data-driven 0-100 Crop_Suitability_Score: how close this row's
    N/P/K/temperature/humidity/ph/rainfall are to the *typical* profile for
    its own crop label (mean/std computed directly from this dataset).

    score = 100 * exp(-0.5 * mean(|z-score| across the 7 features))

    A row sitting exactly on its crop's mean profile scores 100; the score
    decays smoothly (Gaussian-membership style) as the row's growing
    conditions diverge from what is typical for that crop.
    """
    numeric_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

    group_mean = df.groupby("label")[numeric_cols].transform("mean")
    group_std = df.groupby("label")[numeric_cols].transform("std").replace(0, np.nan)

    z_scores = (df[numeric_cols] - group_mean) / group_std
    z_scores = z_scores.fillna(0.0)

    mean_abs_z = z_scores.abs().mean(axis=1)
    score = 100 * np.exp(-0.5 * mean_abs_z)

    df["Crop_Suitability_Score"] = score.round(2)
    return df


def engineer_categorical_bins(df: pd.DataFrame) -> pd.DataFrame:
    """Rainfall_Category (data-driven terciles) and Temperature_Category
    (fixed agronomic thresholds)."""
    df["Rainfall_Category"] = pd.qcut(
        df["rainfall"], q=3, labels=["Low", "Medium", "High"], duplicates="drop"
    ).astype(str)

    temp_bins = [-np.inf, 20, 27, 33, np.inf]
    temp_labels = ["Cool", "Moderate", "Warm", "Hot"]
    df["Temperature_Category"] = pd.cut(
        df["temperature"], bins=temp_bins, labels=temp_labels
    ).astype(str)

    return df


# ==============================================================================
# 11. MAIN ORCHESTRATION
# ==============================================================================

def build_research_dataset(input_path: str = INPUT_PATH, output_path: str = OUTPUT_PATH) -> pd.DataFrame:
    """
    End-to-end pipeline: load -> enrich -> engineer -> save -> report.

    Returns the final enriched dataframe (also written to `output_path`).
    """
    rng = np.random.default_rng(RANDOM_SEED)

    # ---- 1. Load & validate -------------------------------------------------
    df_original = load_kaggle_dataset(input_path)
    original_shape = df_original.shape
    original_columns = list(df_original.columns)

    df = df_original.copy()
    labels = df["label"].to_numpy()

    # ---- 2. Geography ---------------------------------------------------
    states, districts = assign_state_and_district(labels, rng)
    lat, lon = assign_coordinates(states, rng)
    altitude = assign_altitude(states, rng)

    df["State"] = states
    df["District"] = districts
    df["Latitude"] = lat
    df["Longitude"] = lon
    df["Altitude"] = altitude

    # ---- 3. Soil ----------------------------------------------------------
    soil_types = assign_soil_type(labels, rng)
    organic_carbon, ec, soil_moisture = assign_soil_properties(soil_types, rng)
    groundwater = assign_groundwater_level(states, rng)
    agro_zone = assign_agro_climatic_zone(states)

    df["Soil_Type"] = soil_types
    df["Organic_Carbon"] = organic_carbon
    df["Electrical_Conductivity"] = ec
    df["Groundwater_Level"] = groundwater
    df["Soil_Moisture"] = soil_moisture
    df["Agro_Climatic_Zone"] = agro_zone

    # ---- 4. Irrigation / water ---------------------------------------------
    irrigation, water_availability = assign_irrigation_and_water(labels, rng)
    df["Water_Availability"] = water_availability
    df["Irrigation_Type"] = irrigation

    # ---- 5. Season / month / climate ---------------------------------------
    season, month = assign_season_and_month(labels, rng)
    wind_speed, solar_radiation, sunshine_hours = assign_climate_features(states, season, rng)

    df["Season"] = season
    df["Month"] = month
    df["Wind_Speed"] = wind_speed
    df["Solar_Radiation"] = solar_radiation
    df["Sunshine_Hours"] = sunshine_hours

    # ---- 6. Engineered features --------------------------------------------
    df = engineer_npk_features(df)
    df = engineer_fertility_index(df)
    df = engineer_crop_suitability_score(df)
    df = engineer_categorical_bins(df)

    # ---- 7. Persist ---------------------------------------------------------
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)

    # ---- 8. Report ------------------------------------------------------
    print_summary_report(df_original, df, original_shape, original_columns, output_path)

    return df


# ==============================================================================
# 12. REPORTING
# ==============================================================================

def print_summary_report(df_original, df_final, original_shape, original_columns, output_path):
    """Print the required build report: shapes, columns added, missing
    values, and a preview of the enriched dataset."""
    new_columns = [c for c in df_final.columns if c not in original_columns]

    print("=" * 80)
    print("CROP RECOMMENDATION DATASET -- RESEARCH ENRICHMENT REPORT")
    print("=" * 80)

    print(f"\nOriginal dataset shape : {original_shape}")
    print(f"New dataset shape       : {df_final.shape}")

    print(f"\nColumns added ({len(new_columns)}):")
    for i, col in enumerate(new_columns, start=1):
        print(f"  {i:2d}. {col}")

    total_missing = int(df_final.isnull().sum().sum())
    print(f"\nMissing values (total)  : {total_missing}")
    if total_missing > 0:
        missing_by_col = df_final.isnull().sum()
        print(missing_by_col[missing_by_col > 0])

    print("\nFirst five rows of the enriched dataset:")
    with pd.option_context("display.max_columns", None, "display.width", 200):
        print(df_final.head())

    print(f"\nSaved enriched dataset to: {output_path}")
    print("=" * 80)


# ==============================================================================
# 13. ENTRY POINT
# ==============================================================================

def main():
    try:
        build_research_dataset(INPUT_PATH, OUTPUT_PATH)
    except Exception as exc:  # noqa: BLE001 -- top-level CLI error boundary
        print(f"\n[ERROR] Dataset build failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
