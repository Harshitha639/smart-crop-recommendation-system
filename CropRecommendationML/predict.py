# -*- coding: utf-8 -*-
"""
Smart Crop Recommendation System - Prediction CLI Tool
Provides a command-line interface to execute predictions on new soil and environmental data.
"""

import argparse
import sys
import os
import json

import config
from src.prediction.pipeline import CropPredictor
from src.utils.logger import get_logger

logger = get_logger("PredictionCLI")


def parse_arguments():
    """
    Parses CLI parameters for soil, weather, location, water, and seasonal metrics.
    """
    parser = argparse.ArgumentParser(description="Smart Crop Recommendation Inference Engine")
    
    # Soil Features
    parser.add_argument("--nitrogen", type=float, default=90.0, help="Nitrogen value (0-150)")
    parser.add_argument("--phosphorus", type=float, default=42.0, help="Phosphorus value (5-100)")
    parser.add_argument("--potassium", type=float, default=43.0, help="Potassium value (5-150)")
    parser.add_argument("--ph", type=float, default=6.5, help="Soil pH value (4.0-9.5)")
    parser.add_argument("--moisture", type=float, default=80.0, help="Soil Moisture percentage (5-100)")
    parser.add_argument("--soil_type", type=str, default="Clayey", help="Soil Type (Alluvial, Clayey, Black, Loamy, Laterite, Red, Sandy)")
    parser.add_argument("--organic_carbon", type=float, default=0.75, help="Organic Carbon content")
    parser.add_argument("--electrical_conductivity", type=float, default=1.5, help="Soil EC level")
    
    # Weather Features
    parser.add_argument("--temperature", type=float, default=27.2, help="Temperature in Celsius")
    parser.add_argument("--humidity", type=float, default=82.0, help="Humidity percentage (0-100)")
    parser.add_argument("--rainfall", type=float, default=195.0, help="Rainfall in mm")
    parser.add_argument("--wind_speed", type=float, default=12.5, help="Wind speed in km/h")
    parser.add_argument("--solar_radiation", type=float, default=21.0, help="Solar radiation")
    parser.add_argument("--sunshine_hours", type=float, default=7.2, help="Sunshine hours")
    
    # Location Features
    parser.add_argument("--state", type=str, default="Karnataka", help="State of location")
    parser.add_argument("--district", type=str, default="Mysore", help="District name")
    parser.add_argument("--latitude", type=float, default=13.0, help="Latitude")
    parser.add_argument("--longitude", type=float, default=77.0, help="Longitude")
    parser.add_argument("--altitude", type=float, default=280.0, help="Altitude in meters")
    parser.add_argument("--agro_zone", type=str, default="Zone III (Sub-Humid)", help="Agro-Climatic Zone")
    
    # Water Features
    parser.add_argument("--irr_type", type=str, default="Sprinkler", help="Irrigation Type")
    parser.add_argument("--water_avail", type=str, default="High", help="Water Availability")
    parser.add_argument("--gw_level", type=float, default=40.0, help="Groundwater level")
    
    # Seasonal Features
    parser.add_argument("--season", type=str, default="Kharif", help="Crop Season")
    parser.add_argument("--month", type=str, default="September", help="Month of sowing")
    
    # Output mode
    parser.add_argument("--json", action="store_true", help="Print result as machine-readable JSON")
    
    return parser.parse_args()


def main():
    args = parse_arguments()
    
    # Assemble input dict
    input_data = {
        "Nitrogen": args.nitrogen,
        "Phosphorus": args.phosphorus,
        "Potassium": args.potassium,
        "Soil_pH": args.ph,
        "Soil_Moisture": args.moisture,
        "Soil_Type": args.soil_type,
        "Organic_Carbon": args.organic_carbon,
        "Electrical_Conductivity": args.electrical_conductivity,
        "Temperature": args.temperature,
        "Humidity": args.humidity,
        "Rainfall": args.rainfall,
        "Wind_Speed": args.wind_speed,
        "Solar_Radiation": args.solar_radiation,
        "Sunshine_Hours": args.sunshine_hours,
        "State": args.state,
        "District": args.district,
        "Latitude": args.latitude,
        "Longitude": args.longitude,
        "Altitude": args.altitude,
        "Agro_Climatic_Zone": args.agro_zone,
        "Irrigation_Type": args.irr_type,
        "Water_Availability": args.water_avail,
        "Groundwater_Level": args.gw_level,
        "Season": args.season,
        "Month": args.month
    }
    
    try:
        # Load Predictor (this automatically finds models)
        predictor = CropPredictor()
        result = predictor.predict_single(input_data)
        
        # Output results
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print("\n" + "=" * 50)
            print(" SMART CROP RECOMMENDATION SYSTEM - INFERENCE RESULT")
            print("=" * 50)
            print(f" RECOMMENDED CROP: {result['recommended_crop']}")
            print(f" CONFIDENCE SCORE: {result['confidence_score']:.2%}")
            print("-" * 50)
            print(" TOP 5 RECOMMENDATIONS:")
            for idx, rec in enumerate(result["top_5_recommendations"], 1):
                print(f"  {idx}. {rec['crop']:<12} : {rec['probability']:.2%}")
            print("=" * 50 + "\n")
            
    except Exception as e:
        logger.error(f"Inference execution failed: {e}")
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
