"use client";
import { useState, useEffect } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [drug, setDrug] = useState('CLOPIDOGREL');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('pharmaguard-theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
  }, []);

  // Toggle theme and save to localStorage
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('pharmaguard-theme', newTheme);
  };

  const loadDemoPatient = async (type: string) => {
    setLoading(true);
    setResult(null);
    setActiveDemo(type);
    
    const demos: Record<string, { drug: string; file: string; label: string }> = {
      normal: { 
        drug: 'CLOPIDOGREL', 
        file: 'normal_metabolizer.vcf',
        label: 'Normal Metabolizer'
      },
      intermediate: { 
        drug: 'WARFARIN', 
        file: 'intermediate_metabolizer.vcf',
        label: 'Intermediate Risk'
      },
      poor: { 
        drug: 'CODEINE', 
        file: 'poor_metabolizer.vcf',
        label: 'Poor Metabolizer'
      },
      rapid: { 
        drug: 'CODEINE', 
        file: 'rapid_metabolizer.vcf',
        label: 'Rapid Metabolizer'
      }
    };
    
    const demo = demos[type];
    if (!demo) return;
    
    setDrug(demo.drug);
    
    try {
      const response = await fetch(`/sample_vcfs/${demo.file}`);
      if (!response.ok) throw new Error('Sample file not found');
      const blob = await response.blob();
      const file = new File([blob], demo.file, { type: 'text/plain' });
      setFile(file);
      
      const formData = new FormData();
      formData.append('vcf', file);
      formData.append('drug', demo.drug);
      
      const apiRes = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await apiRes.json();
      setResult(data);
    } catch (error) {
      console.error("Demo failed:", error);
      alert("Demo patient unavailable. Please upload your own VCF file.");
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!file) return alert("Please upload a VCF file");
    setLoading(true);
    setResult(null);
    setActiveDemo(null);
    
    const formData = new FormData();
    formData.append('vcf', file);
    formData.append('drug', drug);

    try {
      const res = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
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
    alert('JSON copied to clipboard!');
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaguard_${result.drug}_${result.patient_id || 'result'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskBadge = (risk: string) => {
    switch(risk) {
      case 'Safe':
        return { 
          bg: theme === 'light' ? 'bg-emerald-100' : 'bg-emerald-900/30',
          text: theme === 'light' ? 'text-emerald-800' : 'text-emerald-300',
          icon: '✓',
          label: 'Safe'
        };
      case 'Adjust Dosage':
        return { 
          bg: theme === 'light' ? 'bg-amber-100' : 'bg-amber-900/30',
          text: theme === 'light' ? 'text-amber-800' : 'text-amber-300',
          icon: '⚠️',
          label: 'Adjust Dosage'
        };
      case 'Toxic':
        return { 
          bg: theme === 'light' ? 'bg-red-100' : 'bg-red-900/30',
          text: theme === 'light' ? 'text-red-800' : 'text-red-300',
          icon: '⛔',
          label: 'Toxic'
        };
      case 'Ineffective':
        return { 
          bg: theme === 'light' ? 'bg-orange-100' : 'bg-orange-900/30',
          text: theme === 'light' ? 'text-orange-800' : 'text-orange-300',
          icon: '✗',
          label: 'Ineffective'
        };
      default:
        return { 
          bg: theme === 'light' ? 'bg-gray-100' : 'bg-gray-800',
          text: theme === 'light' ? 'text-gray-800' : 'text-gray-300',
          icon: '?',
          label: 'Unknown'
        };
    }
  };

  // Theme-based classes
  const themeClasses = {
    light: {
      bg: 'bg-gray-50',
      card: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      headerBg: 'bg-white',
      headerBorder: 'border-gray-200',
      inputBg: 'bg-white',
      inputBorder: 'border-gray-300',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
      accent: 'text-blue-600',
      accentBg: 'bg-blue-50',
      codeBg: 'bg-gray-50',
      codeText: 'text-blue-800',
      jsonBg: 'bg-gray-50',
    },
    dark: {
      bg: 'bg-[#121212]',
      card: 'bg-[#1A1A1A]',
      border: 'border-[#2A2A2A]',
      text: 'text-[#E4E4E7]',
      textSecondary: 'text-[#A0A0A0]',
      textMuted: 'text-[#6B6B6B]',
      headerBg: 'bg-[#1A1A1A]',
      headerBorder: 'border-[#2A2A2A]',
      inputBg: 'bg-[#25252D]',
      inputBorder: 'border-[#3A3A3A]',
      buttonPrimary: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white',
      buttonSecondary: 'bg-[#25252D] hover:bg-[#2A2A2A] text-[#E4E4E7]',
      accent: 'text-[#93C5FD]',
      accentBg: 'bg-[#1E3A8A]/20',
      codeBg: 'bg-[#25252D]',
      codeText: 'text-[#93C5FD]',
      jsonBg: 'bg-[#1A1A1A]',
    }
  };

  const current = themeClasses[theme];

  return (
    <div className={`min-h-screen ${current.bg} ${current.text} font-sans antialiased transition-colors duration-200`}>
      {/* Header */}
      <header className={`border-b ${current.headerBorder} ${current.headerBg} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-sm font-semibold text-white">PG</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold">PharmaGuard</h1>
              <p className={`text-xs ${current.textSecondary}`}>Clinical Pharmacogenomics System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${current.buttonSecondary} transition-colors`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <span className={`px-2 py-1 rounded text-xs ${current.buttonSecondary}`}>v2.0</span>
            <span className={`px-2 py-1 rounded text-xs ${current.accentBg} ${current.accent}`}>CPIC Guidelines</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Input Section */}
          <div className="lg:col-span-4 space-y-6">
            {/* Patient Data Card */}
            <div className={`${current.card} rounded-xl border ${current.border} p-6`}>
              <h2 className={`text-sm font-medium ${current.textMuted} uppercase tracking-wider mb-4`}>Patient Data</h2>
              
              {/* Demo Patient Tags */}
              <div className="mb-6">
                <p className={`text-xs ${current.textMuted} mb-3`}>Demo Patients</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { type: 'normal', label: 'Normal Metabolizer' },
                    { type: 'intermediate', label: 'Intermediate Risk' },
                    { type: 'poor', label: 'Poor Metabolizer' },
                    { type: 'rapid', label: 'Rapid Metabolizer' }
                  ].map((demo) => (
                    <button
                      key={demo.type}
                      onClick={() => loadDemoPatient(demo.type)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        activeDemo === demo.type 
                          ? 'bg-blue-600 text-white' 
                          : current.buttonSecondary
                      }`}
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={`block text-xs ${current.textMuted} mb-2`}>Target Medication</label>
                  <select 
                    className={`w-full ${current.inputBg} border ${current.inputBorder} px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer`}
                    onChange={(e) => setDrug(e.target.value)}
                    value={drug}
                  >
                    <option>Clopidogrel (Plavix) - Antiplatelet</option>
                    <option>Simvastatin (Zocor) - Cholesterol</option>
                    <option>Codeine - Pain Management</option>
                    <option>Warfarin (Coumadin) - Anticoagulant</option>
                    <option>Azathioprine (Imuran) - Immunosuppressant</option>
                    <option>Fluorouracil (5-FU) - Chemotherapy</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs ${current.textMuted} mb-2`}>Genomic File (.vcf)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".vcf"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex items-center justify-between w-full ${current.inputBg} border ${current.inputBorder} rounded-lg px-4 py-2.5 cursor-pointer hover:border-gray-400 transition-colors`}
                    >
                      <span className={`text-sm ${current.textMuted} truncate max-w-[200px]`}>
                        {file ? file.name : 'Choose VCF file...'}
                      </span>
                      <span className={`text-xs ${current.buttonSecondary} px-3 py-1 rounded`}>
                        Browse
                      </span>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handleAnalyze}
                  disabled={loading}
                  className={`w-full ${current.buttonPrimary} py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Run Analysis</span>
                  )}
                </button>
              </div>
            </div>

            {/* Drug List - Badges */}
            <div className={`${current.card} rounded-xl border ${current.border} p-6`}>
              <h3 className={`text-xs font-medium ${current.textMuted} uppercase tracking-wider mb-4`}>Supported Drugs & Genes</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'CYP2D6 • Codeine',
                  'CYP2C9 • Warfarin',
                  'CYP2C19 • Clopidogrel',
                  'SLCO1B1 • Simvastatin',
                  'TPMT • Azathioprine',
                  'DPYD • Fluorouracil'
                ].map((item, i) => (
                  <div key={i} className={`${current.inputBg} px-3 py-2 rounded-lg text-xs ${current.textMuted}`}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Results Section */}
          <div className="lg:col-span-8 space-y-6">
            {!result ? (
              <div className={`${current.card} rounded-xl border ${current.border} p-12 flex items-center justify-center`}>
                <div className="text-center">
                  <div className={`text-6xl mb-4 ${current.textMuted}`}>🧬</div>
                  <h3 className={`text-lg font-medium ${current.textSecondary} mb-2`}>Ready to Analyze</h3>
                  <p className={`text-sm ${current.textMuted}`}>Upload a VCF file or select a demo patient</p>
                </div>
              </div>
            ) : result.error ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4 text-red-500">⚠️</div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Analysis Error</h3>
                <p className="text-sm text-red-600 dark:text-red-300/70">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Risk Assessment Card */}
                <div className={`${current.card} rounded-xl border ${current.border} p-6`}>
                  {/* Header with risk badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className={`text-xs ${current.textMuted} uppercase tracking-wider mb-1`}>Risk Assessment</p>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold">
                          {result.risk_assessment.risk_label}
                        </h2>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRiskBadge(result.risk_assessment.risk_label).bg} ${getRiskBadge(result.risk_assessment.risk_label).text}`}>
                          {getRiskBadge(result.risk_assessment.risk_label).icon} {result.risk_assessment.severity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gene Info Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className={`${current.inputBg} p-4 rounded-lg`}>
                      <p className={`text-xs ${current.textMuted} mb-1`}>Primary Gene</p>
                      <p className="font-mono text-lg">{result.pharmacogenomic_profile.primary_gene}</p>
                    </div>
                    <div className={`${current.inputBg} p-4 rounded-lg`}>
                      <p className={`text-xs ${current.textMuted} mb-1`}>Phenotype</p>
                      <p className="font-mono text-lg">{result.pharmacogenomic_profile.phenotype}</p>
                    </div>
                    <div className={`${current.inputBg} p-4 rounded-lg`}>
                      <p className={`text-xs ${current.textMuted} mb-1`}>Diplotype</p>
                      <p className="font-mono text-lg">{result.pharmacogenomic_profile.diplotype}</p>
                    </div>
                  </div>

                  {/* Clinical Recommendation - Alert Banner */}
                  <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                    result.risk_assessment.risk_label === 'Toxic' || result.risk_assessment.risk_label === 'Ineffective'
                      ? theme === 'light' ? 'bg-red-50 border-l-4 border-red-500' : 'bg-red-950/30 border-l-4 border-red-500'
                      : result.risk_assessment.risk_label === 'Adjust Dosage'
                      ? theme === 'light' ? 'bg-amber-50 border-l-4 border-amber-500' : 'bg-amber-950/30 border-l-4 border-amber-500'
                      : theme === 'light' ? 'bg-gray-50 border-l-4 border-gray-400' : 'bg-[#25252D] border-l-4 border-[#4A4A4A]'
                  }`}>
                    <span className="text-xl">
                      {result.risk_assessment.risk_label === 'Toxic' ? '⛔' :
                       result.risk_assessment.risk_label === 'Ineffective' ? '✗' :
                       result.risk_assessment.risk_label === 'Adjust Dosage' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div>
                      <p className={`text-xs ${current.textMuted} mb-1`}>Clinical Recommendation</p>
                      <p className="text-sm font-medium">{result.clinical_recommendation.action}</p>
                      <p className={`text-xs ${current.textMuted} mt-1`}>{result.clinical_recommendation.guideline_source}</p>
                    </div>
                  </div>

                  {/* Detected Variants */}
                  {result.pharmacogenomic_profile?.detected_variants?.length > 0 && (
                    <div className="mb-6">
                      <p className={`text-xs ${current.textMuted} uppercase tracking-wider mb-3`}>Detected Variants</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {result.pharmacogenomic_profile.detected_variants.slice(0, 8).map((v: any, i: number) => (
                          <a
                            key={i}
                            href={`https://www.ncbi.nlm.nih.gov/snp/${v.rsid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${current.inputBg} p-3 rounded-lg hover:bg-opacity-80 transition-colors group`}
                          >
                            <div className={`font-mono text-xs ${current.accent} group-hover:${theme === 'light' ? 'text-blue-800' : 'text-white'} mb-1`}>{v.rsid}</div>
                            <div className={`text-xs ${current.textMuted}`}>{v.gene}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comprehensive Panel */}
                  {result.comprehensive_panel && (
                    <div className="mb-6">
                      <p className={`text-xs ${current.textMuted} uppercase tracking-wider mb-3`}>Comprehensive Drug Panel</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(result.comprehensive_panel).map(([drug, data]: [string, any]) => {
                          const badge = getRiskBadge(data.risk_label);
                          return (
                            <div key={drug} className={`${current.inputBg} p-4 rounded-lg`}>
                              <div className="font-medium text-sm mb-2">{drug}</div>
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text} mb-2`}>
                                <span>{badge.icon}</span>
                                <span>{data.risk_label}</span>
                              </div>
                              <div className={`text-xs ${current.textMuted}`}>{data.gene}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI Explanation */}
                  <div className={`${current.inputBg} p-4 rounded-lg`}>
                    <p className={`text-xs ${current.textMuted} uppercase tracking-wider mb-2`}>AI Generated Mechanism</p>
                    <p className={`text-sm ${current.textSecondary} mb-2 italic`}>"{result.llm_generated_explanation.summary}"</p>
                    <p className={`text-sm ${current.textMuted} leading-relaxed`}>{result.llm_generated_explanation.mechanism}</p>
                  </div>
                </div>

                {/* JSON Output */}
                <div className={`${current.card} rounded-xl border ${current.border} overflow-hidden`}>
                  <div className={`${current.inputBg} px-4 py-3 border-b ${current.border} flex justify-between items-center`}>
                    <span className={`text-xs font-mono ${current.textMuted}`}>JSON Output</span>
                    <div className="flex gap-2">
                      <button
                        onClick={copyToClipboard}
                        className={`text-xs ${current.buttonSecondary} px-3 py-1 rounded transition-colors`}
                      >
                        Copy
                      </button>
                      <button
                        onClick={downloadJSON}
                        className={`text-xs ${current.buttonSecondary} px-3 py-1 rounded transition-colors`}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                  <div className={`p-4 overflow-x-auto max-h-96 overflow-y-auto ${current.jsonBg}`}>
                    <pre className={`text-xs font-mono ${current.codeText}`}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t ${current.border} mt-12 py-6`}>
        <div className="max-w-7xl mx-auto px-6 text-center text-xs ${current.textMuted}">
          <p>PharmaGuard — RIFT 2026 • CPIC Guidelines • Clinical Decision Support</p>
        </div>
      </footer>
    </div>
  );
}