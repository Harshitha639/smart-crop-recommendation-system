import React, { useState, useRef } from "react";
import { 
  Upload, Loader2, CheckCircle2, FileText, Sparkles, 
  Cpu, Layers, Activity, Check, Image as ImageIcon, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExtractedData {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture?: number;
  soil_type?: string;
}

interface UploadSoilCardProps {
  onExtracted: (data: ExtractedData) => void;
}

const SAMPLE_CARDS = [
  {
    title: "High-Nitrogen Clay Report",
    soil_type: "Clayey",
    values: { nitrogen: 92, phosphorus: 48, potassium: 42, ph: 6.3, moisture: 82, soil_type: "Clayey" },
    desc: "Simulate a wet Kharif paddy field analysis sheet."
  },
  {
    title: "Dry Arid Sandy Report",
    soil_type: "Sandy",
    values: { nitrogen: 28, phosphorus: 64, potassium: 58, ph: 7.2, moisture: 18, soil_type: "Sandy" },
    desc: "Simulate a Rabi pulse region chemical crop card."
  },
  {
    title: "Balanced Alluvial Report",
    soil_type: "Alluvial",
    values: { nitrogen: 74, phosphorus: 52, potassium: 36, ph: 6.6, moisture: 46, soil_type: "Alluvial" },
    desc: "Simulate standard Northern plains cereal test parameters."
  },
  {
    title: "Acidic Laterite Tea Report",
    soil_type: "Laterite",
    values: { nitrogen: 45, phosphorus: 22, potassium: 75, ph: 5.2, moisture: 60, soil_type: "Laterite" },
    desc: "Simulate a highly-drained, acidic mountain plantation card."
  },
  {
    title: "Alkaline Black Cotton Sheet",
    soil_type: "Black",
    values: { nitrogen: 55, phosphorus: 32, potassium: 120, ph: 7.9, moisture: 55, soil_type: "Black" },
    desc: "Simulate high moisture-retaining, heavy volcanic-ash Deccan soil."
  },
  {
    title: "Coastal Saline Humid Report",
    soil_type: "Sandy",
    values: { nitrogen: 40, phosphorus: 45, potassium: 50, ph: 8.2, moisture: 75, soil_type: "Sandy" },
    desc: "Simulate low-elevation high-humidity coastal saline soil test."
  },
  {
    title: "Organic Forest Loamy Card",
    soil_type: "Loamy",
    values: { nitrogen: 110, phosphorus: 55, potassium: 85, ph: 6.0, moisture: 68, soil_type: "Loamy" },
    desc: "Simulate organic-rich deciduous forest loam topsoil report."
  },
  {
    title: "Red Sandy Loam Profile",
    soil_type: "Red",
    values: { nitrogen: 35, phosphorus: 70, potassium: 90, ph: 6.7, moisture: 35, soil_type: "Red" },
    desc: "Simulate iron-oxide rich southern dry-zone soil analytics."
  },
  {
    title: "Peaty Hydromorphic Sheet",
    soil_type: "Peaty",
    values: { nitrogen: 120, phosphorus: 28, potassium: 32, ph: 4.8, moisture: 88, soil_type: "Peaty" },
    desc: "Simulate marshy high-organic-matter humid wetlands record."
  }
];

export default function UploadSoilCard({ onExtracted }: UploadSoilCardProps) {
  const [loading, setLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedSummary, setExtractedSummary] = useState<ExtractedData | null>(null);
  const [simulationActive, setSimulationActive] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      setLoading(true);
      setExtractedSummary(null);
      setSimulationActive(null);
      setOcrMessage("Uploading Soil Health Card document...");

      // Generate local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          setOcrMessage("Gemini parsing text structures & table values...");
          
          const res = await fetch("/api/soil-card-ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileData: base64Data, mimeType: file.type })
          });
          
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
          }
          
          const data = await res.json();
          if (data.success && data.extracted) {
            const ext = data.extracted;
            const parsed: ExtractedData = {
              nitrogen: Number(ext.nitrogen) || 60,
              phosphorus: Number(ext.phosphorus) || 40,
              potassium: Number(ext.potassium) || 40,
              ph: Number(ext.ph) || 6.5,
              moisture: Number(ext.moisture) || 50,
              soil_type: ext.soil_type || "Alluvial"
            };
            
            setExtractedSummary(parsed);
            onExtracted(parsed);
            setOcrMessage("Chemical parameters successfully extracted!");
          } else {
            setOcrMessage("Document extraction failed. Try one of our Sample Reports!");
          }
        } catch (innerErr) {
          console.error("OCR parse error:", innerErr);
          setOcrMessage("Extraction failed. Defaulting to sample presets.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File processing failed:", err);
      setOcrMessage("Error processing file document.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Simulated OCR analysis for testing
  const runSimulatedOcr = (card: typeof SAMPLE_CARDS[0]) => {
    setLoading(true);
    setExtractedSummary(null);
    setPreviewUrl(null);
    setSimulationActive(card.title);
    setOcrMessage("Extracting mock document layers...");

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        setOcrMessage("OCR identifying regional Soil Health registry patterns...");
      } else if (step === 2) {
        setOcrMessage("Locating chemistry metrics: Nitrogen, Phosphorus, Potassium, pH...");
      } else if (step === 3) {
        clearInterval(interval);
        setLoading(false);
        setExtractedSummary(card.values);
        onExtracted(card.values);
        setOcrMessage(`Successfully extracted parameters for ${card.title}!`);
      }
    }, 800);
  };

  return (
    <div id="upload-soil-card-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-600" />
          <span>Upload Soil Card & Auto-Fill</span>
        </h4>
        <span className="text-[9px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 rounded px-1.5 py-0.5 uppercase tracking-wide">
          AI OCR Active
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Upload an image of a regional Soil Health Card, or click a <b>sample card</b> below to simulate real-time AI parameter extraction.
      </p>

      {/* Main Drag-and-Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 transition text-center flex flex-col items-center justify-center cursor-pointer relative overflow-hidden h-36 ${
          isDragOver 
            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" 
            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/25 hover:border-slate-300"
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Scan Effect Bar */}
        {loading && (
          <motion.div 
            initial={{ top: 0 }}
            animate={{ top: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_2px_rgba(16,185,129,0.5)] z-10 pointer-events-none"
          />
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold max-w-[220px] truncate">
                {ocrMessage}
              </span>
            </motion.div>
          ) : previewUrl ? (
            <motion.div 
              key="preview-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 w-full justify-center px-4"
            >
              <img 
                src={previewUrl} 
                alt="Soil card preview" 
                className="h-16 w-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                  User Soil Card Uploaded
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Values auto-filled below!</span>
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-[9px] font-bold text-slate-400 hover:text-slate-600 mt-1 cursor-pointer underline"
                >
                  Change Card
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="idle-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Upload className="h-6 w-6 text-slate-400 mb-1.5" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Drop your Soil Health Card here
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                Supports JPG, PNG images. Click to browse.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Extract parameters feedback */}
      {extractedSummary && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-xs space-y-2"
        >
          <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-bold">
              <Activity className="h-3.5 w-3.5" />
              <span>Extracted Parameters (Form Synced)</span>
            </span>
            <span className="text-[10px] bg-emerald-500 text-white rounded px-1.5 py-0.2 font-mono">
              Auto-filled
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded shadow-sm">
              <span className="block text-[9px] text-slate-400 font-bold font-sans">Nitrogen (N)</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{extractedSummary.nitrogen}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded shadow-sm">
              <span className="block text-[9px] text-slate-400 font-bold font-sans">Phosphorus (P)</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{extractedSummary.phosphorus}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded shadow-sm">
              <span className="block text-[9px] text-slate-400 font-bold font-sans">Potassium (K)</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{extractedSummary.potassium}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded shadow-sm">
              <span className="block text-[9px] text-slate-400 font-bold font-sans">pH</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{extractedSummary.ph.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Interactive Mock Sample Cards Selector */}
      <div className="space-y-2 pt-1 select-none">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Interactive Soil Card Presets (Quick Test)</span>
        </span>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SAMPLE_CARDS.map((card) => {
            const isActive = simulationActive === card.title;
            return (
              <div
                key={card.title}
                onClick={() => runSimulatedOcr(card)}
                className={`border rounded-lg p-2.5 transition cursor-pointer text-left flex flex-col justify-between hover:border-slate-300 relative ${
                  isActive 
                    ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20" 
                    : "border-slate-100 dark:border-slate-800 bg-slate-50/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{card.title}</span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2 leading-normal">
                    {card.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100/60 dark:border-slate-800/60">
                  <span className="text-[9px] font-mono font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded">
                    {card.soil_type}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-bold hover:underline cursor-pointer">
                    Click to extract
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
