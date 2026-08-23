export const LANGUAGE_BY_EXTENSION = Object.freeze({
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "javascript",

  ".ts": "typescript",
  ".tsx": "typescript",

  ".py": "python",

  ".c": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",

  ".java": "java",

  ".go": "go",

  ".rs": "rust",

  ".php": "php",

  ".rb": "ruby",

  ".kt": "kotlin",

  ".swift": "swift",

  ".html": "html",
  ".css": "css",
  ".json": "json",
  ".md": "markdown",
});

export const LANGUAGE_LABELS = Object.freeze({
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  ruby: "Ruby",
  kotlin: "Kotlin",
  swift: "Swift",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  markdown: "Markdown",
});

export const SUPPORTED_RUNTIME_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "python",
  "c",
  "cpp",
  "java",
  "go",
  "rust",
  "php",
  "ruby",
  "kotlin",
  "swift",
]);

export const JUDGE0_LANGUAGE_MAP = Object.freeze({
  javascript: { id: 63, name: "JavaScript" },
  typescript: { id: 74, name: "TypeScript" },
  python: { id: 71, name: "Python" },
  c: { id: 50, name: "C" },
  cpp: { id: 54, name: "C++" },
  java: { id: 62, name: "Java" },
  go: { id: 60, name: "Go" },
  rust: { id: 73, name: "Rust" },
  php: { id: 68, name: "PHP" },
  ruby: { id: 72, name: "Ruby" },
  kotlin: { id: 78, name: "Kotlin" },
  swift: { id: 83, name: "Swift" },
});

export function getLanguageFromFileName(fileName) {
  if (!fileName || typeof fileName !== "string") return null;

  const trimmedName = fileName.trim();
  if (!trimmedName || !trimmedName.includes(".")) return null;

  const extension = `.${trimmedName.split(".").pop().toLowerCase()}`;
  return LANGUAGE_BY_EXTENSION[extension] || null;
}
