import { useState } from "react";
import { Sprout, BarChart3, Cpu, Code2, Download, Languages } from "lucide-react";
import { LanguageProvider, useLanguage, Language } from "./translations";

import PredictorPlayground from "./components/PredictorPlayground";
import EdaBenchmarks from "./components/EdaBenchmarks";
import ModelTraining from "./components/ModelTraining";
import CodeExplorer from "./components/CodeExplorer";

type Tab = "playground" | "eda" | "training" | "code";

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("playground");
  const [downloading, setDownloading] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  // Download all files as a consolidated JSON package representing the CropRecommendationML folder
  const handleDownloadCodebase = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/api/export-project");
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data.files, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "crop_recommendation_ml_codebase.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download full ML codebase:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
      {/* Top Banner Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
              <Sprout className="h-5 w-5 fill-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                <span>{t.appName}</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full px-2 py-0.2 font-bold tracking-normal normal-case">{t.pipelineTag}</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium font-mono">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              { id: "playground", label: t.predictorTab, icon: Sprout },
              { id: "eda", label: t.edaTab, icon: BarChart3 },
              { id: "training", label: t.trainingTab, icon: Cpu },
              { id: "code", label: t.codeTab, icon: Code2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer select-none ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Controls: Language Dropdown & Codebase Download */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60 shadow-sm">
              <Languages className="h-3.5 w-3.5 text-slate-400 mx-1 shrink-0" />
              {(["en", "te", "hi"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 rounded text-[10px] font-black transition select-none cursor-pointer ${
                    language === lang
                      ? "bg-emerald-600 text-white shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {lang === "en" ? "EN" : lang === "te" ? "తెలుగు" : "हिंदी"}
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadCodebase}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-98 transition disabled:opacity-50 select-none"
              title="Download Full Python Codebase"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? t.packagingText : t.codebaseJsonBtn}</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="md:hidden flex items-center justify-around h-12 border-t border-slate-100 px-2 bg-white shrink-0">
          {[
            { id: "playground", icon: Sprout, title: t.predictorTab.split(" ")[0] },
            { id: "eda", icon: BarChart3, title: t.edaTab.split(" ")[0] },
            { id: "training", icon: Cpu, title: "Training" },
            { id: "code", icon: Code2, title: "Code" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition rounded cursor-pointer ${
                  isActive ? "text-emerald-600 font-bold" : "text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] tracking-tight">{tab.title}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
        {activeTab === "playground" && <PredictorPlayground />}
        {activeTab === "eda" && <EdaBenchmarks />}
        {activeTab === "training" && <ModelTraining />}
        {activeTab === "code" && <CodeExplorer />}
      </main>

      {/* Footer Details */}
      <footer className="bg-white border-t border-slate-200 py-4 shrink-0 mt-auto select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1.5 font-sans font-medium text-slate-400">
            <span>{t.footerEngine}</span>
            <span>•</span>
            <span>{t.footerAccuracy}</span>
            <span>•</span>
            <span>{t.footerAlgorithms}</span>
          </div>
          <div>
            <span>{t.footerRunCommand}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
