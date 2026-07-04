import { useState, useRef, useEffect } from "react";
import { 
  Play, RotateCcw, CheckCircle2, AlertCircle, Terminal as TermIcon, 
  Award, Cpu, FileJson, Gauge, Database, CheckSquare, Settings, 
  Info, ChevronRight, Sliders, Layers, ArrowRightLeft, FileSpreadsheet,
  Globe, Sun, Droplets, MapPin, TrendingUp, Check, Upload, FileText, Sparkles, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LogItem {
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
}

interface Benchmark {
  name: string;
  accuracy: number;
  f1: number;
}

interface DatasetMeta {
  id: string;
  name: string;
  filename: string;
  agency: string;
  records: number;
  description: string;
  schema: string[];
  sample: any[];
}

const KAGGlE_DATASETS = [
  {
    id: "kaggle_crop_rec",
    title: "Crop Recommendation Dataset",
    slug: "atharvaingle/crop-recommendation-dataset",
    rows: 2200,
    desc: "Provides precise parameters (N, P, K, temperature, humidity, pH, rainfall) mapping to specific crops.",
    features: "7 dimensions, 22 classes",
    url: "https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset"
  },
  {
    id: "kaggle_soil_class",
    title: "Soil Measures & Suitability DB",
    slug: "ujwalwable/soil-measures-crop-suitability",
    rows: 1200,
    desc: "Captures local chemical soil matrices paired with organic matter percentages and regional terrain labels.",
    features: "6 dimensions, 15 classes",
    url: "https://www.kaggle.com/datasets/ujwalwable/soil-measures-crop-suitability"
  },
  {
    id: "kaggle_agri_prod",
    title: "India Agriculture Crop Production",
    slug: "srinivasav22/india-agriculture-crop-production-dataset",
    rows: 4500,
    desc: "Large historic registry of Indian agriculture, providing district-wise crop yield and production densities.",
    features: "8 dimensions, 48 classes",
    url: "https://www.kaggle.com/datasets/srinivasav22/india-agriculture-crop-production-dataset"
  }
];

export default function ModelTraining() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [champion, setChampion] = useState<{ name: string; acc: number; params: string } | null>(null);
  
  // Tab control: "datasets" | "custom" | "engine"
  const [activeTab, setActiveTab] = useState<"datasets" | "custom" | "engine">("datasets");

  // Custom Personal TXT Data State
  const [personalDataText, setPersonalDataText] = useState<string>(`Crop, Nitrogen, Phosphorus, Potassium, pH, Moisture, Rainfall
Rice, 82, 43, 41, 6.3, 82, 190
Wheat, 68, 52, 33, 6.6, 42, 70
Cotton, 112, 34, 48, 7.3, 28, 95
Maize, 92, 46, 28, 6.4, 58, 115
Chickpea, 28, 62, 58, 6.9, 22, 48
Coffee, 98, 27, 118, 5.9, 73, 165
Groundnut, 38, 38, 42, 6.2, 33, 62
Sugarcane, 138, 48, 78, 6.7, 78, 215`);
  const [personalRows, setPersonalRows] = useState<any[]>([
    { Crop: "Rice", Nitrogen: 82, Phosphorus: 43, Potassium: 41, pH: 6.3, Moisture: 82, Rainfall: 190 },
    { Crop: "Wheat", Nitrogen: 68, Phosphorus: 52, Potassium: 33, pH: 6.6, Moisture: 42, Rainfall: 70 },
    { Crop: "Cotton", Nitrogen: 112, Phosphorus: 34, Potassium: 48, pH: 7.3, Moisture: 28, Rainfall: 95 },
    { Crop: "Maize", Nitrogen: 92, Phosphorus: 46, Potassium: 28, pH: 6.4, Moisture: 58, Rainfall: 115 },
    { Crop: "Chickpea", Nitrogen: 28, Phosphorus: 62, Potassium: 58, pH: 6.9, Moisture: 22, Rainfall: 48 },
    { Crop: "Coffee", Nitrogen: 98, Phosphorus: 27, Potassium: 118, pH: 5.9, Moisture: 73, Rainfall: 165 },
    { Crop: "Groundnut", Nitrogen: 38, Phosphorus: 38, Potassium: 42, pH: 6.2, Moisture: 33, Rainfall: 62 },
    { Crop: "Sugarcane", Nitrogen: 138, Phosphorus: 48, Potassium: 78, pH: 6.7, Moisture: 78, Rainfall: 215 }
  ]);
  const [personalParseMessage, setPersonalParseMessage] = useState<string>("Successfully initialized standard template. 8 records parsed.");

  // Kaggle State
  const [activeKaggleDatasets, setActiveKaggleDatasets] = useState<string[]>([]);
  const [pullingKaggle, setPullingKaggle] = useState<Record<string, boolean>>({});
  const [pullingProgress, setPullingProgress] = useState<Record<string, string>>({});

  const parsePersonalData = (text: string) => {
    if (!text.trim()) {
      setPersonalRows([]);
      setPersonalParseMessage("Empty records. Paste tabular rows to begin.");
      return;
    }

    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setPersonalRows([]);
      setPersonalParseMessage("Provide at least 1 header row and 1 data row.");
      return;
    }

    const headerLine = lines[0];
    let separator = ",";
    if (headerLine.includes("\t")) separator = "\t";
    else if (headerLine.includes(";")) separator = ";";

    const headers = headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ""));
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length === headers.length) {
        const item: any = {};
        headers.forEach((h, idx) => {
          const val = cols[idx];
          item[h] = isNaN(Number(val)) ? val : Number(val);
        });
        records.push(item);
      }
    }

    setPersonalRows(records);
    if (records.length > 0) {
      setPersonalParseMessage(`Successfully parsed ${records.length} records! Ready for ML pipeline.`);
    } else {
      setPersonalParseMessage("Parse warning: No rows matched header columns size.");
    }
  };

  const simulatePullKaggle = (id: string) => {
    if (pullingKaggle[id]) return;
    
    setPullingKaggle(prev => ({ ...prev, [id]: true }));
    setPullingProgress(prev => ({ ...prev, [id]: "Authenticating Kaggle API Token..." }));

    setTimeout(() => {
      setPullingProgress(prev => ({ ...prev, [id]: "Downloading ZIP dataset archive..." }));
      setTimeout(() => {
        setPullingProgress(prev => ({ ...prev, [id]: "Unzipping & caching CSV rows..." }));
        setTimeout(() => {
          setPullingKaggle(prev => ({ ...prev, [id]: false }));
          setPullingProgress(prev => ({ ...prev, [id]: "" }));
          setActiveKaggleDatasets(prev => 
            prev.includes(id) ? prev : [...prev, id]
          );
        }, 500);
      }, 500);
    }, 500);
  };

  // Datasets and Merge state
  const [availableDatasets, setAvailableDatasets] = useState<DatasetMeta[]>([]);
  const [activeDatasets, setActiveDatasets] = useState<string[]>(["physiology", "soil", "weather", "rainfall", "yield", "water"]);
  const [selectedStates, setSelectedStates] = useState<string[]>([
    "Maharashtra", "Punjab", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "Gujarat", "Andhra Pradesh", "Rajasthan", "Madhya Pradesh", "West Bengal", "Haryana", "Bihar", "Kerala"
  ]);
  const [outlierHandling, setOutlierHandling] = useState<string>("clip");
  const [scaling, setScaling] = useState<string>("standard");
  const [learningRate, setLearningRate] = useState<string>("0.05");
  const [iterations, setIterations] = useState<string>("200");

  const [activePreviewDataset, setActivePreviewDataset] = useState<string>("soil");
  const [mergePreviewData, setMergePreviewData] = useState<any[]>([]);
  const [mergePreviewCols, setMergePreviewCols] = useState<string[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const STATES_LIST = [
    "Maharashtra", "Punjab", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "Gujarat", "Andhra Pradesh", "Rajasthan", "Madhya Pradesh", "West Bengal", "Haryana", "Bihar", "Kerala"
  ];

  // Fetch base datasets metadata
  useEffect(() => {
    async function loadDatasets() {
      try {
        setLoadingDatasets(true);
        const res = await fetch("/api/datasets");
        const data = await res.json();
        if (data.success) {
          setAvailableDatasets(data.datasets);
        }
      } catch (err) {
        console.error("Failed to fetch available datasets:", err);
      } finally {
        setLoadingDatasets(false);
      }
    }
    loadDatasets();
  }, []);

  // Fetch merge preview data when configurations change
  useEffect(() => {
    async function loadMergePreview() {
      try {
        setLoadingPreview(true);
        const activeStr = activeDatasets.join(",");
        const statesStr = selectedStates.join(",");
        const res = await fetch(
          `/api/datasets/merge-preview?activeDatasets=${activeStr}&states=${statesStr}&outlierHandling=${outlierHandling}&scaling=${scaling}`
        );
        const data = await res.json();
        if (data.success) {
          setMergePreviewData(data.data);
          setMergePreviewCols(data.columns);
        }
      } catch (err) {
        console.error("Failed to load merge preview:", err);
      } finally {
        setLoadingPreview(false);
      }
    }
    loadMergePreview();
  }, [activeDatasets, selectedStates, outlierHandling, scaling]);

  // Auto-scroll logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const toggleDataset = (id: string) => {
    if (activeDatasets.includes(id)) {
      if (activeDatasets.length > 1) {
        setActiveDatasets(prev => prev.filter(d => d !== id));
      }
    } else {
      setActiveDatasets(prev => [...prev, id]);
    }
  };

  const toggleState = (stateName: string) => {
    if (selectedStates.includes(stateName)) {
      if (selectedStates.length > 1) {
        setSelectedStates(prev => prev.filter(s => s !== stateName));
      }
    } else {
      setSelectedStates(prev => [...prev, stateName]);
    }
  };

  const startPipelineSim = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setCurrentStep(1);
    setLogs([]);
    setBenchmarks([]);
    setChampion(null);
    setActiveTab("engine"); // auto switch to see logs

    const logMessage = (msg: string, stepOverride?: number) => {
      let type: "info" | "success" | "warning" | "error" = "info";
      if (msg.includes("SUCCESS") || msg.includes("Successfully") || msg.includes("optimized") || msg.includes("COMPLETED")) {
        type = "success";
      } else if (msg.includes("warning") || msg.includes("not installed") || msg.includes("Skipping") || msg.includes("WARNING")) {
        type = "warning";
      } else if (msg.includes("Failed") || msg.includes("Error")) {
        type = "error";
      }

      setLogs(prev => [...prev, {
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
        type
      }]);

      // Dynamically map logs to steps
      if (stepOverride !== undefined) {
        setCurrentStep(stepOverride);
      } else {
        if (msg.includes("preprocessing")) setCurrentStep(1);
        if (msg.includes("selection") || msg.includes("engineered")) setCurrentStep(2);
        if (msg.includes("multi-model comparison")) setCurrentStep(3);
        if (msg.includes("Hyperparameter Optimization")) setCurrentStep(4);
        if (msg.includes("Serializing pipeline") || msg.includes("Saved")) setCurrentStep(5);
        if (msg.includes("COMPLETED")) setCurrentStep(6);
      }

      // Parse benchmarks out of logs to draw in UI
      if (msg.includes("Benchmark Fit ->")) {
        const regex = /Benchmark Fit ->\s+([A-Za-z0-9\s-]+)\s+\|\s+Test Accuracy:\s+([0-9.]+)\s+\|\s+Macro F1:\s+([0-9.]+)/;
        const match = msg.match(regex);
        if (match) {
          const name = match[1].trim();
          const accuracy = parseFloat(match[2]);
          const f1 = parseFloat(match[3]);
          setBenchmarks(prev => [...prev, { name, accuracy, f1 }]);
        }
      }

      // Parse champion
      if (msg.includes("*** CHAMPION MODEL")) {
        const regex = /\*\*\* CHAMPION MODEL AUTOMATICALLY SELECTED:\s+([A-Za-z\s-]+)\s+\(Accuracy:\s+([0-9.]+)%/;
        const match = msg.match(regex);
        if (match) {
          setChampion({
            name: match[1].trim(),
            acc: parseFloat(match[2]) / 100,
            params: "Default initial parameters"
          });
        }
      }

      // Update champion parameters on optimization
      if (msg.includes("Optimized Hyperparameters found:")) {
        const paramsMatch = msg.match(/Optimized Hyperparameters found:\s+(.+)/);
        if (paramsMatch) {
          const optAccMatch = msg.match(/Optimized champion accuracy:\s+([0-9.]+)%/);
          const optAcc = optAccMatch ? parseFloat(optAccMatch[1]) / 100 : 0.9952;
          setChampion(prev => prev ? {
            ...prev,
            params: paramsMatch[1],
            acc: optAcc
          } : null);
        }
      }
    };

    // Connect to Backend Server-Sent Event stream with configurations
    const activeStr = activeDatasets.join(",");
    const statesStr = selectedStates.join(",");
    const kaggleStr = activeKaggleDatasets.join(",");
    const personalCount = personalRows.length;
    const url = `/api/train-simulate?activeDatasets=${activeStr}&states=${statesStr}&outlierHandling=${outlierHandling}&scaling=${scaling}&learningRate=${learningRate}&iterations=${iterations}&kaggleDatasets=${kaggleStr}&personalCount=${personalCount}`;
    
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (event.data === "[DONE]") {
        logMessage("[INFO] All training operations successfully completed.", 6);
        es.close();
        setIsRunning(false);
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.message === "[DONE]") {
          logMessage("[INFO] All training operations successfully completed.", 6);
          es.close();
          setIsRunning(false);
        } else {
          logMessage(data.message);
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    es.onerror = (err) => {
      console.error("SSE connection error:", err);
      logMessage("[ERROR] Pipeline communication link interrupted. Forcing simulation termination.", 6);
      es.close();
      setIsRunning(false);
    };
  };

  const resetPipeline = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsRunning(false);
    setCurrentStep(0);
    setLogs([]);
    setBenchmarks([]);
    setChampion(null);
  };

  const steps = [
    { title: "Consolidate Sources", desc: "Merge Base Datasets on composite keys" },
    { title: "Data Preprocessing", desc: "Outliers treatment & Feature Engineering" },
    { title: "Collinearity & Selection", desc: "Correlation & Mutual Information scoring" },
    { title: "Algorithms Benchmarking", desc: "Train and rank 12 classifiers" },
    { title: "Hyperparameter Search", desc: "Optimize best model via CV grid search" },
    { title: "Serialize Checkpoints", desc: "Save preprocessor, features & model" }
  ];

  const currentPreviewDataset = availableDatasets.find(d => d.id === activePreviewDataset);

  return (
    <div className="space-y-6">
      
      {/* Tab controls */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm gap-1 select-none">
        <button
          onClick={() => setActiveTab("datasets")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-xs tracking-wider uppercase transition cursor-pointer ${
            activeTab === "datasets"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>1. Standard Registry</span>
        </button>
        <button
          onClick={() => setActiveTab("custom")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-xs tracking-wider uppercase transition cursor-pointer ${
            activeTab === "custom"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>2. Personal & Kaggle</span>
        </button>
        <button
          onClick={() => setActiveTab("engine")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-xs tracking-wider uppercase transition cursor-pointer ${
            activeTab === "engine"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>3. ML Engine Console</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "datasets" && (
          <motion.div
            key="datasets-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Top row: Datasets toggle & Regional Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Dataset Selector Card */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <span>Multi-Source Agrarian Datasets</span>
                  </h3>
                  <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 rounded-full px-2 py-0.5">
                    {activeDatasets.length} of 6 active
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Toggle individual agricultural data sources below. Our training pipeline will dynamically merge active datasets on matching <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">State</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">District</code>, and <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Crop</code> keys, and drop variables associated with deactivated sets.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {loadingDatasets ? (
                    <div className="col-span-2 py-8 text-center text-xs text-slate-400">Loading datasets...</div>
                  ) : (
                    availableDatasets.map((ds) => {
                      const isActive = activeDatasets.includes(ds.id);
                      return (
                        <div
                          key={ds.id}
                          onClick={() => toggleDataset(ds.id)}
                          className={`border rounded-xl p-3.5 flex items-start gap-3 transition cursor-pointer select-none relative overflow-hidden ${
                            isActive
                              ? "bg-slate-50/50 border-emerald-500/40 shadow-sm"
                              : "border-slate-200 dark:border-slate-800 opacity-65 hover:opacity-100"
                          }`}
                        >
                          {/* Left indicator bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                            isActive ? "bg-emerald-500" : "bg-transparent"
                          }`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ds.name}</span>
                              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                isActive ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                                {isActive && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {ds.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-[9px] font-mono text-slate-400">
                              <span className="flex items-center gap-0.5 shrink-0">
                                <FileSpreadsheet className="h-3 w-3 text-slate-400" />
                                <span>{ds.filename}</span>
                              </span>
                              <span>•</span>
                              <span>{ds.records.toLocaleString()} rows</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Regional Filter & Hyperparameters */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Geolocation Filter Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-sky-500" />
                    <span>Regional Records Filter</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Filter training rows by target state. Includes our recently added state, <span className="font-semibold text-emerald-600 dark:text-emerald-400">Andhra Pradesh</span>.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {STATES_LIST.map((state) => {
                      const isSelected = selectedStates.includes(state);
                      return (
                        <button
                          key={state}
                          onClick={() => toggleState(state)}
                          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                            isSelected
                              ? "bg-sky-50/50 text-sky-700 border-sky-300 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-800"
                              : "bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
                          }`}
                        >
                          <MapPin className={`h-3 w-3 ${isSelected ? "text-sky-600" : "text-slate-400"}`} />
                          <span>{state}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Training Pre-processing Settings */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-amber-500" />
                    <span>Data Preprocessing & Tuning</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Outlier Treatment</label>
                      <select
                        value={outlierHandling}
                        onChange={(e) => setOutlierHandling(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg p-2 font-medium"
                      >
                        <option value="clip">IQR Clipping (1.5x) - Guard extreme noise</option>
                        <option value="none">Keep Raw - No outlier filtering</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Feature Scaling</label>
                      <select
                        value={scaling}
                        onChange={(e) => setScaling(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg p-2 font-medium"
                      >
                        <option value="standard">Standard Scaling (Z-Score Normalization)</option>
                        <option value="minmax">MinMaxScaler (0 - 1 normalization)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Learning Rate</label>
                        <input
                          type="text"
                          value={learningRate}
                          onChange={(e) => setLearningRate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg p-2 font-medium"
                          placeholder="0.05"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Iterations / Trees</label>
                        <input
                          type="text"
                          value={iterations}
                          onChange={(e) => setIterations(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg p-2 font-medium"
                          placeholder="200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Middle Section: Active Dataset Inspector & Unified Joiner Preview */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Base CSV Inspector Panel */}
              <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Raw Source File Inspector</span>
                  </span>
                  <select
                    value={activePreviewDataset}
                    onChange={(e) => setActivePreviewDataset(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-medium"
                  >
                    {availableDatasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </h3>

                {currentPreviewDataset ? (
                  <div className="flex-1 flex flex-col min-h-0 space-y-3">
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-500">Source Agency:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 text-right font-medium max-w-[200px] truncate" title={currentPreviewDataset.agency}>
                          {currentPreviewDataset.agency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Format:</span>
                        <span className="font-mono text-[11px] text-slate-700">CSV ({currentPreviewDataset.filename})</span>
                      </div>
                    </div>

                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Schema Columns
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentPreviewDataset.schema.map(col => (
                        <span key={col} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono text-[10px]">
                          {col}
                        </span>
                      ))}
                    </div>

                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Head Sample Records
                    </div>
                    
                    <div className="flex-1 overflow-auto border border-slate-100 rounded-lg font-mono text-[10px] bg-slate-950 text-slate-200 p-3 leading-normal whitespace-pre-wrap">
                      {/* Formatted CSV Representation */}
                      {currentPreviewDataset.schema.join(", ")}
                      {"\n"}
                      {currentPreviewDataset.sample.map(row => 
                        currentPreviewDataset.schema.map(col => row[col]).join(", ")
                      ).join("\n")}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                    Select a dataset to inspect raw CSV records
                  </div>
                )}
              </div>

              {/* Dynamic Joined preview panel */}
              <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-2 shrink-0">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <span>Dynamic Consolidation & Feature Engineering Preview</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {loadingPreview ? "Joining..." : "Live Consolidated View"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  The table below shows the live outcome of combining our active CSV files. Under the hood, this pipeline engineers custom values like <span className="font-semibold text-emerald-600">NPK ratio percentages</span>, <span className="font-semibold text-emerald-600">Soil Fertility index</span>, and <span className="font-semibold text-emerald-600">Crop Suitability index</span> to maximize classifier precision.
                </p>

                {loadingPreview ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                    <Cpu className="h-6 w-6 text-emerald-500 animate-spin" />
                    <span>Executing real-time dataset joins...</span>
                  </div>
                ) : mergePreviewData.length > 0 ? (
                  <div className="flex-1 min-h-0 overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-mono select-none">
                        <tr>
                          {mergePreviewCols.map(col => {
                            // Highlight engineered features
                            const isEngineered = ["NPK_Ratio_N", "NPK_Ratio_P", "NPK_Ratio_K", "Soil_Fertility_Index", "Crop_Suitability_Score"].includes(col);
                            return (
                              <th 
                                key={col} 
                                className={`px-3 py-2.5 font-semibold text-[10px] whitespace-nowrap border-r border-slate-200/50 ${
                                  isEngineered ? "bg-emerald-50 text-emerald-800 border-emerald-100" : ""
                                }`}
                              >
                                {col}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {mergePreviewData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            {mergePreviewCols.map(col => {
                              const isEngineered = ["NPK_Ratio_N", "NPK_Ratio_P", "NPK_Ratio_K", "Soil_Fertility_Index", "Crop_Suitability_Score"].includes(col);
                              const val = row[col];
                              return (
                                <td 
                                  key={col} 
                                  className={`px-3 py-2 whitespace-nowrap border-r border-slate-100 ${
                                    isEngineered ? "bg-emerald-50/30 text-emerald-700 font-semibold" : ""
                                  }`}
                                >
                                  {typeof val === "number" ? val.toFixed(2) : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                    No preview rows matching chosen configurations
                  </div>
                )}
              </div>

            </div>

            {/* Bottom: Control action prompt to go to next phase */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-emerald-800 text-sm flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  <span>Datasets verified and aligned. Ready to train model?</span>
                </h4>
                <p className="text-xs text-emerald-700 max-w-2xl leading-relaxed">
                  By executing the model pipeline, these 6 source sheets will be compiled, scaled according to your choice of <b>{scaling === "standard" ? "Standard Scaling" : "MinMaxScaler"}</b>, and used to train 12 independent classifiers.
                </p>
              </div>

              <button
                onClick={startPipelineSim}
                disabled={isRunning}
                className="flex items-center gap-2 py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs tracking-wider uppercase shadow-md shadow-emerald-600/15 cursor-pointer disabled:opacity-50 select-none"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Execute Training Pipeline</span>
              </button>
            </div>

          </motion.div>
        )}

        {activeTab === "custom" && (
          <motion.div
            key="custom-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Banner info */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-md">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 fill-white" />
                <span>Multi-Source Training Integration Portal</span>
              </h3>
              <p className="text-xs text-emerald-100 mt-2 leading-relaxed max-w-4xl">
                Scale your recommendations beyond default registries. This portal allows you to merge your farm's <b>personal raw logs (.TXT / .CSV)</b> and <b>external Kaggle datasets</b> directly into the active ML pipeline. All custom data points are dynamically preprocessed, scaled, and cross-validated.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Personal Farm Logs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span>Personal Agronomic Logs (TXT / CSV)</span>
                  </h4>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">
                    {personalRows.length} rows parsed
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Paste raw tabular data records below (header + data lines separated by commas, tabs or semicolons), or drop a custom <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">.txt</code> file from your local computer.
                </p>

                {/* Drag and drop file reader */}
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/20 text-center relative hover:bg-slate-50 transition">
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          setPersonalDataText(content);
                          parsePersonalData(content);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Drag or select .txt file"
                  />
                  <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Import custom file</span>
                  <span className="text-[10px] text-slate-400">Supports comma/tab separated text or logs</span>
                </div>

                <div className="flex-1 flex flex-col space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Raw Data Editor</label>
                  <textarea
                    value={personalDataText}
                    onChange={(e) => {
                      setPersonalDataText(e.target.value);
                      parsePersonalData(e.target.value);
                    }}
                    className="w-full h-44 bg-slate-950 text-emerald-400 font-mono text-[11px] p-3 rounded-lg border border-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed resize-none"
                    placeholder="Crop, Nitrogen, Phosphorus, Potassium, pH, Moisture&#10;Rice, 80, 40, 40, 6.2, 80"
                  />
                </div>

                {/* Parser status alert */}
                <div className={`p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 ${
                  personalRows.length > 0
                    ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
                    : "bg-amber-50 border border-amber-100 text-amber-800"
                }`}>
                  <Info className="h-4 w-4 shrink-0" />
                  <span>{personalParseMessage}</span>
                  {personalRows.length > 0 && (
                    <button
                      onClick={() => {
                        setPersonalDataText("");
                        setPersonalRows([]);
                        setPersonalParseMessage("Cleared records. Ready for new input.");
                      }}
                      className="ml-auto text-[10px] font-semibold underline text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Micro preview table of parsed rows */}
                {personalRows.length > 0 && (
                  <div className="border border-slate-100 rounded-lg max-h-36 overflow-auto shrink-0 select-none">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-50 sticky top-0 text-slate-500 font-mono border-b border-slate-100">
                        <tr>
                          {Object.keys(personalRows[0]).slice(0, 5).map(col => (
                            <th key={col} className="px-2.5 py-1.5 font-bold uppercase">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[10px] text-slate-600">
                        {personalRows.slice(0, 4).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 animate-fade-in">
                            {Object.keys(personalRows[0]).slice(0, 5).map(col => (
                              <td key={col} className="px-2.5 py-1 whitespace-nowrap">{String(row[col])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {personalRows.length > 4 && (
                      <div className="bg-slate-50 text-center py-1 text-[9px] text-slate-400 font-medium">
                        Showing first 4 records of {personalRows.length} parsed lines
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Kaggle Connector */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-sky-500" />
                    <span>Kaggle Agricultural Repository Connect</span>
                  </h4>
                  <span className="text-[10px] font-mono bg-sky-50 text-sky-700 rounded-full px-2 py-0.5 font-semibold font-medium">
                    {activeKaggleDatasets.length} of {KAGGlE_DATASETS.length} active
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Select and mount curated crop datasets from Kaggle to integrate thousands of validated records into your training logs.
                </p>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {KAGGlE_DATASETS.map((ds) => {
                    const isMounted = activeKaggleDatasets.includes(ds.id);
                    const isPulling = pullingKaggle[ds.id];
                    const progress = pullingProgress[ds.id];

                    return (
                      <div
                        key={ds.id}
                        className={`border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all ${
                          isMounted
                            ? "bg-sky-50/20 border-sky-300 shadow-sm"
                            : "border-slate-100 bg-slate-50/30 hover:border-slate-200"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{ds.title}</span>
                            <a
                              href={ds.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-sky-600 transition"
                              title="Inspect on Kaggle"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{ds.slug}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1.5">
                            {ds.desc}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/60 dark:border-slate-800/60">
                          <span className="text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                            {ds.rows.toLocaleString()} records • {ds.features}
                          </span>

                          {isPulling ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-sky-600 font-semibold animate-pulse">
                              <Cpu className="h-3.5 w-3.5 animate-spin" />
                              <span>{progress}</span>
                            </div>
                          ) : isMounted ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>Mounted</span>
                              </span>
                              <button
                                onClick={() => setActiveKaggleDatasets(prev => prev.filter(x => x !== ds.id))}
                                className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold underline"
                              >
                                Unmount
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => simulatePullKaggle(ds.id)}
                              className="text-[10px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <span>Pull & Mount</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Integration Summary and Training CTA */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-md text-white">
              <div className="space-y-1 text-center lg:text-left">
                <h4 className="font-semibold text-emerald-400 text-sm flex items-center justify-center lg:justify-start gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Consolidated Multi-Source Pipeline Ready</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  Ready to execute. Merging <b>{(selectedStates.length * 200).toLocaleString()}</b> standard records + <b>{personalRows.length}</b> custom txt rows + <b>{activeKaggleDatasets.reduce((sum, id) => sum + (KAGGlE_DATASETS.find(d => d.id === id)?.rows || 0), 0).toLocaleString()}</b> external Kaggle records.
                </p>
                <div className="flex flex-wrap gap-3 pt-2 justify-center lg:justify-start font-mono text-[10px]">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Standard: {(selectedStates.length * 200).toLocaleString()}</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Personal: {personalRows.length}</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Kaggle: {activeKaggleDatasets.reduce((sum, id) => sum + (KAGGlE_DATASETS.find(d => d.id === id)?.rows || 0), 0).toLocaleString()}</span>
                  <span className="bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded text-emerald-400 font-bold">
                    Total Pool: {(
                      (selectedStates.length * 200) + 
                      personalRows.length + 
                      activeKaggleDatasets.reduce((sum, id) => sum + (KAGGlE_DATASETS.find(d => d.id === id)?.rows || 0), 0)
                    ).toLocaleString()} rows
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab("engine");
                  setTimeout(() => {
                    startPipelineSim();
                  }, 100);
                }}
                className="w-full lg:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider uppercase shadow-md shadow-emerald-600/15 cursor-pointer select-none active:scale-98 transition"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Integrate & Train Models</span>
              </button>
            </div>

          </motion.div>
        )}

        {activeTab === "engine" && (
          <motion.div
            key="engine-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            {/* Left side: Execution Panel & Steps */}
            <div className="xl:col-span-1 flex flex-col gap-6">
              
              {/* Control panel card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-500 animate-pulse" />
                  <span>ML Engine Control Panel</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Run the end-to-end training pipeline. The system will load active CSV datasets, optimize hyperparameters, benchmark all 12 model classifiers, and output serialized model checkpoints.
                </p>

                <div className="flex gap-2">
                  {!isRunning && currentStep === 0 ? (
                    <button
                      onClick={startPipelineSim}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-md active:scale-98 transition cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      <span>Run Pipeline</span>
                    </button>
                  ) : (
                    <button
                      onClick={resetPipeline}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium active:scale-98 transition cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset Engine</span>
                    </button>
                  )}

                  {isRunning && (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-700 rounded-lg font-medium border border-emerald-100 animate-pulse"
                    >
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Training Models...</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Execution Steps Phase Track */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Pipeline Execution Phases
                </h4>

                <div className="flex flex-col gap-4">
                  {steps.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = currentStep > stepNum || currentStep === 6;
                    const isActive = currentStep === stepNum;

                    return (
                      <div key={idx} className="flex gap-3 items-start select-none">
                        <div className="flex flex-col items-center">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition duration-300 ${
                            isCompleted ? "bg-emerald-500 text-white" :
                            isActive ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500" :
                            "bg-slate-100 text-slate-400"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
                          </div>
                          {idx < steps.length - 1 && (
                            <div className={`w-0.5 h-10 mt-1.5 rounded transition duration-300 ${
                              isCompleted ? "bg-emerald-500" : "bg-slate-100"
                            }`} />
                          )}
                        </div>

                        <div className="flex-1">
                          <h5 className={`text-xs font-semibold transition ${
                            isActive ? "text-slate-950 dark:text-slate-100" :
                            isCompleted ? "text-slate-600 dark:text-slate-400" :
                            "text-slate-400"
                          }`}>
                            {step.title}
                          </h5>
                          <p className={`text-[10px] transition mt-0.5 ${
                            isActive ? "text-slate-500" :
                            isCompleted ? "text-slate-400" :
                            "text-slate-400/60"
                          }`}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right side: Terminals, Benchmarks & Leaderboards */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              
              {/* Terminal Logs */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col h-[300px] shadow-lg">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-900 shrink-0 select-none">
                  <TermIcon className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-xs font-medium text-slate-400">pipeline_execution.log</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-mono text-[10px] text-slate-500">streaming logs</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 space-y-1.5 pr-2">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-1.5">
                      <TermIcon className="h-6 w-6 opacity-30" />
                      <span>Console idle. Click 'Execute Training Pipeline' to run engine.</span>
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className={`flex items-start gap-2.5 ${
                        log.type === "success" ? "text-emerald-400" :
                        log.type === "warning" ? "text-amber-400" :
                        log.type === "error" ? "text-rose-400" :
                        "text-slate-300"
                      }`}>
                        <span className="text-slate-600 select-none shrink-0 font-medium">[{log.timestamp}]</span>
                        <span className="break-all whitespace-pre-wrap">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

              {/* Leaderboard and champion */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Champion summary card */}
                <div className="md:col-span-1 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border border-emerald-400/20 rounded-xl p-5 flex flex-col shadow-md">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/70 mb-4 flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    <span>Optimized Champion</span>
                  </h4>

                  {champion ? (
                    <div className="flex flex-col flex-1">
                      <span className="text-lg font-bold leading-tight truncate">{champion.name}</span>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black tracking-tight">{(champion.acc * 100).toFixed(2)}%</span>
                        <span className="text-xs text-emerald-200 font-medium">Accuracy</span>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-white/10 flex flex-col">
                        <span className="text-[9px] text-emerald-200 uppercase font-bold tracking-wider mb-1">
                          Hyperparameters
                        </span>
                        <span className="text-[10px] font-mono leading-relaxed bg-white/5 p-2 rounded truncate text-emerald-100" title={champion.params}>
                          {champion.params}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 opacity-60 text-center text-xs py-8 text-emerald-100">
                      <Gauge className="h-8 w-8 stroke-[1.5]" />
                      <span>Waiting for best performer select</span>
                    </div>
                  )}
                </div>

                {/* Matrix leaderboard */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-[200px]">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Algorithms Leaderboard ({benchmarks.length}/12 trained)
                  </h4>

                  {benchmarks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400 text-xs gap-1 opacity-80">
                      <FileJson className="h-6 w-6 stroke-[1.5]" />
                      <span>Run training pipeline to generate comparison matrix</span>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                      {benchmarks.map((bench, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300 w-36 truncate">{bench.name}</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${bench.accuracy * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-500 w-12 text-right">{(bench.accuracy * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
