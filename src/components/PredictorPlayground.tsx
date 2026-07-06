import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Sprout, ArrowRight, Gauge, Bot, ShieldCheck, 
  MapPin, Upload, CloudSun, DollarSign, Droplet, ChevronRight, 
  Activity, HelpCircle, FileText, Info, Loader2, AlertCircle,
  Coins, TrendingUp, Volume2, VolumeX, Printer
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell
} from "recharts";
import { PredictionResult } from "../types";
import { jsPDF } from "jspdf";
import ShapWaterfall from "./ShapWaterfall";
import UploadSoilCard from "./UploadSoilCard";
import { useLanguage, CROP_TRANSLATIONS, SOIL_TYPE_TRANSLATIONS } from "../translations";
import { buildApiUrl } from "../api";

const CROP_METRICS: Record<string, any> = {
  "Rice": { yieldMin: 3.5, yieldMax: 5.5, waterReq: 1400, pricePerTonne: 21000, costPerHa: 35000, irrMethod: "Canal Flood", freq: "Keep flooded or water every 4-5 days" },
  "Wheat": { yieldMin: 3.0, yieldMax: 4.5, waterReq: 550, pricePerTonne: 22500, costPerHa: 25000, irrMethod: "Sprinkler Irrigation", freq: "Every 10-12 days (critical growth stages)" },
  "Cotton": { yieldMin: 1.5, yieldMax: 2.5, waterReq: 800, pricePerTonne: 60000, costPerHa: 40000, irrMethod: "Drip Irrigation", freq: "Every 7-9 days" },
  "Maize": { yieldMin: 4.0, yieldMax: 6.0, waterReq: 600, pricePerTonne: 19500, costPerHa: 28000, irrMethod: "Sprinkler Irrigation", freq: "Every 8-10 days" },
  "Chickpea": { yieldMin: 1.2, yieldMax: 2.2, waterReq: 300, pricePerTonne: 48000, costPerHa: 18000, irrMethod: "Drip or Sprinkler", freq: "Every 14-16 days (sparingly)" },
  "Coffee": { yieldMin: 0.8, yieldMax: 1.5, waterReq: 1600, pricePerTonne: 180000, costPerHa: 90000, irrMethod: "Micro-sprinkler", freq: "Weekly during dry periods" },
  "Groundnut": { yieldMin: 1.8, yieldMax: 2.8, waterReq: 580, pricePerTonne: 55000, costPerHa: 22000, irrMethod: "Sprinkler Irrigation", freq: "Every 9-11 days" },
  "Sugarcane": { yieldMin: 65.0, yieldMax: 85.0, waterReq: 2000, pricePerTonne: 3150, costPerHa: 85000, irrMethod: "Drip Irrigation", freq: "Every 5-7 days (high frequency)" }
};

const HISTORICAL_CROP_PRICES: Record<string, { year: string; price: number }[]> = {
  "Rice": [
    { year: "2022", price: 18500 },
    { year: "2023", price: 19200 },
    { year: "2024", price: 20000 },
    { year: "2025", price: 20600 },
    { year: "2026", price: 21000 }
  ],
  "Wheat": [
    { year: "2022", price: 20150 },
    { year: "2023", price: 21250 },
    { year: "2024", price: 21750 },
    { year: "2025", price: 22100 },
    { year: "2026", price: 22500 }
  ],
  "Cotton": [
    { year: "2022", price: 54000 },
    { year: "2023", price: 55500 },
    { year: "2024", price: 57200 },
    { year: "2025", price: 58800 },
    { year: "2026", price: 60000 }
  ],
  "Maize": [
    { year: "2022", price: 17000 },
    { year: "2023", price: 17600 },
    { year: "2024", price: 18200 },
    { year: "2025", price: 19000 },
    { year: "2026", price: 19500 }
  ],
  "Chickpea": [
    { year: "2022", price: 43000 },
    { year: "2023", price: 44800 },
    { year: "2024", price: 46200 },
    { year: "2025", price: 47000 },
    { year: "2026", price: 48000 }
  ],
  "Coffee": [
    { year: "2022", price: 155000 },
    { year: "2023", price: 162000 },
    { year: "2024", price: 168000 },
    { year: "2025", price: 174000 },
    { year: "2026", price: 180000 }
  ],
  "Groundnut": [
    { year: "2022", price: 49000 },
    { year: "2023", price: 51200 },
    { year: "2024", price: 52800 },
    { year: "2025", price: 54000 },
    { year: "2026", price: 55000 }
  ],
  "Sugarcane": [
    { year: "2022", price: 2820 },
    { year: "2023", price: 2950 },
    { year: "2024", price: 3050 },
    { year: "2025", price: 3100 },
    { year: "2026", price: 3150 }
  ]
};

// Dynamic Agronomic Sowing Templates
const PROFILES = [
  {
    name: "Heavy Rain (Kharif Rice Profile)",
    data: { nitrogen: 85, phosphorus: 45, potassium: 40, ph: 6.2, moisture: 85, soil_type: "Clayey", temperature: 26.5, humidity: 82.0, rainfall: 185.0 }
  },
  {
    name: "Arid & Cool (Rabi Chickpea Profile)",
    data: { nitrogen: 30, phosphorus: 65, potassium: 60, ph: 7.0, moisture: 20, soil_type: "Sandy", temperature: 16.0, humidity: 40.0, rainfall: 42.0 }
  },
  {
    name: "Tropical High-K (Annual Coffee Profile)",
    data: { nitrogen: 100, phosphorus: 25, potassium: 120, ph: 5.8, moisture: 75, soil_type: "Laterite", temperature: 22.0, humidity: 75.0, rainfall: 162.0 }
  },
  {
    name: "Warm Cotton (Kharif Black Soil Profile)",
    data: { nitrogen: 110, phosphorus: 35, potassium: 50, ph: 7.2, moisture: 30, soil_type: "Black", temperature: 32.0, humidity: 65.0, rainfall: 88.0 }
  },
  {
    name: "Cool Autumn (Rabi Wheat Profile)",
    data: { nitrogen: 65, phosphorus: 55, potassium: 35, ph: 6.5, moisture: 45, soil_type: "Alluvial", temperature: 18.0, humidity: 55.0, rainfall: 72.0 }
  }
];

const PROFILE_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "Heavy Rain (Kharif Rice Profile)": "Heavy Rain (Kharif Rice Profile)",
    "Arid & Cool (Rabi Chickpea Profile)": "Arid & Cool (Rabi Chickpea Profile)",
    "Tropical High-K (Annual Coffee Profile)": "Tropical High-K (Annual Coffee Profile)",
    "Warm Cotton (Kharif Black Soil Profile)": "Warm Cotton (Kharif Black Soil Profile)",
    "Cool Autumn (Rabi Wheat Profile)": "Cool Autumn (Rabi Wheat Profile)"
  },
  te: {
    "Heavy Rain (Kharif Rice Profile)": "భారీ వర్షం (ఖరీఫ్ వరి ప్రొఫైల్)",
    "Arid & Cool (Rabi Chickpea Profile)": "శుష్క & చల్లని (రబీ శనగల ప్రొఫైల్)",
    "Tropical High-K (Annual Coffee Profile)": "ఉష్ణమండల అధిక-పొటాషియం (వార్షిక కాఫీ ప్రొఫైల్)",
    "Warm Cotton (Kharif Black Soil Profile)": "వెచ్చని పత్తి (ఖరీఫ్ నల్ల నేల ప్రొఫైల్)",
    "Cool Autumn (Rabi Wheat Profile)": "చల్లని శరదృతువు (రబీ గోధుమ ప్రొఫైల్)"
  },
  hi: {
    "Heavy Rain (Kharif Rice Profile)": "भारी वर्षा (खरीफ धान प्रोफाइल)",
    "Arid & Cool (Rabi Chickpea Profile)": "शुष्क और ठंडा (रबी चना प्रोफाइल)",
    "Tropical High-K (Annual Coffee Profile)": "उष्णकटिबंधीय उच्च-पोटेशियम (वार्षिक कॉफी प्रोफाइल)",
    "Warm Cotton (Kharif Black Soil Profile)": "गर्म कपास (खरीफ काली मिट्टी प्रोफाइल)",
    "Cool Autumn (Rabi Wheat Profile)": "ठंडी शरद ऋतु (रबी गेहूं प्रोफाइल)"
  }
};

const REGIONAL_COORDINATES: Record<string, Record<string, { lat: number, lon: number }>> = {
  "Maharashtra": {
    "Pune": { lat: 18.5204, lon: 73.8567 },
    "Nashik": { lat: 19.9975, lon: 73.7898 },
    "Nagpur": { lat: 21.1458, lon: 79.0882 },
    "Aurangabad": { lat: 19.8762, lon: 75.3433 },
    "Kolhapur": { lat: 16.7050, lon: 74.2433 },
    "Solapur": { lat: 17.6599, lon: 75.9064 }
  },
  "Punjab": {
    "Ludhiana": { lat: 30.9010, lon: 75.8573 },
    "Amritsar": { lat: 31.6340, lon: 74.8723 },
    "Patiala": { lat: 30.3398, lon: 76.3869 },
    "Jalandhar": { lat: 31.3260, lon: 75.5762 },
    "Bathinda": { lat: 30.2110, lon: 74.9455 }
  },
  "Karnataka": {
    "Bangalore Rural": { lat: 13.2172, lon: 77.5681 },
    "Dharwad": { lat: 15.4589, lon: 74.9808 },
    "Mysore": { lat: 12.2958, lon: 76.6394 },
    "Belgaum": { lat: 15.8497, lon: 74.4977 },
    "Shimoga": { lat: 13.9299, lon: 75.5681 },
    "Gulbarga": { lat: 17.3297, lon: 76.8343 }
  },
  "Tamil Nadu": {
    "Coimbatore": { lat: 11.0168, lon: 76.9558 },
    "Thanjavur": { lat: 10.7870, lon: 79.1378 },
    "Madurai": { lat: 9.9252, lon: 78.1198 },
    "Trichy": { lat: 10.7905, lon: 78.7047 },
    "Salem": { lat: 11.6643, lon: 78.1460 },
    "Vellore": { lat: 12.9165, lon: 79.1325 }
  },
  "Uttar Pradesh": {
    "Meerut": { lat: 28.9845, lon: 77.7064 },
    "Varanasi": { lat: 25.3176, lon: 82.9739 },
    "Bareilly": { lat: 28.3640, lon: 79.4150 },
    "Lucknow": { lat: 26.8467, lon: 80.9462 },
    "Kanpur": { lat: 26.4499, lon: 80.3319 },
    "Prayagraj": { lat: 25.4358, lon: 81.8463 },
    "Gorakhpur": { lat: 26.7606, lon: 83.3731 }
  },
  "Gujarat": {
    "Rajkot": { lat: 22.3039, lon: 70.8022 },
    "Anand": { lat: 22.5645, lon: 72.9289 },
    "Surat": { lat: 21.1702, lon: 72.8311 },
    "Ahmedabad": { lat: 23.0225, lon: 72.5714 },
    "Vadodara": { lat: 22.3072, lon: 73.1812 },
    "Bhavnagar": { lat: 21.7645, lon: 72.1519 }
  },
  "Andhra Pradesh": {
    "Guntur": { lat: 16.3067, lon: 80.4365 },
    "Visakhapatnam": { lat: 17.6868, lon: 83.2185 },
    "Kurnool": { lat: 15.8281, lon: 78.0373 },
    "Vijayawada": { lat: 16.5062, lon: 80.6480 },
    "Nellore": { lat: 14.4426, lon: 79.9865 },
    "Tirupati": { lat: 13.6288, lon: 79.4192 }
  },
  "Rajasthan": {
    "Jaipur": { lat: 26.9124, lon: 75.7873 },
    "Udaipur": { lat: 24.5854, lon: 73.7125 },
    "Jodhpur": { lat: 26.2389, lon: 73.0243 },
    "Kota": { lat: 25.1825, lon: 75.8262 },
    "Bikaner": { lat: 28.0194, lon: 73.3115 },
    "Ajmer": { lat: 26.4498, lon: 74.6398 }
  },
  "Madhya Pradesh": {
    "Bhopal": { lat: 23.2599, lon: 77.4126 },
    "Indore": { lat: 22.7196, lon: 75.8577 },
    "Gwalior": { lat: 26.2183, lon: 78.1828 },
    "Jabalpur": { lat: 23.1815, lon: 79.9864 },
    "Ujjain": { lat: 23.1760, lon: 75.7885 },
    "Rewa": { lat: 24.5362, lon: 81.3037 }
  },
  "West Bengal": {
    "Kolkata": { lat: 22.5726, lon: 88.3639 },
    "Darjeeling": { lat: 27.0410, lon: 88.2627 },
    "Hooghly": { lat: 22.9015, lon: 88.3908 },
    "Asansol": { lat: 23.6739, lon: 86.9524 },
    "Siliguri": { lat: 26.7271, lon: 88.3953 },
    "Medinipur": { lat: 22.4257, lon: 87.3199 }
  },
  "Haryana": {
    "Karnal": { lat: 29.6857, lon: 76.9907 },
    "Hisar": { lat: 29.1492, lon: 75.7217 },
    "Rohtak": { lat: 28.8955, lon: 76.6066 },
    "Gurugram": { lat: 28.4595, lon: 77.0266 },
    "Ambala": { lat: 30.3782, lon: 76.7767 },
    "Panipat": { lat: 29.3909, lon: 76.9635 }
  },
  "Bihar": {
    "Patna": { lat: 25.5941, lon: 85.1376 },
    "Gaya": { lat: 24.7914, lon: 85.0002 },
    "Muzaffarpur": { lat: 26.1197, lon: 85.3910 },
    "Bhagalpur": { lat: 25.2425, lon: 86.9842 },
    "Darbhanga": { lat: 26.1122, lon: 85.8954 },
    "Purnia": { lat: 25.7771, lon: 87.4753 }
  },
  "Kerala": {
    "Wayanad": { lat: 11.6854, lon: 76.1320 },
    "Palakkad": { lat: 10.7867, lon: 76.6547 },
    "Idukki": { lat: 9.9189, lon: 77.1025 },
    "Thiruvananthapuram": { lat: 8.5241, lon: 76.9366 },
    "Kozhikode": { lat: 11.2588, lon: 75.7804 },
    "Ernakulam": { lat: 9.9816, lon: 76.2998 }
  },
  "Telangana": {
    "Hyderabad": { lat: 17.3850, lon: 78.4867 },
    "Warangal": { lat: 17.9689, lon: 79.5941 },
    "Nizamabad": { lat: 18.6725, lon: 78.0941 },
    "Karimnagar": { lat: 18.4386, lon: 79.1288 },
    "Khammam": { lat: 17.2473, lon: 80.1514 }
  },
  "Odisha": {
    "Bhubaneswar": { lat: 20.2961, lon: 85.8245 },
    "Cuttack": { lat: 20.4625, lon: 85.8830 },
    "Rourkela": { lat: 22.2604, lon: 84.8536 },
    "Sambalpur": { lat: 21.4669, lon: 83.9812 },
    "Balasore": { lat: 21.4934, lon: 86.9337 },
    "Ganjam": { lat: 19.3805, lon: 85.0674 }
  },
  "Assam": {
    "Guwahati": { lat: 26.1445, lon: 91.7362 },
    "Dibrugarh": { lat: 27.4728, lon: 94.9120 },
    "Jorhat": { lat: 26.7509, lon: 94.2037 },
    "Silchar": { lat: 24.8333, lon: 92.7789 },
    "Tezpur": { lat: 26.6338, lon: 92.7926 },
    "Nagaon": { lat: 26.3483, lon: 92.6838 }
  },
  "Himachal Pradesh": {
    "Shimla": { lat: 31.1048, lon: 77.1734 },
    "Solan": { lat: 30.9045, lon: 77.0967 },
    "Dharamshala": { lat: 32.2190, lon: 76.3234 },
    "Mandi": { lat: 31.5892, lon: 76.9182 },
    "Kullu": { lat: 31.9578, lon: 77.1095 },
    "Chamba": { lat: 32.5534, lon: 76.1258 }
  },
  "Chhattisgarh": {
    "Raipur": { lat: 21.2514, lon: 81.6296 },
    "Bilaspur": { lat: 22.0797, lon: 82.1391 },
    "Durg": { lat: 21.1904, lon: 81.2849 },
    "Bastar": { lat: 19.2156, lon: 81.8661 },
    "Ambikapur": { lat: 23.1213, lon: 83.1950 },
    "Korba": { lat: 22.3595, lon: 82.7501 }
  },
  "Jharkhand": {
    "Ranchi": { lat: 23.3441, lon: 85.3096 },
    "Jamshedpur": { lat: 22.8046, lon: 86.2029 },
    "Dhanbad": { lat: 23.7957, lon: 86.4304 },
    "Bokaro": { lat: 23.6693, lon: 86.1511 },
    "Hazaribagh": { lat: 23.9979, lon: 85.3642 },
    "Deoghar": { lat: 24.4819, lon: 86.6976 }
  },
  "Uttarakhand": {
    "Dehradun": { lat: 30.3165, lon: 78.0322 },
    "Haridwar": { lat: 29.9457, lon: 78.1642 },
    "Nainital": { lat: 29.3803, lon: 79.4630 },
    "Almora": { lat: 29.5892, lon: 79.6467 },
    "Roorkee": { lat: 29.8543, lon: 77.8880 },
    "Haldwani": { lat: 29.2183, lon: 79.5126 }
  }
};

export default function PredictorPlayground() {
  const { t, language } = useLanguage();
  const [form, setForm] = useState({
    nitrogen: 80,
    phosphorus: 45,
    potassium: 40,
    ph: 6.5,
    moisture: 50,
    soil_type: "Clayey",
    temperature: 25.0,
    humidity: 70.0,
    rainfall: 100.0,
  });

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [village, setVillage] = useState("");

  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherMessage, setWeatherMessage] = useState("");
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"advisory" | "economic" | "nutrients" | "water" | "attribution">("advisory");
  const [hectares, setHectares] = useState<number>(1);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const stopSpeakingAdvisory = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const speakAdvisory = (text: string) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel();

    // Remove markdown formatting to sound natural
    const cleanText = text
      .replace(/\*+/g, "")
      .replace(/#+/g, "")
      .replace(/- /g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = synthRef.current.getVoices();
    let voiceLang = "en-US";
    if (language === "te") voiceLang = "te-IN";
    else if (language === "hi") voiceLang = "hi-IN";

    // Try finding the best voice for the chosen language
    const matchedVoice = voices.find(v => 
      v.lang.toLowerCase().includes(voiceLang.toLowerCase()) || 
      v.lang.toLowerCase().startsWith(voiceLang.split("-")[0])
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    utterance.lang = voiceLang;
    utterance.rate = 0.95;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      // Silence expected interrupted/canceled SpeechSynthesis callbacks
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.warn("SpeechSynthesis warning/error:", e.error);
      }
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  };

  const exportReportToPdf = () => {
    if (!result) return;

    // Retrieve localized labels
    const rTitle = t.reportTitle || "Soil Lab & Crop Advisory Report";
    const rLabReport = t.labAdvisoryReport || "KISAN-AI DIGITAL SOIL LABORATORY";
    const rFarmLocation = t.farmLocation || "Farm Location";
    const rTestDate = t.testDate || "Analysis Date";
    const rChemicalProperties = t.chemicalProperties || "Soil Chemistry & Micro-climate";
    const rRecConfidence = t.recommendationConfidence || "Recommendation Confidence";
    const rAgronomicAdvisory = t.agronomicAdvisory || "Agronomist Advisory Insights";
    const rActionableRecs = t.actionableFertilizerRecs || "Actionable Nutrient Adjustments";
    const rFinancialForecast = t.financialAndYieldForecast || "Hectare Yield & Economic Projection";
    const rFertilizerType = t.fertilizerType || "Fertilizer / Nutrient";
    const rDosage = t.dosageKgHa || "Dosage (kg/Ha)";
    const rTiming = t.applicationTiming || "Application Schedule";

    const formattedDate = new Date().toLocaleDateString(
      language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : "en-IN",
      { year: "numeric", month: "long", day: "numeric" }
    );

    const diagnosticId = `KAI-SL-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const cropNameTranslated = CROP_TRANSLATIONS[language]?.[result.recommended_crop] || result.recommended_crop;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Color definitions
    const primaryColor = [16, 124, 65]; // #107c41 (Emerald Green)
    const slateDark = [30, 41, 59]; // #1e293b
    const slateLight = [100, 116, 139]; // #64748b
    const borderGray = [226, 232, 240]; // #e2e8f0

    let y = 15;

    // Helper: Draw header border/background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, y, 180, 20, "F");

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KISAN-AI DIGITAL SOIL LABORATORY", 20, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("AGROTECH PRECISION CROP ADVISORY & DECISION SUPPORT", 20, y + 13);

    // Diagnostic meta info inside header (right-aligned)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`ID: ${diagnosticId}`, 190, y + 8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`${rTestDate}: ${formattedDate}`, 190, y + 13, { align: "right" });

    y += 26;

    // Grid row: Logistics vs parameters
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, y, 87, 30, "F");
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.rect(15, y, 87, 30, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(rFarmLocation.toUpperCase(), 19, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`State / Region: ${selectedState || "Maharashtra"}`, 19, y + 12);
    doc.text(`District: ${selectedDistrict || "Pune"}`, 19, y + 17);
    doc.text(`Village / Farm Name: ${village || "Rural Farm"}`, 19, y + 22);
    doc.text(`Cultivated Area: ${hectares} Ha`, 19, y + 27);

    // Right Box: Chemical Properties
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(108, y, 87, 30, "F");
    doc.rect(108, y, 87, 30, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(rChemicalProperties.toUpperCase(), 112, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`Nitrogen (N): ${form.nitrogen} kg/Ha`, 112, y + 12);
    doc.text(`Phosphorus (P): ${form.phosphorus} kg/Ha`, 112, y + 17);
    doc.text(`Potassium (K): ${form.potassium} kg/Ha`, 112, y + 22);
    const soilTypeLabel = SOIL_TYPE_TRANSLATIONS[language]?.[form.soil_type] || form.soil_type;
    doc.text(`pH: ${form.ph}  |  Moisture: ${form.moisture}% (${soilTypeLabel})`, 112, y + 27);

    y += 36;

    // Recommendation Banner (A nice highlight box)
    doc.setFillColor(240, 253, 244); // green-50
    doc.rect(15, y, 180, 20, "F");
    doc.setDrawColor(134, 239, 172); // green-300
    doc.rect(15, y, 180, 20, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text("OPTIMAL RECOMMENDED CROP CHOICE", 20, y + 6);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(cropNameTranslated.toUpperCase(), 20, y + 14);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${rRecConfidence}: ${Math.round(result.confidence_score * 100)}%`, 140, y + 11);

    y += 26;

    // Nutrient Recommendations Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(rActionableRecs.toUpperCase(), 15, y);
    y += 3;

    // Draw table header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(15, y, 180, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(rFertilizerType.toUpperCase(), 19, y + 5);
    doc.text(rDosage.toUpperCase(), 90, y + 5);
    doc.text(rTiming.toUpperCase(), 135, y + 5);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    const recs = result.fertilizer_module?.recommendations || [];
    if (recs.length === 0) {
      doc.text("No fertilizer recommendations needed.", 20, y + 5);
      y += 8;
    } else {
      recs.forEach((rec, idx) => {
        // Stripe rows
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 7, "F");
        }
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.line(15, y + 7, 195, y + 7);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text(rec.name, 19, y + 5);

        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`${rec.amount_kg_ha} kg/Ha`, 90, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
        doc.text(rec.timing, 135, y + 5);
        y += 7;
      });
    }

    y += 6;

    // Financial Projections
    if (result.yield_module && result.profit_module) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(rFinancialForecast.toUpperCase(), 15, y);
      y += 3;

      // Card layout for financials
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 25, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, y, 180, 25, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
      
      doc.text("Expected Yield:", 19, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(`${(result.yield_module.expected_yield * hectares).toFixed(2)} Tonnes (@${result.yield_module.expected_yield} t/Ha)`, 55, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
      doc.text("Market price (per Tonne):", 19, y + 12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(`₹${result.profit_module.market_price_per_tonne.toLocaleString()}`, 55, y + 12);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
      doc.text("Gross Revenue:", 19, y + 18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(`₹${(result.profit_module.revenue_per_ha * hectares).toLocaleString()}`, 55, y + 18);

      // Cost & profit on the right side
      doc.setFont("helvetica", "normal");
      doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
      doc.text("Estimated Cost:", 110, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28); // red-700
      doc.text(`₹${(result.profit_module.cultivation_cost_per_ha * hectares).toLocaleString()}`, 150, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
      doc.text("Expected Net Profit:", 110, y + 12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52); // green-800
      doc.setFontSize(9.5);
      doc.text(`₹${((result.profit_module.revenue_per_ha - result.profit_module.cultivation_cost_per_ha) * hectares).toLocaleString()}`, 150, y + 12);

      y += 31;
    }

    // Agronomic Advisory
    if (y > 230) {
      doc.addPage();
      y = 15;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(rAgronomicAdvisory.toUpperCase(), 15, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

    const advisoryParas = result.advisory.split("\n\n");
    for (const para of advisoryParas) {
      if (!para.trim()) continue;
      // Wrap paragraphs safely
      const cleanPara = para.replace(/\*+/g, "").replace(/#+/g, "").replace(/- /g, "• ").trim();
      const lines = doc.splitTextToSize(cleanPara, 180);
      const neededHeight = lines.length * 4.2;

      if (y + neededHeight > 275) {
        doc.addPage();
        y = 15;
      }

      for (const line of lines) {
        doc.text(line, 15, y);
        y += 4;
      }
      y += 2.5; // spacing between paragraphs
    }

    // Standard footer on page (at the bottom)
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, 282, 195, 282);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
      doc.text(
        "KISAN-AI Agronomist Precision Advisory © 2026. This is a deep-learning aided advisory certificate. Recommendations are calculated based on soil chemistry models.",
        15,
        286
      );
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pageCount}`, 190, 286, { align: "right" });
    }

    doc.save(`AgroTech_Advisory_Report_${result.recommended_crop}.pdf`);
  };

  const handleInputChange = (field: string, val: string | number) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleLoadProfile = (profileIdx: number) => {
    const profile = PROFILES[profileIdx];
    if (profile) {
      setForm(profile.data);
    }
  };

  const fetchWeatherForLocation = async (state: string, district: string) => {
  const coords = REGIONAL_COORDINATES[state]?.[district];
  if (!coords) return;

  try {
    setWeatherLoading(true);
    setWeatherMessage("Accessing meteorology logs...");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,rain&timezone=auto`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("Weather API request failed");
    }

    const apiData = await res.json();

    if (!apiData.current) {
      throw new Error("Invalid weather response");
    }

    const data = {
      success: true,
      temperature: Math.round(apiData.current.temperature_2m * 10) / 10,
      humidity: Math.round(apiData.current.relative_humidity_2m),
      rain: apiData.current.rain > 0
        ? Math.round(apiData.current.rain * 100)
        : 95.0
    };

    setForm(prev => ({
      ...prev,
      temperature: data.temperature,
      humidity: data.humidity,
      rainfall: data.rain
    }));

    setWeatherMessage(
      `Live Weather Auto-Filled! Temp: ${data.temperature}°C, Humid: ${data.humidity}%, Rain: ${data.rain} mm.`
    );

  } catch (err) {
    console.error(err);
    setWeatherMessage("Meteorological service connection error.");
  } finally {
    setWeatherLoading(false);
  }
};
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedDistrict("");
    setWeatherMessage("");
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    if (selectedState && district) {
      fetchWeatherForLocation(selectedState, district);
    }
  };

  const handleSoilCardExtracted = (ext: { nitrogen: number, phosphorus: number, potassium: number, ph: number, moisture?: number, soil_type?: string }) => {
    setForm(prev => ({
      ...prev,
      nitrogen: ext.nitrogen,
      phosphorus: ext.phosphorus,
      potassium: ext.potassium,
      ph: ext.ph,
      moisture: ext.moisture !== undefined ? ext.moisture : prev.moisture,
      soil_type: ext.soil_type || prev.soil_type
    }));
  };

  const triggerPrediction = async (customLang?: string) => {
    try {
      setLoading(true);
      stopSpeakingAdvisory();
      const activeLang = typeof customLang === "string" ? customLang : language;
      const res = await fetch(buildApiUrl("/predict"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          state: selectedState || "Maharashtra",
          district: selectedDistrict || "Pune",
          village: village || "Rural Farm",
          lang: activeLang
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Prediction API Error", res.status, errorText);
        const message = errorText || res.statusText || `HTTP ${res.status}`;
        throw new Error(message);
      }

      const data = await res.json();
      if (data.success) {
        setResult(data);
        setPredictionError(null);
      } else {
        const message = data.error || data.message || "Prediction failed with no details.";
        console.error("Prediction API returned an error response", message);
        setPredictionError(message);
        throw new Error(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to run ML prediction:", message);
      setPredictionError(message);
    } finally {
      setLoading(false);
    }
  };

  // Re-trigger prediction when language changes so that dynamic AI advisory is translated
  useEffect(() => {
    if (result) {
      stopSpeakingAdvisory();
      triggerPrediction(language);
    }
  }, [language]);

  const formatLIMEImpact = (val: number) => {
    if (val > 0) return `+${(val * 100).toFixed(0)}% (Positive)`;
    return `${(val * 100).toFixed(0)}% (Deficit)`;
  };

  return (
    <div id="playground-viewport" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Parameter Controls Column (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        
        {/* Soil Health Card OCR Portal */}
        <UploadSoilCard onExtracted={handleSoilCardExtracted} />

        {/* Geographical Location Selector */}
        <div id="location-select-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <span>{t.geographicSowingProfile}</span>
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">{t.state}</label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-sm font-semibold focus:outline-none"
              >
                <option value="">Select {t.state}</option>
                {Object.keys(REGIONAL_COORDINATES).map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-slate-500 font-bold mb-1">{t.district}</label>
              <select
                value={selectedDistrict}
                disabled={!selectedState}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-sm font-semibold focus:outline-none disabled:opacity-50"
              >
                <option value="">Select {t.district}</option>
                {selectedState && Object.keys(REGIONAL_COORDINATES[selectedState]).map(dst => (
                  <option key={dst} value={dst}>{dst}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-500 font-bold mb-1">Village (Optional)</label>
            <input
              type="text"
              placeholder="Enter Village Name"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {weatherMessage && (
            <div className="flex items-start gap-1.5 p-2 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 rounded text-[10px] font-semibold">
              <CloudSun className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{weatherLoading ? "Querying..." : weatherMessage}</span>
            </div>
          )}
        </div>

        {/* Input Parameters Box */}
        <div id="agronomic-parameters-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-xs">
              <Sprout className="h-4 w-4 text-emerald-500" />
              <span>{t.soilMacroNutrients}</span>
            </h3>
            
            <select
              onChange={(e) => {
                if (e.target.value !== "") {
                  handleLoadProfile(Number(e.target.value));
                }
              }}
              defaultValue=""
              className="text-[10px] font-semibold bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded text-slate-700 cursor-pointer outline-none"
            >
              <option value="">{language === "te" ? "ప్రిసెట్లు" : language === "hi" ? "प्रीसेट्स" : "Presets"}</option>
              {PROFILES.map((p, idx) => (
                <option key={idx} value={idx}>
                  {PROFILE_TRANSLATIONS[language]?.[p.name] || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Input sliders and controls */}
          <div className="space-y-4 text-xs">
            {/* Soil NPK */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 font-bold mb-1">{t.nitrogen}</label>
                <input
                  type="number"
                  min={5} max={150}
                  value={form.nitrogen}
                  onChange={(e) => handleInputChange("nitrogen", Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-center text-sm font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[9px] text-slate-400 block text-center mt-0.5">5-150 mg/kg</span>
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">{t.phosphorus}</label>
                <input
                  type="number"
                  min={5} max={100}
                  value={form.phosphorus}
                  onChange={(e) => handleInputChange("phosphorus", Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-center text-sm font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[9px] text-slate-400 block text-center mt-0.5">5-100 mg/kg</span>
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">{t.potassium}</label>
                <input
                  type="number"
                  min={5} max={150}
                  value={form.potassium}
                  onChange={(e) => handleInputChange("potassium", Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-center text-sm font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[9px] text-slate-400 block text-center mt-0.5">5-150 mg/kg</span>
              </div>
            </div>

            {/* Soil pH & Moisture */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500 font-bold">{t.soilPh}</span>
                  <span className="font-semibold text-slate-800">{form.ph.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={4.0} max={9.5} step={0.1}
                  value={form.ph}
                  onChange={(e) => handleInputChange("ph", Number(e.target.value))}
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500 font-bold">{t.moistureRatio}</span>
                  <span className="font-semibold text-slate-800">{form.moisture}%</span>
                </div>
                <input
                  type="range"
                  min={5} max={100}
                  value={form.moisture}
                  onChange={(e) => handleInputChange("moisture", Number(e.target.value))}
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Environmental parameters */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 font-bold mb-1">{t.temperature} (°C)</label>
                <input
                  type="number"
                  min={10} max={45} step={0.1}
                  value={form.temperature}
                  onChange={(e) => handleInputChange("temperature", Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-center text-sm font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">{t.humidity} (%)</label>
                <input
                  type="number"
                  min={15} max={100}
                  value={form.humidity}
                  onChange={(e) => handleInputChange("humidity", Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-center text-sm font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">{t.rainfall} (mm)</label>
                <input
                  type="number"
                  min={10} max={300}
                  value={form.rainfall}
                  onChange={(e) => handleInputChange("rainfall", Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-center text-sm font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Soil Type */}
            <div>
              <label className="block text-slate-500 font-bold mb-1">{t.soilType}</label>
              <div className="grid grid-cols-4 gap-2">
                {["Clayey", "Alluvial", "Black", "Sandy", "Laterite", "Red", "Loamy"].slice(0, 4).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleInputChange("soil_type", type)}
                    className={`py-1.5 px-1 rounded text-center font-semibold border text-[10px] transition cursor-pointer ${
                      form.soil_type === type
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-white dark:bg-slate-800 border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    {SOIL_TYPE_TRANSLATIONS[language][type] || type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prediction Trigger */}
          <button
            onClick={() => triggerPrediction()}
            disabled={loading}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-lg shadow-emerald-600/10 active:scale-98 cursor-pointer transition disabled:opacity-50 select-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>{t.predictingOptimalCrop}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 fill-white" />
                <span>{t.predictOptimalCrop}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {predictionError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <strong>Prediction Error:</strong> {predictionError}
            </div>
          )}
        </div>
      </div>

      {/* Results Panel (7 cols) */}
      <div id="results-viewport-column" className="lg:col-span-7 flex flex-col gap-6">
        {result ? (
          <div className="flex flex-col gap-6">
            
            {/* Recommendation Champion Banner */}
            <div id="recommendation-hero-banner" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="relative shrink-0 flex items-center justify-center h-24 w-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-4 border-emerald-500/20 shadow-inner">
                <div className="absolute inset-0 flex items-center justify-center font-black text-2xl tracking-tight text-emerald-600 dark:text-emerald-400 select-none">
                  {Math.round(result.confidence_score * 100)}%
                </div>
              </div>

              <div className="text-center sm:text-left flex-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                  {t.optimalRecommendedCrop}
                </span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {CROP_TRANSLATIONS[language]?.[result.recommended_crop] || result.recommended_crop}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5 select-none">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Validated via Random Forest, XGBoost & CatBoost model comparison.</span>
                </p>
              </div>

              <div className="flex w-full sm:w-auto shrink-0 select-none">
                <button
                  onClick={exportReportToPdf}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-800 dark:border-slate-700 hover:scale-102 transition shadow-md active:scale-98 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-emerald-400" />
                  <span>{t.exportReportPdf || "Export PDF Report"}</span>
                </button>
              </div>
            </div>

            {/* Decision Support Tab Switching Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "advisory", label: t.agronomicAdvisoryTab, icon: Bot },
                { id: "economic", label: t.yieldEconomicTab, icon: DollarSign },
                { id: "nutrients", label: t.nutrientOptimizationTab, icon: Sprout },
                { id: "water", label: t.waterIrrigationTab, icon: Droplet },
                { id: "attribution", label: t.modelExplanationTab, icon: Activity }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer whitespace-nowrap ${
                       active 
                         ? "border-emerald-600 text-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20" 
                         : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                     }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab: AI Agronomist Advisory */}
            {activeTab === "advisory" && (
              <div id="advisory-tab" className="bg-emerald-950/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-5 shadow-inner transition-opacity duration-300">
                <div className="flex items-center justify-between mb-3 select-none">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Bot className="h-4 w-4 animate-bounce text-emerald-500" />
                    <span>{t.agronomicAdvisoryTab}</span>
                  </h4>
                  
                  <button
                    onClick={() => isSpeaking ? stopSpeakingAdvisory() : speakAdvisory(result.advisory)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-300 border cursor-pointer ${
                      isSpeaking 
                        ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 animate-pulse scale-102" 
                        : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 hover:scale-102"
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="h-3.5 w-3.5" />
                        <span>{t.stopSpeaking}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>{t.speakExplanation}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
                  {result.advisory.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Yield & Economic Profit Estimation */}
            {activeTab === "economic" && result.yield_module && result.profit_module && (() => {
              const cropName = result.recommended_crop;
              const historicalData = HISTORICAL_CROP_PRICES[cropName] || [
                { year: "2022", price: Math.round(result.profit_module.market_price_per_tonne * 0.88) },
                { year: "2023", price: Math.round(result.profit_module.market_price_per_tonne * 0.92) },
                { year: "2024", price: Math.round(result.profit_module.market_price_per_tonne * 0.95) },
                { year: "2025", price: Math.round(result.profit_module.market_price_per_tonne * 0.98) },
                { year: "2026", price: result.profit_module.market_price_per_tonne }
              ];

              const topCropsProfitData = result.top_5_recommendations.map(rec => {
                const cropMetrics = CROP_METRICS[rec.crop] || { pricePerTonne: 20000, costPerHa: 30000, yieldMin: 3.0, yieldMax: 4.5 };
                const avgYield = (cropMetrics.yieldMin + cropMetrics.yieldMax) / 2;
                const rev = avgYield * cropMetrics.pricePerTonne;
                const cost = cropMetrics.costPerHa;
                const profit = Math.round(rev - cost);
                return {
                  crop: CROP_TRANSLATIONS[language]?.[rec.crop] || rec.crop,
                  cropRaw: rec.crop,
                  profit: profit,
                  probability: Math.round(rec.probability * 100)
                };
              });

              const totalYield = Number((result.yield_module.expected_yield * hectares).toFixed(2));
              const totalRevenue = Math.round(result.profit_module.revenue_per_ha * hectares);
              const totalCost = Math.round(result.profit_module.cultivation_cost_per_ha * hectares);
              const totalNetProfit = totalRevenue - totalCost;
              const netProfitMargin = ((result.profit_module.net_profit_per_ha / result.profit_module.revenue_per_ha) * 100).toFixed(1);

              return (
                <div id="economic-tab" className="space-y-6 animate-fadeIn">
                  
                  {/* Financial Overview Header */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                      <Coins className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.financialForecast}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        {t.dynamicEconomicProjections} <strong>{CROP_TRANSLATIONS[language]?.[cropName] || cropName}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Land Configurator Slider */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.cultivationArea}</span>
                      <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full font-black text-xs">
                        {hectares} {hectares === 1 ? t.hectare : t.hectares}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      step={1}
                      value={hectares}
                      onChange={(e) => setHectares(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold select-none">
                      <span>{t.smallholder}</span>
                      <span>{t.medium}</span>
                      <span>{t.largeEstate}</span>
                    </div>
                  </div>

                  {/* Real-time Dynamic Financial Ledger Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t.expectedYieldLabel}</span>
                      <div>
                        <h5 className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                          {totalYield} <span className="text-xs text-slate-500 font-medium">tonnes</span>
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-1">At {result.yield_module.expected_yield} t/ha rate</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t.grossRevenue}</span>
                      <div>
                        <h5 className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                          ₹{totalRevenue.toLocaleString()}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-1">₹{result.profit_module.market_price_per_tonne.toLocaleString()} / tonne rate</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t.cultivationCost}</span>
                      <div>
                        <h5 className="text-xl font-black text-rose-500 mt-1">
                          ₹{totalCost.toLocaleString()}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-1">Seed, NPK & labor overheads</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-emerald-500">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t.netProfit}</span>
                      <div>
                        <h5 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          ₹{totalNetProfit.toLocaleString()}
                        </h5>
                        <p className="text-[10px] text-emerald-600/80 font-bold mt-1">Margin: {netProfitMargin}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Profit Visual Distribution Stack Meter */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400">{t.costProfitDistribution}</span>
                      <span className="text-slate-400">{t.totalGross}: ₹{totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex font-sans">
                      <div 
                        style={{ width: `${100 - Number(netProfitMargin)}%` }} 
                        className="h-full bg-rose-500 flex items-center justify-center text-[9px] text-white font-bold transition-all"
                        title={`Cost: ₹${totalCost.toLocaleString()}`}
                      >
                        {100 - Number(netProfitMargin) > 20 && `Cost (${(100 - Number(netProfitMargin)).toFixed(0)}%)`}
                      </div>
                      <div 
                        style={{ width: `${netProfitMargin}%` }} 
                        className="h-full bg-emerald-500 flex items-center justify-center text-[9px] text-white font-bold transition-all"
                        title={`Profit: ₹${totalNetProfit.toLocaleString()}`}
                      >
                        {Number(netProfitMargin) > 20 && `Profit (${netProfitMargin}%)`}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold select-none pt-1">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-rose-500 rounded-full inline-block" /> {t.overheads}: ₹{totalCost.toLocaleString()}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-emerald-500 rounded-full inline-block" /> {t.netRetainedProfit}: ₹{totalNetProfit.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Recharts Analytics Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Historical Market Price Trend Chart */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span>{t.historicalMarketRate}</span>
                      </h5>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={historicalData}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                            <XAxis 
                              dataKey="year" 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                            />
                            <YAxis 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickFormatter={(v) => `₹${v/1000}k`}
                            />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-lg text-[11px] font-semibold text-slate-100">
                                      <p className="text-slate-400 font-bold mb-0.5">Year {label}</p>
                                      <p className="text-emerald-400">Rate: ₹{payload[0].value?.toLocaleString()} / t</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="price" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorPrice)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-3">
                        {t.historicalMarketDesc}
                      </p>
                    </div>

                    {/* 2. Top Recommended Crops Profit Comparison Chart */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-emerald-500" />
                        <span>{t.profitabilityRecommended}</span>
                      </h5>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={topCropsProfitData}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                            <XAxis 
                              dataKey="crop" 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                            />
                            <YAxis 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickFormatter={(v) => `₹${v/1000}k`}
                            />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-lg text-[11px] font-semibold text-slate-100">
                                      <p className="text-slate-200 font-bold mb-1">{label}</p>
                                      <p className="text-emerald-400">Net Profit: ₹{payload[0].value?.toLocaleString()} / ha</p>
                                      <p className="text-sky-400">Rec Confidence: {payload[0].payload.probability}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                              {topCropsProfitData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.cropRaw === cropName ? "#10b981" : "#94a3b8"} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-3">
                        {t.profitabilityRecommendedDesc}
                      </p>
                    </div>
                  </div>

                  {/* Local Price Reference Panel */}
                  <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 text-xs">
                    <h6 className="font-bold text-slate-700 dark:text-slate-300 mb-2">{t.localMarketIndexRates}</h6>
                    <p className="text-slate-500 leading-relaxed">
                      {t.localMarketDesc} <strong className="text-slate-700 dark:text-slate-300">₹{result.profit_module.market_price_per_tonne.toLocaleString()} / tonne</strong>.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Tab: Fertilizer Optimizer & Soil Deficiencies */}
            {activeTab === "nutrients" && result.fertilizer_module && (
              <div id="nutrients-tab" className="space-y-6 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detected Nutrient Deficiency (kg/hectare)</h5>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/40 p-3 rounded-lg">
                      <span className="text-slate-500 font-semibold text-[10px] block">Nitrogen (N)</span>
                      <strong className="text-rose-600 text-lg block font-black mt-1">-{result.fertilizer_module.deficiencies.nitrogen_deficit} kg/ha</strong>
                    </div>
                    <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/40 p-3 rounded-lg">
                      <span className="text-slate-500 font-semibold text-[10px] block">Phosphorus (P)</span>
                      <strong className="text-rose-600 text-lg block font-black mt-1">-{result.fertilizer_module.deficiencies.phosphorus_deficit} kg/ha</strong>
                    </div>
                    <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/40 p-3 rounded-lg">
                      <span className="text-slate-500 font-semibold text-[10px] block">Potassium (K)</span>
                      <strong className="text-rose-600 text-lg block font-black mt-1">-{result.fertilizer_module.deficiencies.potassium_deficit} kg/ha</strong>
                    </div>
                  </div>
                </div>

                {/* Specific Fertilizer Dosage Table */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Fertilizer Applications</h5>
                  <div className="space-y-3">
                    {result.fertilizer_module.recommendations.map((rec, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3.5">
                        <div className="shrink-0 h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 text-xs font-black">
                          {rec.amount_kg_ha} <span className="text-[8px] font-medium ml-0.5">kg</span>
                        </div>
                        <div className="text-xs">
                          <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">{rec.name}</strong>
                          <p className="text-slate-500 leading-relaxed">{rec.timing}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Precision Irrigation & Water Plan */}
            {activeTab === "water" && result.irrigation_module && (
              <div id="water-tab" className="space-y-6 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Water Balance Sheet (mm equivalent)</h5>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Total Crop Water demand</span>
                      <strong className="text-slate-800 dark:text-slate-200">{result.irrigation_module.water_requirement_mm} mm</strong>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Effective Rainfall Offset</span>
                      <strong className="text-emerald-600">-{result.irrigation_module.rainfall_effective_mm} mm</strong>
                    </div>
                    <div className="flex justify-between font-bold text-sm">
                      <span className="text-slate-700 dark:text-slate-300">Net Irrigation Deficit</span>
                      <strong className={result.irrigation_module.irrigation_deficit_mm > 0 ? "text-rose-500" : "text-emerald-600"}>
                        {result.irrigation_module.irrigation_deficit_mm} mm
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Irrigation System Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suggested Delivery Method</span>
                    <h5 className="text-lg font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Droplet className="h-4 w-4 text-sky-500" />
                      <span>{result.irrigation_module.recommended_method}</span>
                    </h5>
                    <p className="text-slate-500 leading-relaxed mt-1">
                      Minimizes evaporative losses and prevents localized soil salinity spikes.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sowing Irrigation Frequency</span>
                    <h5 className="text-lg font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CloudSun className="h-4 w-4 text-amber-500" />
                      <span>{result.irrigation_module.irrigation_frequency}</span>
                    </h5>
                    <p className="text-slate-500 leading-relaxed mt-1">
                      Increases soil capillary actions to assist root-to-nutrient absorption channels.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: attribution (SHAP & LIME charts) */}
            {activeTab === "attribution" && (
              <div id="attribution-tab" className="space-y-6 animate-fadeIn">
                {/* LIME Bar Chart attribution */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 select-none">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span>LIME Local Feature Attribution</span>
                  </h4>

                  <div className="space-y-3">
                    {result.lime_explanations.slice(0, 5).map((exp) => {
                      const isPositive = exp.impact >= 0;
                      return (
                        <div key={exp.feature} className="text-xs">
                          <div className="flex justify-between font-medium mb-1">
                            <span className="text-slate-600 dark:text-slate-400 font-bold">{exp.feature}</span>
                            <span className={isPositive ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                              {formatLIMEImpact(exp.impact)}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            {isPositive ? (
                              <>
                                <div className="w-1/2" />
                                <div 
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(50, exp.impact * 100)}%` }}
                                />
                              </>
                            ) : (
                              <>
                                <div className="w-1/2 flex justify-end">
                                  <div 
                                    className="h-full bg-rose-500 rounded-full"
                                    style={{ width: `${Math.min(50, Math.abs(exp.impact) * 100)}%` }}
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
                </div>

                {/* SHAP Waterfall Chart */}
                <ShapWaterfall 
                  shapValues={result.shap_values || []} 
                  shapBaseValue={result.shap_base_value || 0.125} 
                  confidenceScore={result.confidence_score} 
                  recommendedCrop={result.recommended_crop} 
                />
              </div>
            )}

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400 min-h-[400px] shadow-sm select-none">
            <Bot className="h-12 w-12 text-slate-300 dark:text-slate-700 stroke-[1.5] animate-bounce mb-3" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Awaiting Agricultural Parameters
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              Adjust the soil and climatic values on the left panel, upload a Soil Health Card, or choose a region above, then click "Predict Suitable Crop" to run the ML inference engine.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
