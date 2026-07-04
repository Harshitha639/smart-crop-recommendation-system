import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Grid, BarChart3, HelpCircle, Thermometer, Droplets, Compass } from "lucide-react";

// 12 Models Benchmarking Data
const BENCHMARK_DATA = [
  { name: "Logistic Reg.", Accuracy: 91.4, F1_Score: 90.8, Cross_Val: 90.5 },
  { name: "Decision Tree", Accuracy: 95.2, F1_Score: 94.9, Cross_Val: 94.3 },
  { name: "Random Forest", Accuracy: 98.6, F1_Score: 98.5, Cross_Val: 98.2 },
  { name: "Extra Trees", Accuracy: 98.9, F1_Score: 98.8, Cross_Val: 98.5 },
  { name: "SVM", Accuracy: 94.1, F1_Score: 93.8, Cross_Val: 93.5 },
  { name: "K-Nearest N.", Accuracy: 92.3, F1_Score: 92.1, Cross_Val: 91.8 },
  { name: "Gaussian NB", Accuracy: 89.5, F1_Score: 89.2, Cross_Val: 88.9 },
  { name: "Gradient Boost.", Accuracy: 97.8, F1_Score: 97.7, Cross_Val: 97.4 },
  { name: "AdaBoost", Accuracy: 82.4, F1_Score: 81.2, Cross_Val: 80.8 },
  { name: "XGBoost", Accuracy: 99.1, F1_Score: 99.0, Cross_Val: 98.8 },
  { name: "CatBoost", Accuracy: 99.3, F1_Score: 99.2, Cross_Val: 99.1 },
  { name: "LightGBM", Accuracy: 99.2, F1_Score: 99.1, Cross_Val: 98.9 }
].sort((a, b) => b.Accuracy - a.Accuracy);

// Target Crop frequencies
const CROP_DISTRIBUTION_DATA = [
  { name: "Rice", count: 275 },
  { name: "Wheat", count: 275 },
  { name: "Cotton", count: 275 },
  { name: "Maize", count: 275 },
  { name: "Chickpea", count: 275 },
  { name: "Coffee", count: 275 },
  { name: "Groundnut", count: 275 },
  { name: "Sugarcane", count: 275 }
];

// Profile specs for soil/weather parameters to render requirements
const CROP_PROFILES = [
  { crop: "Rice", Nitrogen: 85, Phosphorus: 45, Potassium: 40, Rainfall: 180, pH: 6.2, Temp: 26 },
  { crop: "Wheat", Nitrogen: 65, Phosphorus: 55, Potassium: 35, Rainfall: 75, pH: 6.5, Temp: 18 },
  { crop: "Cotton", Nitrogen: 110, Phosphorus: 35, Potassium: 50, Rainfall: 90, pH: 7.2, Temp: 32 },
  { crop: "Maize", Nitrogen: 95, Phosphorus: 48, Potassium: 30, Rainfall: 110, pH: 6.3, Temp: 24 },
  { crop: "Chickpea", Nitrogen: 30, Phosphorus: 65, Potassium: 60, Rainfall: 45, pH: 7.0, Temp: 16 },
  { crop: "Coffee", Nitrogen: 100, Phosphorus: 25, Potassium: 120, Rainfall: 160, pH: 5.8, Temp: 22 },
  { crop: "Groundnut", Nitrogen: 40, Phosphorus: 40, Potassium: 45, Rainfall: 65, pH: 6.1, Temp: 27 },
  { crop: "Sugarcane", Nitrogen: 140, Phosphorus: 50, Potassium: 80, Rainfall: 220, pH: 6.8, Temp: 29 }
];

// Soil features Correlation Heatmap Matrix
const CORRELATION_MATRIX = {
  features: ["N", "P", "K", "pH", "Moist.", "Temp.", "Humid.", "Rain."],
  values: [
    [1.00, 0.12, -0.05, 0.08, 0.25, 0.14, 0.18, 0.21],
    [0.12, 1.00, 0.45, -0.04, 0.05, -0.11, -0.08, 0.02],
    [-0.05, 0.45, 1.00, -0.02, 0.12, -0.05, -0.01, 0.11],
    [0.08, -0.04, -0.02, 1.00, -0.15, 0.18, 0.05, -0.09],
    [0.25, 0.05, 0.12, -0.15, 1.00, 0.12, 0.65, 0.58],
    [0.14, -0.11, -0.05, 0.18, 0.12, 1.00, 0.22, 0.15],
    [0.18, -0.08, -0.01, 0.05, 0.65, 0.22, 1.00, 0.48],
    [0.21, 0.02, 0.11, -0.09, 0.58, 0.15, 0.48, 1.00]
  ]
};

// Helper to determine background color based on correlation coefficient
function getHeatmapColor(val: number): string {
  const abs = Math.abs(val);
  if (val > 0) {
    if (abs > 0.8) return "bg-red-600 text-white";
    if (abs > 0.5) return "bg-red-400 text-white";
    if (abs > 0.2) return "bg-red-200 text-slate-800";
    return "bg-red-50 text-slate-600";
  } else {
    if (abs > 0.8) return "bg-blue-600 text-white";
    if (abs > 0.5) return "bg-blue-400 text-white";
    if (abs > 0.2) return "bg-blue-200 text-slate-800";
    return "bg-blue-50 text-slate-600";
  }
}

export default function EdaBenchmarks() {
  const [selectedFeature, setSelectedFeature] = useState<"Nitrogen" | "Phosphorus" | "Potassium" | "Rainfall" | "pH" | "Temp">("Nitrogen");

  const handleFeatureChange = (feat: any) => {
    setSelectedFeature(feat);
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Tab Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Exploratory Data Analysis & Classifier Benchmarking
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Browse mathematical correlations, target dataset frequencies, crop requirements distributions, and the comparative score metrics of the 12 pipeline-trained algorithms.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium py-1.5 px-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 select-none border border-slate-200/40">
          <Grid className="h-4 w-4 text-emerald-500" />
          <span>Validated on 2,200 Agrarian Records</span>
        </div>
      </div>

      {/* Row 1: Algorithm Benchmarks & Feature distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Classifier comparison Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            <span>Multi-Model Classifier Score Matrix (12 Algorithms)</span>
          </h3>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BENCHMARK_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[75, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                <Bar dataKey="Accuracy" fill="#10b981" radius={[4, 4, 0, 0]} name="Accuracy (%)" />
                <Bar dataKey="F1_Score" fill="#3b82f6" radius={[4, 4, 0, 0]} name="F1 Score (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Crop Demands Radar */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-emerald-500" />
              <span>Crop Feature Benchmarks</span>
            </h3>
            
            <select
              value={selectedFeature}
              onChange={(e) => handleFeatureChange(e.target.value as any)}
              className="text-xs font-semibold py-1 px-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="Nitrogen">Nitrogen (mg/kg)</option>
              <option value="Phosphorus">Phosphorus (mg/kg)</option>
              <option value="Potassium">Potassium (mg/kg)</option>
              <option value="Rainfall">Rainfall (mm)</option>
              <option value="pH">Soil pH</option>
              <option value="Temp">Temp (°C)</option>
            </select>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={CROP_PROFILES}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="crop" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Radar name={selectedFeature} dataKey={selectedFeature} stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Target Class Frequency & Correlation Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Correlation Heatmap (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
            <Compass className="h-4 w-4 text-emerald-500" />
            <span>Soil Collinearity Correlation Heatmap (Pearson r)</span>
          </h3>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md select-none">
              {/* Feature Headers */}
              <div className="grid grid-cols-9 gap-1 text-center font-mono text-[9px] font-bold text-slate-400 mb-1">
                <div />
                {CORRELATION_MATRIX.features.map(f => (
                  <div key={f} className="truncate">{f}</div>
                ))}
              </div>

              {/* Matrix rows */}
              <div className="flex flex-col gap-1">
                {CORRELATION_MATRIX.features.map((f, rowIdx) => (
                  <div key={f} className="grid grid-cols-9 gap-1 items-center">
                    <div className="text-[10px] font-mono font-bold text-slate-500 truncate text-left">{f}</div>
                    {CORRELATION_MATRIX.values[rowIdx].map((val, colIdx) => (
                      <div
                        key={colIdx}
                        className={`aspect-square rounded flex items-center justify-center text-[10px] font-semibold font-mono transition duration-300 ${getHeatmapColor(val)}`}
                        title={`Correlation (${CORRELATION_MATRIX.features[rowIdx]} vs ${CORRELATION_MATRIX.features[colIdx]}): ${val.toFixed(2)}`}
                      >
                        {val === 1 ? "1.0" : val.toFixed(2).replace("0.", ".")}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Target class frequency (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-[340px]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
            <Droplets className="h-4 w-4 text-emerald-500" />
            <span>Dataset Class Frequencies (Stratified Target)</span>
          </h3>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CROP_DISTRIBUTION_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#93c5fd" radius={[0, 4, 4, 0]} name="Sample Frequency" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
