// Shared TypeScript Types for the Smart Crop Recommendation System

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
}

export interface Recommendation {
  crop: string;
  probability: number;
}

export interface LimeExplanation {
  feature: string;
  impact: number;
}

export interface ShapValue {
  feature: string;
  value: number;
  ideal: number;
  shap_value: number;
}

export interface YieldModule {
  expected_yield: number;
  yield_unit: string;
  opt_range: { min: number; max: number };
}

export interface FertilizerRecommendation {
  name: string;
  amount_kg_ha: number;
  timing: string;
}

export interface FertilizerModule {
  deficiencies: {
    nitrogen_deficit: number;
    phosphorus_deficit: number;
    potassium_deficit: number;
  };
  recommendations: FertilizerRecommendation[];
}

export interface IrrigationModule {
  water_requirement_mm: number;
  rainfall_effective_mm: number;
  irrigation_deficit_mm: number;
  recommended_method: string;
  irrigation_frequency: string;
}

export interface ProfitModule {
  market_price_per_tonne: number;
  revenue_per_ha: number;
  cultivation_cost_per_ha: number;
  net_profit_per_ha: number;
  currency: string;
}

export interface PredictionResult {
  recommended_crop: string;
  confidence_score: number;
  top_5_recommendations: Recommendation[];
  lime_explanations: LimeExplanation[];
  advisory: string;
  shap_base_value?: number;
  shap_values?: ShapValue[];
  yield_module?: YieldModule;
  fertilizer_module?: FertilizerModule;
  irrigation_module?: IrrigationModule;
  profit_module?: ProfitModule;
}

export interface TrainingLog {
  message: string;
  timestamp: string;
}

export interface SoilInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture: number;
  soil_type: string;
  temperature: number;
  humidity: number;
  rainfall: number;
}
