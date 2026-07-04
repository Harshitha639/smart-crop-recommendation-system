import { useState } from "react";
import { Info, HelpCircle, ArrowUpRight, ArrowDownRight, Sparkles, ChevronRight, CheckCircle2, RotateCcw } from "lucide-react";
import { ShapValue } from "../types";

interface ShapWaterfallProps {
  shapValues: ShapValue[];
  shapBaseValue: number;
  confidenceScore: number;
  recommendedCrop: string;
}

export default function ShapWaterfall({
  shapValues = [],
  shapBaseValue = 0.125,
  confidenceScore,
  recommendedCrop
}: ShapWaterfallProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"waterfall" | "influence">("waterfall");

  if (!shapValues || shapValues.length === 0) {
    return null;
  }

  // Calculate coordinates for waterfall chart
  let accumulated = shapBaseValue;
  const steps = shapValues.map((item, index) => {
    const start = accumulated;
    const end = accumulated + item.shap_value;
    accumulated = end;
    return {
      ...item,
      start,
      end,
      index,
      direction: item.shap_value >= 0 ? "positive" : "negative"
    };
  });

  // Scale calculations (using max cumulative value to prevent overflows, min 0, max 1)
  const maxVal = Math.max(1, ...steps.map(s => Math.max(s.start, s.end)), shapBaseValue, confidenceScore);
  const minVal = 0; // Baseline of probability
  const range = maxVal - minVal;

  const toPercent = (val: number) => {
    return `${((val - minVal) / range) * 100}%`;
  };

  const getExplanation = (item: ShapValue) => {
    const diff = item.value - item.ideal;
    const absDiff = Math.abs(diff);
    
    switch (item.feature) {
      case "Nitrogen":
        if (absDiff < 10) return `Nitrogen level (${item.value} mg/kg) is in the perfect sweet-spot for ${recommendedCrop} (Target: ~${item.ideal} mg/kg), promoting vibrant vegetative growth.`;
        return diff > 0 
          ? `Nitrogen level (${item.value} mg/kg) is higher than the target of ${item.ideal} mg/kg. While rich, excessive nitrogen can delay maturity.`
          : `Nitrogen level (${item.value} mg/kg) is below the ideal ${item.ideal} mg/kg. Nitrogen supplementation is advised for optimal leaf cell expansion.`;
      
      case "Phosphorus":
        if (absDiff < 8) return `Phosphorus level (${item.value} mg/kg) is extremely optimal (Target: ~${item.ideal} mg/kg), which boosts robust root structural formation.`;
        return diff > 0
          ? `High Phosphorus (${item.value} mg/kg vs ideal ${item.ideal} mg/kg) is well tolerated but can lock out other micro-nutrients like zinc.`
          : `Insufficient Phosphorus (${item.value} mg/kg vs ideal ${item.ideal} mg/kg) restricts root development and fruit ripening.`;
      
      case "Potassium":
        if (absDiff < 10) return `Potassium concentration (${item.value} mg/kg) perfectly matches the recommended crop's needs (~${item.ideal} mg/kg), enhancing enzyme activation.`;
        return diff > 0
          ? `Rich Potassium level (${item.value} mg/kg vs target ${item.ideal} mg/kg) creates superior osmotic regulation and crop hardiness.`
          : `Low Potassium (${item.value} mg/kg vs ideal ${item.ideal} mg/kg) leaves plants susceptible to local environmental stresses and pests.`;
      
      case "Soil pH":
        if (absDiff < 0.3) return `Soil pH (${item.value}) is ideal (Target: ~${item.ideal}). A neutral-to-slight acidic soil ensures complete macro-nutrient solubility.`;
        return diff > 0
          ? `Soil pH of ${item.value} is more alkaline than the desired ${item.ideal}. This might slightly restrict iron and manganese absorption.`
          : `Acidic soil pH of ${item.value} is below the target ${item.ideal}. Lime application can raise pH to mobilize phosphorus.`;
      
      case "Soil Moisture":
        if (absDiff < 10) return `Soil Moisture (${item.value}%) is perfectly suited for seed germination and transpiration dynamics (Target: ~${item.ideal}%).`;
        return diff > 0
          ? `Higher soil moisture (${item.value}% vs ideal ${item.ideal}%) creates high soil saturation. Ensure proper drainage to avoid root hypoxia.`
          : `Dry soil moisture (${item.value}% vs target ${item.ideal}%) may trigger stomatal closure and restrict cell turgor.`;
      
      case "Temperature":
        if (absDiff < 2.5) return `Ambient temperature (${item.value.toFixed(1)}°C) is ideal for photosynthesis and enzymic reactions (Target: ~${item.ideal}°C).`;
        return diff > 0
          ? `Temperature (${item.value.toFixed(1)}°C) is warm compared to ideal ${item.ideal}°C. Increased transpiration rates are expected.`
          : `Cooler temperatures (${item.value.toFixed(1)}°C vs ideal ${item.ideal}°C) might decelerate metabolic growth cycles.`;
      
      case "Humidity":
        if (absDiff < 8) return `Relative humidity (${item.value.toFixed(1)}%) is optimal for cellular transpiration control (Target: ~${item.ideal}%).`;
        return diff > 0
          ? `High humidity (${item.value.toFixed(1)}%) increases local fungal disease vectors. Keep rows ventilated.`
          : `Arid air humidity (${item.value.toFixed(1)}% vs ideal ${item.ideal}%) causes dry-air stress. Monitor transpiration loss.`;
      
      case "Rainfall":
        if (absDiff < 20) return `Seasonal rainfall forecast (${item.value.toFixed(0)}mm) perfectly matches natural irrigation demands (Target: ~${item.ideal}mm).`;
        return diff > 0
          ? `High precipitation (${item.value.toFixed(0)}mm) exceeds the crop target of ${item.ideal}mm. Watch for localized waterlogging.`
          : `Moderate rainfall (${item.value.toFixed(0)}mm) falls short of the ${item.ideal}mm demand. Supplement with artificial irrigation.`;
          
      default:
        return `Feature value of ${item.value} compared to ideal target ~${item.ideal}.`;
    }
  };

  const activeIndex = selectedIndex !== null ? selectedIndex : hoveredIndex;
  const activeStep = activeIndex !== null ? steps[activeIndex] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-5">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
              <span>Interactive SHAP Waterfall Explanation</span>
            </h3>
            <div className="group relative cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2.5 bg-slate-900 text-white text-[10px] leading-relaxed rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition duration-200 z-50 font-sans">
                <strong>SHAP (SHapley Additive exPlanations)</strong> calculates the exact attribution of each soil and weather parameter. It starts from the dataset base rate of 12.5% and shows how each feature pulls the confidence up or down to reach the final recommendation confidence.
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
            Click on any feature bar below to lock the feature attribution report and view detailed agronomic suggestions.
          </p>
        </div>

        {/* View Mode Toggle Button */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 text-[11px] font-semibold self-start sm:self-center select-none border border-slate-200/50">
          <button
            onClick={() => {
              setViewMode("waterfall");
              setSelectedIndex(null);
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === "waterfall"
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Waterfall Plot
          </button>
          <button
            onClick={() => {
              setViewMode("influence");
              setSelectedIndex(null);
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === "influence"
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Direct Contribution
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Plot column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Legend indicator bar */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-950/20 px-2.5 py-1.5 rounded border border-slate-200/40 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Expected (Baseline: 12.5%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-emerald-500" /> Positive Attribution
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-rose-500" /> Negative Attribution
              </span>
            </div>
            <span>f(x) Sum = {Math.round(confidenceScore * 100)}%</span>
          </div>

          {/* Waterfall Chart Rendering */}
          {viewMode === "waterfall" ? (
            <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/10 flex flex-col gap-1 overflow-x-hidden">
              
              {/* Baseline Row (E[f(x)]) */}
              <div className="grid grid-cols-12 gap-2 items-center min-h-[30px] border-b border-slate-200/40 pb-1 mb-1">
                <div className="col-span-4 text-[10px] font-mono font-bold text-slate-500 truncate">
                  E[f(X)] (Expected Base)
                </div>
                <div className="col-span-8 relative h-5 flex items-center">
                  <div 
                    className="absolute h-4 bg-slate-300 dark:bg-slate-700 rounded-sm"
                    style={{
                      left: 0,
                      width: toPercent(shapBaseValue)
                    }}
                  />
                  <div 
                    className="absolute text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300"
                    style={{ left: `calc(${toPercent(shapBaseValue)} + 6px)` }}
                  >
                    {(shapBaseValue * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Steps (Waterfall flow) */}
              <div className="flex flex-col gap-1.5 relative">
                {steps.map((step) => {
                  const isPositive = step.direction === "positive";
                  const startX = Math.min(step.start, step.end);
                  const barWidth = Math.abs(step.shap_value);
                  const isHovered = hoveredIndex === step.index;
                  const isSelected = selectedIndex === step.index;
                  
                  return (
                    <div 
                      key={step.feature}
                      className={`grid grid-cols-12 gap-2 items-center py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30" 
                          : isHovered 
                            ? "bg-slate-100 dark:bg-slate-800/60" 
                            : "hover:bg-slate-50/50"
                      }`}
                      onMouseEnter={() => setHoveredIndex(step.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => setSelectedIndex(isSelected ? null : step.index)}
                    >
                      {/* Name & value */}
                      <div className="col-span-4 flex flex-col pl-1.5">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {step.feature}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          x = {step.value} (target: {step.ideal})
                        </span>
                      </div>

                      {/* Bar container */}
                      <div className="col-span-8 relative h-7 flex items-center">
                        {/* Connecting line to show waterfall sequence */}
                        <div 
                          className="absolute border-t border-dashed border-slate-300 dark:border-slate-700"
                          style={{
                            left: toPercent(Math.min(step.start, step.end)),
                            width: toPercent(Math.abs(step.shap_value)),
                            top: "50%",
                            zIndex: 0
                          }}
                        />

                        {/* SHAP Bar */}
                        <div 
                          className={`absolute h-4 rounded-sm transition-all duration-300 shadow-sm ${
                            isPositive 
                              ? "bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-400" 
                              : "bg-rose-500 dark:bg-rose-600 hover:bg-rose-400"
                          } ${isHovered || isSelected ? "ring-2 ring-slate-400/50 scale-y-110" : ""}`}
                          style={{
                            left: toPercent(startX),
                            width: toPercent(barWidth),
                            zIndex: 10
                          }}
                        />

                        {/* Step value text overlay */}
                        <div 
                          className={`absolute text-[9px] font-mono font-black ${
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                          style={{
                            left: `calc(${toPercent(Math.max(step.start, step.end))} + 5px)`,
                            zIndex: 20
                          }}
                        >
                          {isPositive ? "+" : ""}{(step.shap_value * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final Prediction Row */}
              <div className="grid grid-cols-12 gap-2 items-center min-h-[35px] border-t border-slate-200/40 pt-1.5 mt-1.5">
                <div className="col-span-4 text-[10px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>f(x) Recommended</span>
                </div>
                <div className="col-span-8 relative h-5 flex items-center">
                  <div 
                    className="absolute h-4.5 bg-emerald-600 dark:bg-emerald-500 rounded-sm"
                    style={{
                      left: 0,
                      width: toPercent(confidenceScore)
                    }}
                  />
                  <div 
                    className="absolute text-[10px] font-mono font-black text-emerald-700 dark:text-emerald-300"
                    style={{ left: `calc(${toPercent(confidenceScore)} + 6px)` }}
                  >
                    {Math.round(confidenceScore * 100)}% ({recommendedCrop})
                  </div>
                </div>
              </div>

            </div>
          ) : (
            // Direct Influence View Mode
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/10 flex flex-col gap-2.5">
              {steps.map((step) => {
                const isPositive = step.direction === "positive";
                const isHovered = hoveredIndex === step.index;
                const isSelected = selectedIndex === step.index;
                
                return (
                  <div
                    key={step.feature}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500" 
                        : isHovered 
                          ? "bg-slate-100 dark:bg-slate-800 border-slate-300" 
                          : "bg-white dark:bg-slate-900 border-slate-150"
                    }`}
                    onMouseEnter={() => setHoveredIndex(step.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setSelectedIndex(isSelected ? null : step.index)}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{step.feature}</span>
                      <span className={`font-bold flex items-center gap-1 ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
                        {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {isPositive ? "Supports" : "Constrains"} ({(step.shap_value * 100).toFixed(1)}%)
                      </span>
                    </div>

                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      {isPositive ? (
                        <>
                          <div className="w-1/2" />
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(50, step.shap_value * 100)}%` }}
                          />
                        </>
                      ) : (
                        <>
                          <div className="w-1/2 flex justify-end">
                            <div 
                              className="h-full bg-rose-500 rounded-full animate-pulse"
                              style={{ width: `${Math.min(50, Math.abs(step.shap_value) * 100)}%` }}
                            />
                          </div>
                          <div className="w-1/2" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Diagnostic explanation panel column */}
        <div className="lg:col-span-5 flex flex-col h-full justify-between">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-950/5 min-h-[280px] flex flex-col justify-between">
            {activeStep ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Feature detail title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${activeStep.direction === "positive" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                      {activeStep.direction === "positive" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        {activeStep.feature} Diagnostic
                      </h4>
                      <p className="text-[9px] text-slate-400 font-mono">Index rank: #{activeStep.index + 1} attribution</p>
                    </div>
                  </div>
                  
                  {selectedIndex !== null && (
                    <button 
                      onClick={() => setSelectedIndex(null)}
                      className="text-[9px] flex items-center gap-1 px-1.5 py-0.5 bg-slate-200/50 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                      title="Clear selection lock"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Unlock</span>
                    </button>
                  )}
                </div>

                {/* Values Comparison cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 p-2.5 rounded-lg text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Your soil value</span>
                    <span className="text-base font-black text-slate-800 dark:text-slate-100">{activeStep.value}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 p-2.5 rounded-lg text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Ideal for {recommendedCrop}</span>
                    <span className="text-base font-black text-emerald-600">{activeStep.ideal}</span>
                  </div>
                </div>

                {/* Main description advisory */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150/80 p-3 rounded-lg text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                  {getExplanation(activeStep)}
                </div>

                {/* Dynamic warning if it's a huge negative driver */}
                {activeStep.shap_value < -0.05 && (
                  <div className="flex items-start gap-2 p-2.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/40 rounded-lg text-[10px] text-rose-700 leading-relaxed">
                    <Info className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>This parameter acts as a significant constraint, restricting crop development. Follow management steps on the main advisory report to optimize this feature.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-slate-400 py-12 flex-1 my-auto">
                <Info className="h-10 w-10 text-slate-300 stroke-[1.5] animate-pulse mb-3" />
                <h5 className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Awaiting Feature Focus
                </h5>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Hover over or click on any feature bar in the waterfall chart to inspect the local SHAP attribution value and read professional soil advice.
                </p>
              </div>
            )}

            {/* General bottom help message */}
            <div className="text-[10px] font-mono text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-emerald-500" />
              <span>Attribution sum: {(shapValues.reduce((s, i) => s + i.shap_value, 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
