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

export function getLanguageFromFileName(fileName) {
  if (!fileName || typeof fileName !== "string") return null;

  const trimmedName = fileName.trim();
  if (!trimmedName || !trimmedName.includes(".")) return null;

  const extension = `.${trimmedName.split(".").pop().toLowerCase()}`;
  return LANGUAGE_BY_EXTENSION[extension] || null;
}
