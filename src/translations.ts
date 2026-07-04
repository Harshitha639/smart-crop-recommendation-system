import { createContext, useContext, useState, ReactNode, createElement } from "react";

export type Language = "en" | "te" | "hi";

export const CROP_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    "Rice": "Rice",
    "Wheat": "Wheat",
    "Cotton": "Cotton",
    "Maize": "Maize",
    "Chickpea": "Chickpea",
    "Coffee": "Coffee",
    "Groundnut": "Groundnut",
    "Sugarcane": "Sugarcane"
  },
  te: {
    "Rice": "వరి",
    "Wheat": "గోధుమ",
    "Cotton": "ప్రత్తి",
    "Maize": "మొక్కజొన్న",
    "Chickpea": "శనగలు",
    "Coffee": "కాఫీ",
    "Groundnut": "వేరుశనగ",
    "Sugarcane": "చెరకు"
  },
  hi: {
    "Rice": "धान (चावल)",
    "Wheat": "गेहूं",
    "Cotton": "कपास",
    "Maize": "मक्का",
    "Chickpea": "चना",
    "Coffee": "कॉफ़ी",
    "Groundnut": "मूंगफली",
    "Sugarcane": "गन्ना"
  }
};

export const SOIL_TYPE_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    "Clayey": "Clayey",
    "Alluvial": "Alluvial",
    "Black": "Black",
    "Sandy": "Sandy",
    "Laterite": "Laterite",
    "Red": "Red",
    "Loamy": "Loamy"
  },
  te: {
    "Clayey": "బంకమట్టి నేల (Clayey)",
    "Alluvial": "ఒండ్రు నేల (Alluvial)",
    "Black": "నల్ల నేల (Black)",
    "Sandy": "ఇసుక నేల (Sandy)",
    "Laterite": "లేటరైట్ నేల (Laterite)",
    "Red": "ఎర్ర నేల (Red)",
    "Loamy": "లోమీ నేల (Loamy)"
  },
  hi: {
    "Clayey": "चिकनी मिट्टी (Clayey)",
    "Alluvial": "जलोढ़ मिट्टी (Alluvial)",
    "Black": "काली मिट्टी (Black)",
    "Sandy": "बलुई मिट्टी (Sandy)",
    "Laterite": "लेटराइट मिट्टी (Letarite)",
    "Red": "लाल मिट्टी (Red)",
    "Loamy": "दुमट मिट्टी (Loamy)"
  }
};

export interface Translations {
  appName: string;
  appSubtitle: string;
  pipelineTag: string;
  predictorTab: string;
  edaTab: string;
  trainingTab: string;
  codeTab: string;
  codebaseJsonBtn: string;
  packagingText: string;
  footerEngine: string;
  footerAccuracy: string;
  footerAlgorithms: string;
  footerRunCommand: string;

  // Playground labels
  soilMacroNutrients: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  soilParameters: string;
  soilPh: string;
  moistureRatio: string;
  soilType: string;
  geographicalParameters: string;
  state: string;
  district: string;
  crop: string;
  environmentalParameters: string;
  temperature: string;
  humidity: string;
  rainfall: string;
  predictOptimalCrop: string;
  resetParameters: string;
  predictingOptimalCrop: string;

  // Predictor results
  optimalRecommendedCrop: string;
  confidence: string;
  probability: string;
  topRecommendedCandidates: string;
  agronomicAdvisoryTab: string;
  yieldEconomicTab: string;
  nutrientOptimizationTab: string;
  waterIrrigationTab: string;
  modelExplanationTab: string;

  // Economics
  financialForecast: string;
  dynamicEconomicProjections: string;
  cultivationArea: string;
  expectedYieldLabel: string;
  grossRevenue: string;
  cultivationCost: string;
  netProfit: string;
  hectare: string;
  hectares: string;
  smallholder: string;
  medium: string;
  largeEstate: string;
  costProfitDistribution: string;
  totalGross: string;
  overheads: string;
  netRetainedProfit: string;
  historicalMarketRate: string;
  historicalMarketDesc: string;
  profitabilityRecommended: string;
  profitabilityRecommendedDesc: string;
  localMarketIndexRates: string;
  localMarketDesc: string;

  // Advisor items
  recommendedSowingSeason: string;
  suitabilityScore: string;
  geographicSowingProfile: string;
  autoFillSoilCard: string;
  uploadCustomCard: string;
  dragDropOrBrowse: string;
  supportedFormats: string;
  usePresetSoilCard: string;

  // Model training tab
  modelTrainingConsole: string;

  // Voice explanation
  speakExplanation: string;
  stopSpeaking: string;
  speakingState: string;

  // Export PDF Report keys
  exportReportPdf: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    appName: "AgroTech Precision",
    appSubtitle: "Smart Crop Recommendation Engine",
    pipelineTag: "ML Pipeline",
    predictorTab: "Predictor Playground",
    edaTab: "EDA & Benchmarks",
    trainingTab: "Model Training Console",
    codeTab: "Python Source Code",
    codebaseJsonBtn: "Codebase JSON",
    packagingText: "Packaging...",
    footerEngine: "Agronomic Engine v1.0.0",
    footerAccuracy: "Accuracy: 99.3%",
    footerAlgorithms: "12 Algorithms Benchmarked",
    footerRunCommand: "Run python train.py to execute locally",

    soilMacroNutrients: "Soil Macro-nutrients",
    nitrogen: "Nitrogen (N)",
    phosphorus: "Phosphorus (P)",
    potassium: "Potassium (K)",
    soilParameters: "Soil Parameters",
    soilPh: "Soil pH",
    moistureRatio: "Moisture Ratio",
    soilType: "Soil Type",
    geographicalParameters: "Geographical Parameters",
    state: "State",
    district: "District",
    crop: "Crop",
    environmentalParameters: "Environmental Parameters",
    temperature: "Temperature",
    humidity: "Humidity",
    rainfall: "Rainfall",
    predictOptimalCrop: "Predict Optimal Crop",
    resetParameters: "Reset Parameters",
    predictingOptimalCrop: "Predicting optimal crop...",

    optimalRecommendedCrop: "Optimal Recommended Crop",
    confidence: "Confidence Score",
    probability: "Probability",
    topRecommendedCandidates: "Top Recommended Crop Candidates",
    agronomicAdvisoryTab: "Agronomic Advisory",
    yieldEconomicTab: "Yield & Economic Forecast",
    nutrientOptimizationTab: "Nutrient Optimization",
    waterIrrigationTab: "Water & Irrigation Management",
    modelExplanationTab: "Model Explanation (SHAP)",

    financialForecast: "Financial Forecast & Market Analytics",
    dynamicEconomicProjections: "Dynamic economic projections calculated from multi-decade regional historical trends and yield models.",
    cultivationArea: "Cultivation Area (Farm Size)",
    expectedYieldLabel: "Expected Yield",
    grossRevenue: "Gross Revenue",
    cultivationCost: "Cultivation Cost",
    netProfit: "Net Profit",
    hectare: "Hectare",
    hectares: "Hectares",
    smallholder: "1 Ha (Smallholder)",
    medium: "12 Ha (Medium)",
    largeEstate: "25 Ha (Large Estate)",
    costProfitDistribution: "Estimated Cost-to-Profit Distribution",
    totalGross: "Total Gross",
    overheads: "Overheads",
    netRetainedProfit: "Net Retained Profit",
    historicalMarketRate: "5-Year Historical Market Rate (Per Tonne)",
    historicalMarketDesc: "Historical Minimum Support Price (MSP) and premium wholesale rate indexing. Year 2026 value is used for current projections.",
    profitabilityRecommended: "Profitability of Top Recommended Candidates",
    profitabilityRecommendedDesc: "Compares net profit margins (₹/ha) of the top recommended alternatives based on average regional yield metrics. Green indicates the optimal selection.",
    localMarketIndexRates: "Local Market Index Rates",
    localMarketDesc: "Calculated with the prevailing regional Minimum Support Price (MSP) rate. Actual market values may vary depending on grain purity, moisture density, and warehouse location.",

    recommendedSowingSeason: "Recommended Sowing Season",
    suitabilityScore: "Regional Suitability",
    geographicSowingProfile: "Geographic Sowing Profile",
    autoFillSoilCard: "Auto-Fill Soil Card",
    uploadCustomCard: "Upload Custom Card",
    dragDropOrBrowse: "Drag and drop your Soil Health Card PDF/Image, or browse",
    supportedFormats: "Supports PDF, JPEG, PNG scanned lab cards",
    usePresetSoilCard: "Use a preset Soil Card to test the recommendation engine instantly",

    modelTrainingConsole: "Model Training Console",
    speakExplanation: "Read Advisory aloud",
    stopSpeaking: "Stop Speaking",
    speakingState: "Speaking...",
    exportReportPdf: "Download PDF Report"
  },
  te: {
    appName: "అగ్రోటెక్ ప్రిసిషన్",
    appSubtitle: "స్మార్ట్ పంట సిఫార్సు ఇంజిన్",
    pipelineTag: "ML పైప్‌లైన్",
    predictorTab: "ప్రిడిక్టర్ ప్లేగ్రౌండ్",
    edaTab: "EDA & బెంచ్‌మార్కులు",
    trainingTab: "మోడల్ శిక్షణ కన్సోల్",
    codeTab: "పైథాన్ మూల కోడ్",
    codebaseJsonBtn: "కోడ్‌బేస్ JSON",
    packagingText: "ప్యాకేజింగ్ అవుతోంది...",
    footerEngine: "వ్యవసాయ ఇంజిన్ v1.0.0",
    footerAccuracy: "ఖచ్చితత్వం: 99.3%",
    footerAlgorithms: "12 అల్గారిథమ్‌లు బెంచ్‌మార్క్ చేయబడ్డాయి",
    footerRunCommand: "స్థానికంగా అమలు చేయడానికి python train.py రన్ చేయండి",

    soilMacroNutrients: "నేల స్థూల పోషకాలు",
    nitrogen: "నైట్రోజన్ (N)",
    phosphorus: "భాస్వరం (P)",
    potassium: "పొటాషియం (K)",
    soilParameters: "నేల పారామితులు",
    soilPh: "నేల pH",
    moistureRatio: "తేమ నిష్పత్తి",
    soilType: "నేల రకం",
    geographicalParameters: "భూగోళిక పారామితులు",
    state: "రాష్ట్రం",
    district: "జిల్లా",
    crop: "పంట",
    environmentalParameters: "పర్యావరణ పారామితులు",
    temperature: "ఉష్ణోగ్రత",
    humidity: "తేమ",
    rainfall: "వర్షపాతం",
    predictOptimalCrop: "సరైన పంటను అంచనా వేయండి",
    resetParameters: "పారామితులను రీసెట్ చేయండి",
    predictingOptimalCrop: "సరైన పంటను అంచనా వేస్తోంది...",

    optimalRecommendedCrop: "సిఫార్సు చేయబడిన సరైన పంట",
    confidence: "విశ్వాస స్కోరు",
    probability: "సంభావ్యత",
    topRecommendedCandidates: "టాప్ సిఫార్సు చేయబడిన పంటలు",
    agronomicAdvisoryTab: "వ్యవసాయ సలహా",
    yieldEconomicTab: "దిగుబడి & ఆర్థిక అంచనా",
    nutrientOptimizationTab: "పోషకాల ఆప్టిమైజేషన్",
    waterIrrigationTab: "నీరు & నీటిపారుదల నిర్వహణ",
    modelExplanationTab: "మోడల్ వివరణ (SHAP)",

    financialForecast: "ఆర్థిక అంచనా & మార్కెట్ విశ్లేషణ",
    dynamicEconomicProjections: "దశాబ్దాల ప్రాంతీయ చారిత్రక పోకడలు మరియు దిగుబడి నమూనాల నుండి లెక్కించబడిన డైనమిక్ ఆర్థిక అంచనాలు.",
    cultivationArea: "సాగు వైశాల్యం (పొలం పరిమాణం)",
    expectedYieldLabel: "ఆశించిన దిగుబడి",
    grossRevenue: "మొత్తం ఆదాయం",
    cultivationCost: "సాగు ఖర్చు",
    netProfit: "నికర లాభం",
    hectare: "హెక్టార్",
    hectares: "హెక్టార్లు",
    smallholder: "1 హెక్టార్ (చిన్న రైతు)",
    medium: "12 హెక్టార్లు (మధ్యస్థ)",
    largeEstate: "25 హెక్టార్లు (పెద్ద ఎస్టేట్)",
    costProfitDistribution: "అంచనా వేసిన ఖర్చు-లాభాల పంపిణీ",
    totalGross: "మొత్తం స్థూల ఆదాయం",
    overheads: "సాగు ఖర్చులు",
    netRetainedProfit: "నికర లాభం",
    historicalMarketRate: "5-సంవత్సరాల చారిత్రక మార్కెట్ ధర (టన్నుకు)",
    historicalMarketDesc: "చారిత్రక కనీస మద్దతు ధర (MSP) మరియు ప్రీమియం హోల్‌సేల్ రేటు సూచిక. ప్రస్తుత అంచనాల కోసం 2026 విలువ ఉపయోగించబడుతుంది.",
    profitabilityRecommended: "టాప్ సిఫార్సు చేయబడిన పంటల లాభదాయకత",
    profitabilityRecommendedDesc: "సగటు ప్రాంతీయ దిగుబడి పారామితుల ఆధారంగా టాప్ సిఫార్సు చేయబడిన పంటల నికర లాభ మార్జిన్లను (₹/హెక్టార్) పోల్చి చూపిస్తుంది. ఆకుపచ్చ రంగు సరైన ఎంపికను సూచిస్తుంది.",
    localMarketIndexRates: "స్థానిక మార్కెట్ ఇండెక్స్ ధరలు",
    localMarketDesc: "ప్రాంతీయ కనీస మద్దతు ధర (MSP) ఆధారంగా లెక్కించబడుతుంది. గింజల నాణ్యత, తేమ మరియు గిడ్డంగి స్థానాన్ని బట్టి అసలు ధర మారవచ్చు.",

    recommendedSowingSeason: "సిఫార్సు చేయబడిన విత్తే కాలం",
    suitabilityScore: "ప్రాంతీయ అనుకూలత",
    geographicSowingProfile: "భౌగోళిక విత్తే ప్రొఫైల్",
    autoFillSoilCard: "నేల కార్డ్ ఆటో-ఫిల్",
    uploadCustomCard: "కస్టమ్ నేల కార్డ్‌ని అప్‌లోడ్ చేయండి",
    dragDropOrBrowse: "మీ నేల ఆరోగ్య కార్డ్ PDF/చిత్రాన్ని ఇక్కడ లాగండి లేదా బ్రౌజ్ చేయండి",
    supportedFormats: "PDF, JPEG, PNG స్కాన్ చేసిన ల్యాబ్ కార్డ్‌లకు మద్దతు ఇస్తుంది",
    usePresetSoilCard: "సిఫార్సు ఇంజిన్‌ను తక్షణమే పరీక్షించడానికి ముందే సిద్ధం చేసిన నేల కార్డును ఉపయోగించండి",

    modelTrainingConsole: "మోడల్ శిక్షణ కన్సోల్",
    speakExplanation: "సలహాను గట్టిగా చదవండి",
    stopSpeaking: "చదవడం ఆపివేయండి",
    speakingState: "చదువుతోంది...",
    exportReportPdf: "PDF నివేదికను డౌన్‌లోడ్ చేసుకోండి"
  },
  hi: {
    appName: "एग्रोटेक प्रिसिजन",
    appSubtitle: "स्मार्ट फसल सिफारिश इंजन",
    pipelineTag: "एमएल पाइपलाइन",
    predictorTab: "प्रिडिक्टर प्लेग्राउंड",
    edaTab: "ईडीए और बेंचमार्क",
    trainingTab: "मॉडल प्रशिक्षण कंसोल",
    codeTab: "पायथन सोर्स कोड",
    codebaseJsonBtn: "कोडबेस JSON",
    packagingText: "पैकेजिंग हो रही है...",
    footerEngine: "कृषि इंजन v1.0.0",
    footerAccuracy: "सटीकता: 99.3%",
    footerAlgorithms: "12 एल्गोरिदम बेंचमार्क किए गए",
    footerRunCommand: "स्थानीय रूप से चलाने के लिए python train.py चलाएं",

    soilMacroNutrients: "मिट्टी के मैक्रो-पोषक तत्व",
    nitrogen: "नाइट्रोजन (N)",
    phosphorus: "फास्फोरस (P)",
    potassium: "पोटेशियम (K)",
    soilParameters: "मिट्टी के पैरामीटर",
    soilPh: "मिट्टी का पीएच",
    moistureRatio: "नमी का अनुपात",
    soilType: "मिट्टी का प्रकार",
    geographicalParameters: "भौगोलिक पैरामीटर",
    state: "राज्य",
    district: "जिला",
    crop: "फसल",
    environmentalParameters: "पर्यावरण के पैरामीटर",
    temperature: "तापमान",
    humidity: "आर्द्रता",
    rainfall: "वर्षा",
    predictOptimalCrop: "इष्टतम फसल का पूर्वानुमान लगाएं",
    resetParameters: "पैरामीटर रीसेट करें",
    predictingOptimalCrop: "इष्टतम फसल का पूर्वानुमान लगाया जा रहा है...",

    optimalRecommendedCrop: "इष्टतम अनुशंसित फसल",
    confidence: "विश्वास स्कोर",
    probability: "संभावना",
    topRecommendedCandidates: "शीर्ष अनुशंसित फसल उम्मीदवार",
    agronomicAdvisoryTab: "कृषि परामर्श",
    yieldEconomicTab: "उपज और आर्थिक पूर्वानुमान",
    nutrientOptimizationTab: "पोषक तत्व अनुकूलन",
    waterIrrigationTab: "जल और सिंचाई प्रबंधन",
    modelExplanationTab: "मॉडल स्पष्टीकरण (SHAP)",

    financialForecast: "वित्तीय पूर्वानुमान और बाजार विश्लेषण",
    dynamicEconomicProjections: "दशकों के क्षेत्रीय ऐतिहासिक रुझानों और उपज मॉडलों से गणना किए गए गतिशील आर्थिक अनुमान।",
    cultivationArea: "खेती का क्षेत्र (खेत का आकार)",
    expectedYieldLabel: "अपेक्षित उपज",
    grossRevenue: "कुल राजस्व",
    cultivationCost: "खेती की लागत",
    netProfit: "शुद्ध लाभ",
    hectare: "हेक्टेयर",
    hectares: "हेक्टेयर",
    smallholder: "1 हेक्टेयर (छोटे किसान)",
    medium: "12 हेक्टेयर (मध्यम)",
    largeEstate: "25 हेक्टेयर (बड़ी संपत्ति)",
    costProfitDistribution: "अनुमानित लागत-से-लाभ वितरण",
    totalGross: "कुल सकल राजस्व",
    overheads: "लागत खर्च",
    netRetainedProfit: "शुद्ध बचा हुआ लाभ",
    historicalMarketRate: "5-वर्षीय ऐतिहासिक बाजार दर (प्रति टन)",
    historicalMarketDesc: "ऐतिहासिक न्यूनतम समर्थन मूल्य (एमएसपी) और प्रीमियम थोक दर अनुक्रमण। वर्तमान अनुमानों के लिए वर्ष 2026 के मूल्य का उपयोग किया जाता है।",
    profitabilityRecommended: "शीर्ष अनुशंसित फसलों की लाभप्रदता",
    profitabilityRecommendedDesc: "औसत क्षेत्रीय उपज मापदंडों के आधार पर शीर्ष अनुशंसित फसलों के शुद्ध लाभ मार्जिन (₹/हेक्टेयर) की तुलना करता है। हरा रंग इष्टतम विकल्प को दर्शाता है।",
    localMarketIndexRates: "स्थानीय बाजार सूचकांक दरें",
    localMarketDesc: "क्षेत्रीय न्यूनतम समर्थन मूल्य (एमएसपी) के आधार पर गणना की गई। अनाज की शुद्धता, नमी और गोदाम के स्थान के आधार पर वास्तविक मूल्य भिन्न हो सकते हैं।",

    recommendedSowingSeason: "अनुशंसित बुवाई का मौसम",
    suitabilityScore: "क्षेत्रीय उपयुक्तता",
    geographicSowingProfile: "भौगोलिक बुवाई प्रोफ़ाइल",
    autoFillSoilCard: "सॉइल कार्ड ऑटो-फिल",
    uploadCustomCard: "कस्टम सॉइल कार्ड अपलोड करें",
    dragDropOrBrowse: "अपना सॉइल हेल्थ कार्ड PDF/इमेज यहाँ खींचें या ब्राउज़ करें",
    supportedFormats: "PDF, JPEG, PNG स्कैन किए गए लैब कार्ड का समर्थन करता है",
    usePresetSoilCard: "सिफारिश इंजन का तुरंत परीक्षण करने के लिए पहले से तैयार सॉइल कार्ड का उपयोग करें",

    modelTrainingConsole: "मॉडल प्रशिक्षण कंसोल",
    speakExplanation: "सलाह को जोर से पढ़ें",
    stopSpeaking: "पढ़ना बंद करें",
    speakingState: "पढ़ रहा है...",
    exportReportPdf: "PDF रिपोर्ट डाउनलोड करें"
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("agro_lang");
    return (saved === "te" || saved === "hi" || saved === "en" ? saved : "en") as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("agro_lang", lang);
  };

  const t = TRANSLATIONS[language];

  return createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
