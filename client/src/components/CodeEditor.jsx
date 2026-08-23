import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { resolveApiUrl } from "../config";
import {
  VscPlay,
  VscPulse,
  VscSearch,
  VscBrowser,
  VscClose,
  VscWarning,
  VscCheck,
  VscLightbulb,
  VscTrash,
  VscRefresh,
  VscCode,
  VscBug,
  VscTerminal
} from "react-icons/vsc";
import { FiZap } from "react-icons/fi";

const API_URL = resolveApiUrl();

function CustomCodeEditor({
  code,
  setCode,
  fileName,
  files = {},
  socketRef,
  projectId,
  remoteRunTrigger,
}) {
  const [output, setOutput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // New states for AI Reviewer and Complexity Analyzer
  const [reviewData, setReviewData] = useState(null);
  const [complexityData, setComplexityData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState(null); // 'review' | 'complexity' | null

  // Detect language based on file extension
  const getLanguageFromExtension = (name) => {
    if (!name) return "javascript";
    const ext = name.split(".").pop().toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "html":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "py":
        return "python";
      case "java":
        return "java";
      case "cpp":
      case "cc":
      case "h":
        return "cpp";
      default:
        return "javascript";
    }
  };

  const language = getLanguageFromExtension(fileName);

  // Allow user to override detected language with a selector (keeps detected as default)
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [languages, setLanguages] = useState([]); // fetched from server (Judge0 mapping)

  useEffect(() => {
    // update selectedLanguage when fileName changes (keep manual selection if user changed it)
    setSelectedLanguage(getLanguageFromExtension(fileName));
  }, [fileName]);

  // Fetch available Judge0 languages mapping from server and fall back to static list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/project/judge0-languages`);
        if (mounted && Array.isArray(res.data)) setLanguages(res.data);
      } catch (err) {
        // Ignore — keep languages empty so UI falls back to defaults
        console.warn("Could not fetch judge0 languages:", err?.message || err);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Give a small visual saving feedback when code updates
  useEffect(() => {
    if (!code) return;
    setIsSaving(true);
    const timer = setTimeout(() => {
      setIsSaving(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [code]);

  // Execute JavaScript or Python code on the backend
  const triggerLocalRun = async () => {
    setOutput("Running code on backend...");
    const lang = selectedLanguage || getLanguageFromExtension(fileName);

    if (lang === "javascript" || lang === "python") {
      try {
        const res = await axios.post(`${API_URL}/api/project/run-code`, {
          language: lang,
          code,
        });
        setOutput(res.data.output);
      } catch (err) {
        console.error(err);
        setOutput(
          "Error: " +
            (err.response?.data?.error ||
              "Failed to execute code on backend. Please ensure the backend is running.")
        );
      }
    } else {
      setOutput(`Execution for ${lang} is not supported. Use HTML/CSS for browser web preview.`);
    }
  };

  // User clicked 'Run Code' -> emit to others, then run locally
  const runCode = () => {
    if (socketRef && socketRef.current) {
      socketRef.current.emit("run-code", {
        projectId,
        fileName,
      });
    }
    triggerLocalRun();
  };

  // Listen for code execution signals from other members in the room
  useEffect(() => {
    if (remoteRunTrigger && remoteRunTrigger.fileName === fileName) {
      triggerLocalRun();
    }
  }, [remoteRunTrigger]);

  // Trigger AI Code Review
  const triggerReview = async () => {
    setAiLoading(true);
    setActiveSidePanel("review");
    setShowPreview(false);
    setReviewData(null);

    try {
      const res = await axios.post(
        `${API_URL}/api/ai/review`,
        { code, language },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setReviewData(res.data);
    } catch (err) {
      console.error(err);
      setOutput(
        "AI Review Error: " +
          (err.response?.data?.error || "Failed to compile AI code review.")
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Trigger Code Complexity Analysis
  const triggerComplexityAnalysis = async () => {
    setAiLoading(true);
    setActiveSidePanel("complexity");
    setShowPreview(false);
    setComplexityData(null);

    try {
      const res = await axios.post(
        `${API_URL}/api/ai/complexity`,
        { code, language },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setComplexityData(res.data);
    } catch (err) {
      console.error(err);
      setOutput(
        "Complexity Analysis Error: " +
          (err.response?.data?.error || "Failed to analyze code complexity.")
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Bundle HTML, CSS, and JS files from the workspace dynamically into an iframe srcDoc string
  const compileProjectSource = () => {
    let htmlContent = "";
    if (fileName.endsWith(".html")) {
      htmlContent = code;
    } else {
      htmlContent = files["index.html"] || "";
    }

    if (!htmlContent) {
      const firstHtmlFile = Object.keys(files).find((name) => name.endsWith(".html"));
      if (firstHtmlFile) {
        htmlContent = files[firstHtmlFile];
      }
    }

    if (!htmlContent) {
      return `
        <html>
          <body style="background-color: #121212; color: #a0a0a0; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 90vh; text-align: center; padding: 20px;">
            <div style="font-size: 40px; margin-bottom: 10px;">🌐</div>
            <h3 style="color: #e0e0e0; margin: 5px;">Web Preview</h3>
            <p style="font-size: 13px; max-width: 300px; line-height: 1.5; color: #707070; font-family: monospace;">
              Create an <strong>index.html</strong> file to render live page mockups.
            </p>
          </body>
        </html>
      `;
    }

    let compiledDoc = htmlContent;

    Object.keys(files).forEach((name) => {
      if (name.endsWith(".css")) {
        const cssContent = files[name];
        const linkRegex = new RegExp(`<link[^>]*href=["']${name}["'][^>]*>`, "gi");
        if (linkRegex.test(compiledDoc)) {
          compiledDoc = compiledDoc.replace(linkRegex, `<style>${cssContent}</style>`);
        } else {
          compiledDoc = compiledDoc.replace("</head>", `<style>${cssContent}</style></head>`);
        }
      }
    });

    Object.keys(files).forEach((name) => {
      if (name.endsWith(".js") && name !== "eslint.config.js" && name !== "vite.config.js") {
        const jsContent = files[name];
        const scriptRegex = new RegExp(`<script[^>]*src=["']${name}["'][^>]*>\\s*</script>`, "gi");
        if (scriptRegex.test(compiledDoc)) {
          compiledDoc = compiledDoc.replace(scriptRegex, `<script>${jsContent}</script>`);
        } else {
          compiledDoc = compiledDoc.replace("</body>", `<script>${jsContent}</script></body>`);
        }
      }
    });

    return compiledDoc;
  };

  const isWebFile =
    fileName.endsWith(".html") || fileName.endsWith(".css") || fileName.endsWith(".js");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121214] overflow-hidden">
      {/* Editor top action bar */}
      <div className="h-12 border-b border-gray-850 flex items-center justify-between px-6 bg-[#0e0e11] text-white select-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 font-semibold tracking-wide bg-gray-900 px-2.5 py-1 rounded-md border border-gray-800/80">{fileName}</span>

          {/* Language selector: shows detected language but lets user choose runtime/language for execution */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono font-medium border border-indigo-500/20 uppercase tracking-wider appearance-none"
            >
              {languages && languages.length > 0 ? (
                languages.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.name}{!l.available ? ' (unavailable)' : ''}
                  </option>
                ))
              ) : (
                <>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="ruby">Ruby</option>
                  <option value="php">PHP</option>
                </>
              )}
            </select>
          </div>
          {isSaving && (
            <span className="text-[11px] text-indigo-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
              Autosaving...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isWebFile && (
            <button
              onClick={() => {
                setShowPreview(!showPreview);
                setActiveSidePanel(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                showPreview
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/15"
                  : "bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-600 hover:text-white"
              }`}
            >
              <VscBrowser className="text-sm shrink-0" />
              <span>{showPreview ? "Hide Preview" : "Live Preview"}</span>
            </button>
          )}

          {/* AI Code Reviewer Button */}
          <button
            onClick={triggerReview}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeSidePanel === "review"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/15"
                : "bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-650/20 hover:text-indigo-300"
            }`}
          >
            <VscSearch className="text-sm shrink-0" />
            <span>Review Code</span>
          </button>

          {/* Code Complexity Analyzer Button */}
          <button
            onClick={triggerComplexityAnalysis}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeSidePanel === "complexity"
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/15"
                : "bg-violet-500/10 border border-violet-500/25 text-violet-400 hover:bg-violet-650/20 hover:text-violet-300"
            }`}
          >
            <VscPulse className="text-sm shrink-0" />
            <span>Analyze Complexity</span>
          </button>

          {(language === "javascript" || language === "python") && (
            <button
              onClick={runCode}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition-all duration-200 shadow-md shadow-emerald-600/15 cursor-pointer flex items-center gap-1.5"
            >
              <VscPlay className="text-xs shrink-0" />
              <span>Run Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor and Side Panels Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Editor container */}
        <div className={`flex-1 min-h-0 relative ${
          (showPreview || activeSidePanel) ? "w-1/2 border-r border-gray-850" : "w-full"
        } bg-[#1e1e1e]`}>
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              fontSize: 13,
              fontFamily: "'Fira Code', 'Operator Mono', Menlo, Monaco, 'Courier New', monospace",
              minimap: { enabled: true, scale: 0.8 },
              wordWrap: "on",
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              lineNumbersMinChars: 3,
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
          />
        </div>

        {/* Web Live Preview container */}
        {showPreview && (
          <div className="w-1/2 min-h-0 flex flex-col bg-[#0b0b0d] border-l border-gray-850">
            <div className="h-9 border-b border-gray-850 bg-[#0f0f12] flex items-center justify-between px-4 text-xs font-semibold text-gray-400 select-none shrink-0">
              <span className="font-mono flex items-center gap-1.5 text-blue-400">
                <VscBrowser className="text-sm" /> Browser Simulator
              </span>
              <button
                onClick={() => {
                  const iframe = document.getElementById("preview-iframe");
                  if (iframe) {
                    iframe.srcdoc = compileProjectSource();
                  }
                }}
                className="text-gray-400 hover:text-indigo-400 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <VscRefresh className="text-xs" /> Refresh
              </button>
            </div>
            <div className="flex-1 w-full h-full p-2 bg-[#0c0c0e]">
              <iframe
                id="preview-iframe"
                title="Live Project Preview"
                srcDoc={compileProjectSource()}
                sandbox="allow-scripts"
                className="w-full h-full border border-gray-850 rounded-lg bg-white shadow-xl"
              />
            </div>
          </div>
        )}

        {/* AI review & Complexity side panel */}
        {activeSidePanel && (
          <div className="w-1/2 min-h-0 flex flex-col bg-[#0b0b0d] border-l border-gray-850 text-gray-200 overflow-y-auto p-5 gap-5 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3.5 shrink-0 select-none">
              <div className="flex items-center gap-2">
                {activeSidePanel === "review" ? (
                  <VscSearch className="text-indigo-400 text-lg" />
                ) : (
                  <VscPulse className="text-violet-400 text-lg" />
                )}
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-gray-300">
                  {activeSidePanel === "review" ? "AI Code Review" : "Complexity Statistics"}
                </h3>
              </div>
              <button
                onClick={() => setActiveSidePanel(null)}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1 hover:bg-gray-800/40 rounded cursor-pointer"
              >
                <VscClose className="text-base" />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 select-none">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-12 h-12 rounded-full border-2 border-indigo-500/20 animate-ping"></div>
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500 border-r-2 border-r-transparent"></div>
                </div>
                <p className="text-xs text-gray-400 font-mono animate-pulse tracking-wide">Analyzing workspace logic...</p>
              </div>
            ) : activeSidePanel === "review" && reviewData ? (
              <div className="flex flex-col gap-5 select-text">
                {/* Time & Space Complexity Pills */}
                <div className="flex gap-3">
                  <div className="bg-gradient-to-br from-[#121215] to-[#0c0c0e] border border-gray-800/80 p-3 rounded-xl flex-1 flex flex-col items-center shadow-sm">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-semibold">Time Complexity</span>
                    <span className="text-base font-bold text-indigo-400 mt-1 font-mono">{reviewData.timeComplexity || "O(?)"}</span>
                  </div>
                  <div className="bg-gradient-to-br from-[#121215] to-[#0c0c0e] border border-gray-800/80 p-3 rounded-xl flex-1 flex flex-col items-center shadow-sm">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-semibold">Space Complexity</span>
                    <span className="text-base font-bold text-violet-400 mt-1 font-mono">{reviewData.spaceComplexity || "O(?)"}</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-widest select-none">Summary</span>
                  <div className="bg-[#121215]/60 p-4 rounded-xl border border-gray-850 text-xs leading-relaxed text-gray-300 font-sans">
                    {reviewData.codeSummary}
                  </div>
                </div>

                {/* Bugs */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-widest select-none">Bugs & Issues</span>
                  <div className="bg-[#121215]/60 p-3.5 rounded-xl border border-gray-850 text-xs flex flex-col gap-2.5">
                    {reviewData.bugs && reviewData.bugs.length > 0 ? (
                      reviewData.bugs.map((bug, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start text-rose-400">
                          <VscBug className="text-sm shrink-0 mt-0.5" />
                          <span className="text-gray-300 leading-relaxed">{bug}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-emerald-400 flex gap-2.5 items-center font-mono text-[11px] font-semibold py-1">
                        <VscCheck className="text-sm" />
                        <span>No runtime bugs or defects identified. Code is sound!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Best Practices */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-widest select-none">Best Practices</span>
                  <div className="bg-[#121215]/60 p-4 rounded-xl border border-gray-850 text-xs flex flex-col gap-3">
                    {reviewData.bestPractices?.map((bp, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <VscLightbulb className="text-amber-400 text-sm shrink-0 mt-0.5" />
                        <span className="text-gray-300 leading-relaxed">{bp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimizations */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-widest select-none">Optimizations</span>
                  <div className="bg-[#121215]/60 p-4 rounded-xl border border-gray-850 text-xs flex flex-col gap-3">
                    {reviewData.optimizations?.map((opt, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <FiZap className="text-violet-400 text-sm shrink-0 mt-0.5" />
                        <span className="text-gray-300 leading-relaxed">{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeSidePanel === "complexity" && complexityData ? (
              <div className="flex flex-col gap-5 select-text">
                {/* Time & Space Complexity Pills */}
                <div className="flex gap-3">
                  <div className="bg-gradient-to-br from-[#121215] to-[#0c0c0e] border border-gray-800/80 p-3 rounded-xl flex-1 flex flex-col items-center shadow-sm">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-semibold">Time Complexity</span>
                    <span className="text-base font-bold text-emerald-450 mt-1 font-mono">{complexityData.timeComplexity || "O(?)"}</span>
                  </div>
                  <div className="bg-gradient-to-br from-[#121215] to-[#0c0c0e] border border-gray-800/80 p-3 rounded-xl flex-1 flex flex-col items-center shadow-sm">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-semibold">Space Complexity</span>
                    <span className="text-base font-bold text-emerald-450 mt-1 font-mono">{complexityData.spaceComplexity || "O(?)"}</span>
                  </div>
                </div>

                {/* Metrics 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#121215]/60 border border-gray-850 p-4 rounded-xl flex flex-col relative overflow-hidden group">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider select-none font-semibold">Loops</span>
                    <span className="text-2xl font-bold text-white mt-1.5 font-mono">{complexityData.loops || 0}</span>
                    <VscRefresh className="absolute right-3.5 bottom-3.5 text-gray-800 text-2xl opacity-40 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="bg-[#121215]/60 border border-gray-850 p-4 rounded-xl flex flex-col relative overflow-hidden group">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider select-none font-semibold">Nested Loops</span>
                    <span className="text-2xl font-bold text-rose-450 mt-1.5 font-mono">{complexityData.nestedLoops || 0}</span>
                    <VscPulse className="absolute right-3.5 bottom-3.5 text-gray-800 text-2xl opacity-40 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="bg-[#121215]/60 border border-gray-850 p-4 rounded-xl flex flex-col relative overflow-hidden group">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider select-none font-semibold">Functions</span>
                    <span className="text-2xl font-bold text-blue-400 mt-1.5 font-mono">{complexityData.functions || 0}</span>
                    <VscCode className="absolute right-3.5 bottom-3.5 text-gray-800 text-2xl opacity-40 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="bg-[#121215]/60 border border-gray-850 p-4 rounded-xl flex flex-col relative overflow-hidden group">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider select-none font-semibold">Recursive Calls</span>
                    <span className="text-2xl font-bold text-amber-500 mt-1.5 font-mono">{complexityData.recursiveCalls || 0}</span>
                    <FiZap className="absolute right-3.5 bottom-3.5 text-gray-800 text-2xl opacity-40 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>

                {/* Explanation */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-widest select-none">Complexity Explanation</span>
                  <div className="bg-[#121215]/60 p-4 rounded-xl border border-gray-850 text-xs leading-relaxed text-gray-300 font-sans border-l-4 border-l-violet-500/80">
                    {complexityData.explanation}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-rose-450 bg-rose-950/20 border border-rose-900/30 p-4 rounded-xl text-center font-mono leading-relaxed select-none">
                <span className="block font-bold mb-1.5 text-sm">⚠️ Configuration Required</span>
                AI analysis failed to load. Please configure your <code className="bg-rose-950/40 px-1 py-0.5 rounded text-white text-[10px]">GEMINI_API_KEY</code> inside the server configuration folder and restart.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output Panel (VS Code Styled Terminal Console) */}
      <div className="h-44 border-t border-gray-850 bg-[#070709] flex flex-col shrink-0">
        <div className="px-5 py-2 text-[10px] text-gray-500 font-bold uppercase border-b border-gray-900 tracking-wider flex justify-between items-center bg-[#0d0d10] select-none shrink-0">
          <span className="flex items-center gap-1.5 font-mono text-gray-400">
            <VscTerminal className="text-sm" /> Console Output
          </span>
          <button
            onClick={() => setOutput("")}
            className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 text-[10px] font-mono cursor-pointer bg-gray-900 hover:bg-gray-800 px-2 py-0.5 rounded border border-gray-800/80"
          >
            <VscTrash className="text-xs" /> Clear
          </button>
        </div>
        <div className="flex-1 p-4 text-[#4ade80] font-mono text-xs overflow-y-auto whitespace-pre-wrap leading-relaxed select-text custom-scrollbar selection:bg-[#4ade80]/15 selection:text-emerald-300">
          {output ? (
            <div className="flex items-start gap-1">
              <span className="text-gray-600 select-none mr-1">~$</span>
              <span>{output}</span>
            </div>
          ) : (
            <div className="text-gray-650 flex flex-col gap-1.5 select-none py-1">
              <div className="flex items-center gap-2 text-gray-500 font-bold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse"></span>
                <span>CodeCollab Terminal Shell v1.2.0</span>
              </div>
              <p className="text-[11px] text-gray-600 font-medium">Type Node.js (JavaScript) or Python scripts and click "Run Code" to observe logs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomCodeEditor;
