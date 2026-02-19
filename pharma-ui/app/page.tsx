"use client";
import { useState, useEffect } from "react";

// --- VISUALIZATION 1: Clinical Risk Speedometer ---
const RiskGauge = ({
  severity,
  theme,
}: {
  severity: string;
  theme: string;
}) => {
  const angleMap: Record<string, number> = {
    none: -75,
    low: -30,
    moderate: 0,
    high: 45,
    critical: 75,
  };
  const rotation = angleMap[severity?.toLowerCase()] || -75;
  const isDark = theme === "dark";

  return (
    <div className="flex flex-col items-center justify-center relative w-48 h-28 overflow-hidden">
      <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-xl">
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke={isDark ? "#333" : "#e2e8f0"}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          className="opacity-80"
        />
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "100px 90px",
            transition: "transform 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <polygon
            points="96,90 104,90 100,25"
            fill={isDark ? "#fff" : "#0f172a"}
          />
          <circle cx="100" cy="90" r="8" fill={isDark ? "#fff" : "#0f172a"} />
          <circle cx="100" cy="90" r="3" fill={isDark ? "#050505" : "#fff"} />
        </g>
      </svg>
      <div className="absolute bottom-0 text-[10px] font-bold uppercase tracking-widest text-white/70">
        Severity Level
      </div>
    </div>
  );
};

// --- VISUALIZATION 2: Metabolic Activity Spectrum ---
const MetabolismSpectrum = ({
  phenotype,
  theme,
}: {
  phenotype: string;
  theme: string;
}) => {
  const isDark = theme === "dark";
  const pLower = phenotype?.toLowerCase() || "";

  let activeIndex = 2;
  if (pLower.includes("poor")) activeIndex = 0;
  else if (pLower.includes("intermediate")) activeIndex = 1;
  else if (pLower.includes("normal")) activeIndex = 2;
  else if (pLower.includes("rapid")) activeIndex = 3;
  else if (pLower.includes("ultrarapid")) activeIndex = 4;

  const nodes = [
    { label: "Poor", short: "PM" },
    { label: "Intermediate", short: "IM" },
    { label: "Normal", short: "NM" },
    { label: "Rapid", short: "RM" },
    { label: "Ultra", short: "UM" },
  ];

  return (
    <div className="w-full mt-4">
      <div className="flex justify-between items-center relative z-10">
        <div
          className={`absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 -z-10 ${isDark ? "bg-[#333]" : "bg-slate-200"} rounded-full`}
        ></div>
        <div
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2 -z-10 bg-blue-500 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${(activeIndex / 4) * 100}%` }}
        ></div>
        {nodes.map((node, i) => {
          const isActive = i === activeIndex;
          const isPast = i <= activeIndex;
          return (
            <div key={node.short} className="flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${isActive ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-125" : isPast ? "bg-blue-500/50 text-white/80" : isDark ? "bg-[#222] text-gray-500" : "bg-white border-2 border-slate-200 text-slate-400"}`}
              >
                {node.short}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? (isDark ? "text-blue-400" : "text-blue-600") : isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                {node.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  
  // --- SMART TAG STATE ---
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(["CLOPIDOGREL", "WARFARIN"]);
  const [drugInput, setDrugInput] = useState("");
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const AVAILABLE_DRUGS = [
    "CLOPIDOGREL", "SIMVASTATIN", "CODEINE", 
    "WARFARIN", "AZATHIOPRINE", "FLUOROURACIL"
  ];

  const suggestedDrugs = AVAILABLE_DRUGS.filter(d => 
    d.toLowerCase().includes(drugInput.toLowerCase()) && !selectedDrugs.includes(d)
  );

  const addDrug = (drugToAdd: string) => {
    if (!selectedDrugs.includes(drugToAdd)) {
      setSelectedDrugs([...selectedDrugs, drugToAdd]);
    }
    setDrugInput("");
  };

  const removeDrug = (drugToRemove: string) => {
    setSelectedDrugs(selectedDrugs.filter(d => d !== drugToRemove));
  };

  useEffect(() => {
    const savedTheme =
      (localStorage.getItem("pharmaguard-theme") as "light" | "dark") || "dark";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("pharmaguard-theme", newTheme);
  };

  const loadDemoPatient = async (type: string) => {
    setLoading(true);
    setResult(null);
    setActiveDemo(type);

    const demos: Record<string, { drug: string; file: string; label: string }> =
      {
        normal: {
          drug: "CLOPIDOGREL",
          file: "normal_metabolizer.vcf",
          label: "Normal Metabolizer",
        },
        intermediate: {
          drug: "WARFARIN, CODEINE",
          file: "intermediate_metabolizer.vcf",
          label: "Intermediate Risk",
        },
        poor: {
          drug: "CODEINE",
          file: "poor_metabolizer.vcf",
          label: "Poor Metabolizer",
        },
        rapid: {
          drug: "CODEINE",
          file: "rapid_metabolizer.vcf",
          label: "Rapid Metabolizer",
        },
      };

    const demo = demos[type];
    if (!demo) return;

    setSelectedDrugs(demo.drug.split(",").map(d => d.trim()));

    try {
      const response = await fetch(`/sample_vcfs/${demo.file}`);
      if (!response.ok) throw new Error("Sample file not found");
      const blob = await response.blob();
      const file = new File([blob], demo.file, { type: "text/plain" });
      setFile(file);

      const formData = new FormData();
      formData.append("vcf", file);
      formData.append("drugs", demo.drug);

      const apiRes = await fetch("http://127.0.0.1:8000/analyze/batch", {
        method: "POST",
        body: formData,
      });
      const data = await apiRes.json();
      setResult(data);
    } catch (error) {
      console.error("Demo failed:", error);
      alert(
        "Demo patient unavailable. Please ensure files are in public/sample_vcfs/",
      );
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!file) return alert("Please upload a VCF file");
    if (selectedDrugs.length === 0) return alert("Please select at least one drug");
    
    setLoading(true);
    setResult(null);
    setActiveDemo(null);

    const formData = new FormData();
    formData.append("vcf", file);
    formData.append("drugs", selectedDrugs.join(","));

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze/batch", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Connection failed:", error);
      alert("Failed to connect to backend. Is your FastAPI server running?");
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    alert("JSON copied to clipboard!");
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pharmaguard_${selectedDrugs[0] || "Patient"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskUI = (risk: string) => {
    switch (risk) {
      case "Safe":
        return {
          gradient: "from-emerald-500 to-teal-600",
          bg: theme === "light"
              ? "bg-emerald-50 border-emerald-200"
              : "bg-emerald-950/20 border-emerald-900/50",
          text: theme === "light" ? "text-emerald-700" : "text-emerald-400",
          icon: "✨",
          shadow: "shadow-[0_0_30px_rgba(16,185,129,0.2)]",
        };
      case "Adjust Dosage":
        return {
          gradient: "from-amber-400 to-orange-500",
          bg: theme === "light"
              ? "bg-amber-50 border-amber-200"
              : "bg-amber-950/20 border-amber-900/50",
          text: theme === "light" ? "text-amber-700" : "text-amber-400",
          icon: "⚖️",
          shadow: "shadow-[0_0_30px_rgba(245,158,11,0.2)]",
        };
      case "Toxic":
      case "Ineffective":
        return {
          gradient: "from-rose-500 to-red-700",
          bg: theme === "light"
              ? "bg-rose-50 border-rose-200"
              : "bg-rose-950/20 border-rose-900/50",
          text: theme === "light" ? "text-rose-700" : "text-rose-400",
          icon: "⚠️",
          shadow: "shadow-[0_0_30px_rgba(225,29,72,0.2)]",
        };
      default:
        return {
          gradient: "from-gray-500 to-slate-600",
          bg: theme === "light"
              ? "bg-gray-50 border-gray-200"
              : "bg-gray-900/50 border-gray-800",
          text: theme === "light" ? "text-gray-700" : "text-gray-400",
          icon: "🔍",
          shadow: "",
        };
    }
  };

  const themeClasses = {
    light: {
      bg: "bg-[#f8fafc]",
      card: "bg-white shadow-xl shadow-slate-200/50",
      border: "border-slate-200",
      text: "text-slate-900",
      textSecondary: "text-slate-600",
      textMuted: "text-slate-500",
      inputBg: "bg-slate-50",
      inputBorder:
        "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
      buttonPrimary:
        "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20",
      buttonSecondary:
        "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm",
      jsonBg: "bg-[#0f172a]",
      jsonText: "text-blue-300",
    },
    dark: {
      bg: "bg-[#050505]",
      card: "bg-[#111111] shadow-2xl shadow-black border border-[#222]",
      border: "border-[#222]",
      text: "text-white",
      textSecondary: "text-gray-400",
      textMuted: "text-gray-500",
      inputBg: "bg-[#1a1a1a]",
      inputBorder: "border-[#333] focus:border-blue-500 focus:ring-blue-500/20",
      buttonPrimary:
        "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]",
      buttonSecondary:
        "bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-300",
      jsonBg: "bg-[#0a0a0a]",
      jsonText: "text-blue-400",
    },
  };

  const current = themeClasses[theme];

  return (
    <div
      className={`min-h-screen ${current.bg} ${current.text} font-sans antialiased transition-colors duration-300 selection:bg-blue-500/30`}
    >
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${theme === "dark" ? "bg-black/50 border-[#222]" : "bg-white/70 border-slate-200"}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl">🧬</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PharmaGuard</h1>
              <p
                className={`text-xs font-medium ${current.textMuted} tracking-wider uppercase`}
              >
                Clinical Decision Support
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl ${current.buttonSecondary} transition-all`}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <span
              className={`px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg`}
            >
              RIFT 2026
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Input Controls */}
          <div className="lg:col-span-4 space-y-6 animate-fade-in-up">
            <div className={`${current.card} rounded-2xl p-6`}>
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Patient Context
              </h2>

              <div className="space-y-6">
                <div>
                  <label
                    className={`block text-xs font-bold ${current.textMuted} uppercase tracking-wider mb-3`}
                  >
                    Quick Load Demos
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: "normal", label: "NM Profile", emoji: "✅" },
                      {
                        type: "intermediate",
                        label: "IM Profile",
                        emoji: "⚠️",
                      },
                      { type: "poor", label: "PM Profile", emoji: "⛔" },
                      { type: "rapid", label: "UM Profile", emoji: "⚡" },
                    ].map((demo) => (
                      <button
                        key={demo.type}
                        onClick={() => loadDemoPatient(demo.type)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${activeDemo === demo.type ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : current.buttonSecondary}`}
                      >
                        {demo.emoji} {demo.label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className={current.border} />

                {/* SMART BATCH PROCESSING INPUT */}
                <div className="relative z-20">
                  <label className={`block text-xs font-bold ${current.textMuted} uppercase tracking-wider mb-2`}>
                    Target Medication(s)
                  </label>
                  
                  {/* The Tag Input Box */}
                  <div className={`flex flex-wrap gap-2 w-full ${current.inputBg} border ${current.inputBorder} p-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all min-h-[52px] items-center`}>
                    {selectedDrugs.map(d => (
                      <span key={d} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white shadow-sm`}>
                        {d}
                        <button 
                          onClick={() => removeDrug(d)}
                          className="hover:bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center transition-colors ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text"
                      placeholder={selectedDrugs.length === 0 ? "Type drug name (e.g. CODEINE)" : "Add drug..."}
                      className={`flex-1 bg-transparent outline-none min-w-[120px] px-2 text-sm font-medium ${current.text}`}
                      value={drugInput}
                      onChange={(e) => setDrugInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && suggestedDrugs.length > 0) {
                          e.preventDefault();
                          addDrug(suggestedDrugs[0]); 
                        }
                      }}
                    />
                  </div>

                  {/* The Auto-Complete Dropdown Menu */}
                  {drugInput.length > 0 && suggestedDrugs.length > 0 && (
                    <div className={`absolute z-50 w-full mt-2 rounded-xl shadow-xl border ${current.border} ${current.card} overflow-hidden animate-fade-in-up`}>
                      {suggestedDrugs.map(d => (
                        <div 
                          key={d}
                          onClick={() => addDrug(d)}
                          className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors flex items-center gap-2 hover:bg-blue-500 hover:text-white ${current.text}`}
                        >
                          <span className="text-lg opacity-70">💊</span> {d}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className={`text-[10px] mt-2 ${current.textMuted}`}>
                    Select multiple to run simultaneous CPIC batch analysis.
                  </p>
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold ${current.textMuted} uppercase tracking-wider mb-2`}
                  >
                    Genomic Data (.VCF)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".vcf"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center w-full ${current.inputBg} border-2 border-dashed ${current.inputBorder} rounded-xl px-4 py-6 cursor-pointer group-hover:border-blue-500 transition-colors`}
                    >
                      <span className="text-2xl mb-2">📁</span>
                      <span
                        className={`text-sm font-medium ${file ? current.text : current.textMuted} truncate max-w-[200px]`}
                      >
                        {file ? file.name : "Click to upload .VCF file"}
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className={`w-full ${current.buttonPrimary} py-4 rounded-xl font-bold text-sm tracking-wide uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading
                    ? "Processing Pipeline..."
                    : "Run Pharmacogenomic Analysis"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Results Dashboard */}
          <div className="lg:col-span-8">
            {!result && !loading ? (
              <div
                className={`${current.card} rounded-2xl h-full min-h-[500px] flex flex-col items-center justify-center border-dashed border-2 ${current.border} animate-fade-in-up`}
                style={{ animationDelay: "0.1s" }}
              >
                <div
                  className={`w-24 h-24 mb-6 rounded-full ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-slate-100"} flex items-center justify-center`}
                >
                  <span className="text-4xl">🔬</span>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Awaiting Genomic Data
                </h3>
                <p
                  className={`text-sm ${current.textMuted} max-w-sm text-center`}
                >
                  Upload a standard Variant Call Format (.vcf) file to generate
                  CPIC-aligned clinical recommendations.
                </p>
              </div>
            ) : loading ? (
              <div
                className={`${current.card} rounded-2xl h-full min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden`}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20">
                  <div className="h-full bg-blue-500 w-1/3 animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl">
                    🧬
                  </div>
                </div>
                <h3 className="text-lg font-bold mt-6 animate-pulse text-blue-500">
                  Parsing Variants & Inferring Diplotype...
                </h3>
                <p className={`text-sm ${current.textMuted} mt-2`}>
                  Cross-referencing CPIC guidelines
                </p>
              </div>
            ) : result.error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center animate-fade-in-up">
                <span className="text-5xl block mb-4">⚠️</span>
                <h3 className="text-xl font-bold text-red-500 mb-2">
                  Pipeline Execution Failed
                </h3>
                <p className="text-red-400/80">{result.error}</p>
              </div>
            ) : (
              // NOTE: Added ID 'clinical-report' here for PDF generation
              <div
                id="clinical-report"
                className="space-y-6 animate-fade-in-up p-2"
              >
                {/* PDF Generation Header (hidden in actual PDF render) */}
                <div
                  className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl print:hidden"
                  data-html2canvas-ignore
                >
                  <div>
                    <h3 className="font-bold text-blue-500">
                      Analysis Complete
                    </h3>
                    <p className={`text-xs ${current.textMuted}`}>
                      Generated at {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-all print:hidden"
                  >
                    📄 Download PDF Report
                  </button>
                </div>

                {/* 1. Hero Risk Card */}
                <div
                  className={`relative overflow-hidden rounded-2xl p-8 text-white bg-gradient-to-br ${getRiskUI(result.risk_assessment.risk_label).gradient} ${getRiskUI(result.risk_assessment.risk_label).shadow}`}
                >
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                      backgroundSize: "24px 24px",
                    }}
                  ></div>

                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold tracking-widest uppercase mb-4">
                        Primary Risk: {result.drug}
                      </span>
                      <h2 className="text-4xl md:text-5xl font-black mb-2 flex items-center gap-3">
                        {getRiskUI(result.risk_assessment.risk_label).icon}{" "}
                        {result.risk_assessment.risk_label}
                      </h2>
                      <p className="text-white/80 text-lg font-medium">
                        Patient exhibits{" "}
                        <strong className="text-white">
                          {result.pharmacogenomic_profile.phenotype}
                        </strong>{" "}
                        trait for {result.pharmacogenomic_profile.primary_gene}.
                      </p>
                    </div>

                    <div className="flex flex-col items-center bg-black/20 backdrop-blur-sm p-4 rounded-2xl border border-white/10 shrink-0">
                      <RiskGauge
                        severity={result.risk_assessment.severity}
                        theme={theme}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Clinical Action Banner */}
                <div
                  className={`${current.card} rounded-2xl p-6 border-l-4 ${getRiskUI(result.risk_assessment.risk_label).text.replace("text-", "border-")}`}
                >
                  <h3
                    className={`text-xs font-bold ${current.textMuted} uppercase tracking-wider mb-2`}
                  >
                    CPIC Guideline Action
                  </h3>
                  <p className="text-xl font-medium mb-3 leading-relaxed">
                    {result.clinical_recommendation.action}
                  </p>
                  <div
                    className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg ${current.inputBg}`}
                  >
                    <span className="text-blue-500">📚</span>{" "}
                    {result.clinical_recommendation.guideline_source}
                  </div>
                </div>

                {/* --- BATCH ANALYSIS RESULTS --- */}
                {result.batch_analysis &&
                  Object.keys(result.batch_analysis).length > 0 && (
                    <div
                      className={`${current.card} rounded-2xl p-6 border-l-4 border-indigo-500`}
                    >
                      <h3
                        className={`text-xs font-bold ${current.textMuted} uppercase tracking-wider mb-4`}
                      >
                        Additional Processed Medications
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(result.batch_analysis).map(
                          ([batchDrug, batchData]: [string, any]) => {
                            const ui = getRiskUI(batchData.risk_label);
                            return (
                              <div
                                key={batchDrug}
                                className={`p-4 rounded-xl border ${current.border} ${current.inputBg} flex justify-between items-center`}
                              >
                                <div>
                                  <h4 className="font-bold mb-1">
                                    {batchDrug}
                                  </h4>
                                  <p className={`text-xs ${current.textMuted}`}>
                                    {batchData.gene} • {batchData.phenotype}
                                  </p>
                                </div>
                                <div
                                  className={`px-3 py-1 rounded-lg text-xs font-bold ${ui.bg} ${ui.text}`}
                                >
                                  {ui.icon} {batchData.risk_label}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                {/* 3. Genetic Profile & Spectrum Grid */}
                <div className="grid grid-cols-1 gap-6">
                  <div className={`${current.card} rounded-2xl p-6`}>
                    <h3
                      className={`text-xs font-bold ${current.textMuted} uppercase tracking-wider mb-4`}
                    >
                      Biomarker Translation & Activity Spectrum
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${current.inputBg}`}
                        >
                          <span className={`text-sm ${current.textSecondary}`}>
                            Target Gene
                          </span>
                          <span className="font-mono font-bold text-blue-500">
                            {result.pharmacogenomic_profile.primary_gene}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center p-3 rounded-xl ${current.inputBg}`}
                        >
                          <span className={`text-sm ${current.textSecondary}`}>
                            Inferred Diplotype
                          </span>
                          <span className="font-mono font-bold text-indigo-500">
                            {result.pharmacogenomic_profile.diplotype}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`p-5 rounded-xl border ${current.border} ${theme === "dark" ? "bg-[#1a1a1a]/50" : "bg-slate-50"}`}
                      >
                        <h4
                          className={`text-[10px] uppercase font-bold tracking-widest ${current.textMuted} mb-6 text-center`}
                        >
                          Metabolic Phenotype Mapping
                        </h4>
                        <MetabolismSpectrum
                          phenotype={result.pharmacogenomic_profile.phenotype}
                          theme={theme}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${current.card} rounded-2xl p-6 relative overflow-hidden group`}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50"></div>
                    <div className="flex justify-between items-start mb-3">
                      <h3
                        className={`text-xs font-bold ${current.textMuted} uppercase tracking-wider flex items-center gap-2`}
                      >
                        <span className="text-purple-500">✨</span> AI Mechanism
                        Explanation
                      </h3>
                    </div>
                    <p className={`text-sm font-medium ${current.text} mb-3`}>
                      "{result.llm_generated_explanation.summary}"
                    </p>
                    <p
                      className={`text-sm ${current.textSecondary} leading-relaxed`}
                    >
                      {result.llm_generated_explanation.mechanism}
                    </p>
                  </div>
                </div>

                {/* 4. Raw JSON Output Toggle (ignored in PDF) */}
                <div
                  className={`${current.card} rounded-2xl overflow-hidden print:hidden`}
                  data-html2canvas-ignore
                >
                  <div
                    className={`${current.inputBg} px-6 py-4 flex justify-between items-center border-b ${current.border}`}
                  >
                    <span
                      className={`text-xs font-bold font-mono tracking-wider uppercase ${current.textMuted}`}
                    >
                      Raw Pipeline Output (JSON)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={copyToClipboard}
                        className={`text-xs font-medium ${current.buttonSecondary} px-4 py-2 rounded-lg`}
                      >
                        Copy
                      </button>
                      <button
                        onClick={downloadJSON}
                        className={`text-xs font-medium ${current.buttonSecondary} px-4 py-2 rounded-lg`}
                      >
                        Export
                      </button>
                    </div>
                  </div>
                  <div className="p-6 overflow-x-auto max-h-96 overflow-y-auto bg-[#0a0a0a]">
                    <pre className="text-[13px] font-mono leading-relaxed text-blue-400">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}