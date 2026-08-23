import { Router } from "express";
import Project from "../model/Project.js";
import Message from "../model/Message.js";
import crypto from "crypto";
import { verifyToken } from "../middleware/verifyToken.js";
import { ENV } from "../lib/ENV.js";
import {
  JUDGE0_LANGUAGE_MAP,
  LANGUAGE_LABELS,
  SUPPORTED_RUNTIME_LANGUAGES,
  getLanguageFromFileName,
} from "../lib/languageConfig.js";

const router = Router();

const getFrontendUrl = (req) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = req.headers.origin;

  if (origin) return origin.replace(/\/$/, "");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
};

router.post("/create", async (req, res) => {
  try {
    const { name, userId } = req.body;
    const project = await Project.create({ name, userId });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json(error);
  }
});
// get all project for showing in frontend
router.get("/all/:userId", async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ userId: req.params.userId }, { members: req.params.userId }],
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ messages: "Server Error" });
  }
});

router.get("/data/:projectId", async (req, res) => {
  try {
    const projectData = await Project.findById(req.params.projectId);
    res.json(projectData);
  } catch (error) {
    res.status(500).json({ messages: "Server Error" });
  }
});

router.get("/messages/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const messages = await Message.find({ projectId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.post("/invite-link/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { userId } = req.body;

    const project = await Project.findById(projectId);

    if (!project) return res.status(404).json({ message: "Invalid Link" });
    if (project.userId !== userId) {
      res.status(403).json({ message: "Not Allowed (For Owner Only)." });
    }

    const token = crypto.randomBytes(32).toString("hex");

    project.inviteToken = token;
    project.inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await project.save();

    const frontendUrl = getFrontendUrl(req);
    res.json({ inviteLink: `${frontendUrl}/invite/${token}` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/invite-project/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const project = await Project.findOne({ inviteToken: token });

    if (!project) return res.status(404).json({ message: "Invalid Link" });

    if (project.inviteExpires < Date.now()) {
      return res.status(400).json({ message: "Link Expired" });
    }

    return res.json({
      projectId: project._id,
      projectName: project.name,
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

const JUDGE0_STATUS_MAP = {
  1: "In Queue",
  2: "Processing",
  3: "Accepted",
  4: "Wrong Answer",
  5: "Time Limit Exceeded",
  6: "Compilation Error",
  7: "Runtime Error",
  8: "Runtime Error",
  9: "Internal Error",
  10: "Exec Time Limit Exceeded",
  11: "Memory Limit Exceeded",
  12: "Output Limit Exceeded",
  13: "Not Allowed",
  14: "Hidden Test Failed",
  15: "Rejected",
  16: "Skipped",
  17: "Unknown",
};

const JUDGE0_LANGUAGE_ALIASES = {
  javascript: ["javascript", "nodejs", "node.js", "js"],
  typescript: ["typescript", "ts"],
  python: ["python", "python3", "py"],
  c: ["c"],
  cpp: ["cpp", "c++", "cplusplus", "cc", "cxx"],
  java: ["java"],
  go: ["go"],
  rust: ["rust", "rs"],
  php: ["php"],
  ruby: ["ruby", "rb"],
  kotlin: ["kotlin", "kt"],
  swift: ["swift"],
};

const judge0Cache = { expiresAt: 0, languages: [] };

const normalizeJudge0Token = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const getJudge0BaseUrl = () => (ENV.JUDGE0_API_URL || ENV.JUDGE0_URL || "").replace(/\/$/, "");

const parseExtraHeaders = () => {
  const raw = (ENV.JUDGE0_EXTRA_HEADERS || "").trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const getJudge0Headers = () => {
  const apiKey = (ENV.JUDGE0_API_KEY || "").trim();
  const headerName = (ENV.JUDGE0_AUTH_HEADER || "X-Auth-Token").trim();
  const authType = (ENV.JUDGE0_AUTH_TYPE || "token").trim().toLowerCase();
  const hostHeaderName = (ENV.JUDGE0_HOST_HEADER || "x-rapidapi-host").trim();
  const hostValue = (ENV.JUDGE0_HOST || "").trim();
  const extraHeaders = parseExtraHeaders();

  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (!apiKey) {
    if (hostValue && hostHeaderName) {
      headers[hostHeaderName] = hostValue;
    }
    return headers;
  }

  if (authType === "bearer") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (headerName.toLowerCase() === "authorization") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers[headerName] = apiKey;
  }

  if (hostValue && hostHeaderName) {
    headers[hostHeaderName] = hostValue;
  }

  return headers;
};

const getOneCompilerBaseUrl = () => (ENV.ONECOMPILER_API_URL || "").replace(/\/$/, "");

const getOneCompilerHeaders = () => {
  const apiKey = (ENV.ONECOMPILER_API_KEY || "").trim();
  const authHeader = (ENV.ONECOMPILER_AUTH_HEADER || "Authorization").trim();
  const authType = (ENV.ONECOMPILER_AUTH_TYPE || "bearer").trim().toLowerCase();
  const extraHeaders = (() => {
    const raw = (ENV.ONECOMPILER_EXTRA_HEADERS || "").trim();
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  })();

  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (!apiKey) return headers;

  if (authType === "bearer" || authHeader.toLowerCase() === "authorization") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers[authHeader] = apiKey;
  }

  return headers;
};

const oneCompilerCandidateEndpoints = [
  "/api/execute",
  "/api/compile",
  "/api/run",
  "/api/v1/execute",
  "/api/v1/run",
  "/execute",
  "/run",
  "/api/compile-result",
];

const oneCompilerCandidateBodies = [
  (language, code, stdin) => ({ language, code, stdin }),
  (language, code, stdin) => ({ language, source: code, stdin }),
  (language, code, stdin) => ({ language, source_code: code, stdin }),
  (language, code, stdin) => ({ language, script: code, stdin }),
  (language, code, stdin) => ({ code, stdin, language }),
  (language, code, stdin) => ({ source: code, stdin, language }),
];

const extractOneCompilerOutput = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { stdout: "", stderr: "", compileOutput: "", status: "Unknown" };
  }

  const candidateKeys = [
    "stdout",
    "stderr",
    "compile_output",
    "compileOutput",
    "output",
    "result",
    "data",
    "response",
    "message",
    "status",
    "state",
    "run",
    "execution",
  ];

  const visited = new Set();

  const readString = (value) => {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return trimmed;
  };

  const readNested = (node) => {
    if (!node || typeof node !== "object") {
      return { stdout: "", stderr: "", compileOutput: "", status: "Unknown" };
    }

    if (visited.has(node)) {
      return { stdout: "", stderr: "", compileOutput: "", status: "Unknown" };
    }
    visited.add(node);

    const directStdout = readString(node.stdout);
    const directStderr = readString(node.stderr);
    const directCompile = readString(node.compile_output || node.compileOutput);
    const directStatus = readString(node.status || node.state || node.message || "");

    if (directStdout || directStderr || directCompile) {
      return {
        stdout: directStdout,
        stderr: directStderr,
        compileOutput: directCompile,
        status: directStatus || "Completed",
      };
    }

    for (const key of candidateKeys) {
      const value = node[key];
      if (typeof value === "string" && value.trim()) {
        return {
          stdout: key === "stdout" ? value.trim() : "",
          stderr: key === "stderr" ? value.trim() : "",
          compileOutput: key === "compile_output" || key === "compileOutput" ? value.trim() : "",
          status: node.status || node.state || "Completed",
        };
      }

      if (value && typeof value === "object") {
        const nested = readNested(value);
        if (nested.stdout || nested.stderr || nested.compileOutput) {
          return nested;
        }
      }
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        const nested = readNested(value);
        if (nested.stdout || nested.stderr || nested.compileOutput) {
          return nested;
        }
      }
    }

    return { stdout: "", stderr: "", compileOutput: "", status: directStatus || "Completed" };
  };

  const output = readNested(payload);
  return {
    stdout: output.stdout || "",
    stderr: output.stderr || "",
    compileOutput: output.compileOutput || "",
    status: output.status || "Completed",
  };
};

const executeOneCompiler = async (language, code, stdin) => {
  const baseUrl = getOneCompilerBaseUrl();
  if (!baseUrl) {
    throw new Error("OneCompiler API is not configured.");
  }

  const headers = getOneCompilerHeaders();
  const requestBodies = oneCompilerCandidateBodies.map((builder) => builder(language, code, stdin));

  let lastError = null;

  for (const endpoint of oneCompilerCandidateEndpoints) {
    const url = `${baseUrl}${endpoint}`;
    for (const body of requestBodies) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        const text = await response.text();
        const parsed = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

        if (!response.ok) {
          lastError = `OneCompiler request failed at ${endpoint}: ${response.status} ${text}`;
          continue;
        }

        if (!parsed) {
          lastError = `OneCompiler responded without JSON at ${endpoint}`;
          continue;
        }

        const output = extractOneCompilerOutput(parsed);
        const combinedOutput = [output.stdout, output.stderr, output.compileOutput].filter(Boolean).join("\n\n").trim();
        return {
          success: true,
          status: output.status || "Completed",
          stdout: output.stdout || "",
          stderr: output.stderr || "",
          compileOutput: output.compileOutput || "",
          output: combinedOutput,
          raw: parsed,
        };
      } catch (error) {
        lastError = error.message;
      }
    }
  }

  throw new Error(lastError || "OneCompiler execution failed.");
};

const fetchJudge0Languages = async () => {
  const baseUrl = getJudge0BaseUrl();
  if (!baseUrl) return [];

  const now = Date.now();
  if (judge0Cache.languages.length && now < judge0Cache.expiresAt) {
    return judge0Cache.languages;
  }

  const response = await fetch(`${baseUrl}/languages`, {
    method: "GET",
    headers: getJudge0Headers(),
  });

  if (!response.ok) {
    throw new Error(`Judge0 /languages request failed: ${response.status}`);
  }

  const data = await response.json();
  judge0Cache.languages = Array.isArray(data) ? data : [];
  judge0Cache.expiresAt = Date.now() + 5 * 60 * 1000;
  return judge0Cache.languages;
};

const resolveJudge0LanguageId = async (languageKey) => {
  const normalizedLanguage = String(languageKey || "").trim().toLowerCase();
  if (!normalizedLanguage) return null;

  try {
    const languages = await fetchJudge0Languages();
    const aliases = JUDGE0_LANGUAGE_ALIASES[normalizedLanguage] || [normalizedLanguage];

    for (const alias of aliases) {
      const normalizedAlias = normalizeJudge0Token(alias);

      const match = languages.find((language) => {
        const languageName = normalizeJudge0Token(language.name || "");
        const languageLabel = normalizeJudge0Token(language.label || "");
        const languageLongName = normalizeJudge0Token(language.language || "");

        return (
          languageName === normalizedAlias ||
          languageLabel === normalizedAlias ||
          languageLongName === normalizedAlias ||
          languageName.includes(normalizedAlias) ||
          normalizedAlias.includes(languageName)
        );
      });

      if (match) return Number(match.id);
    }
  } catch (error) {
    console.error("Judge0 language resolution failed:", error.message);
  }

  return null;
};

// Endpoint to expose Judge0 language mappings to frontend
router.get("/judge0-languages", async (req, res) => {
  try {
    const entries = Object.entries(JUDGE0_LANGUAGE_MAP);

    const baseUrl = getJudge0BaseUrl();
    if (baseUrl) {
      const judgeLangs = await fetchJudge0Languages();

      const result = entries.map(([key, value]) => ({
        key,
        name: LANGUAGE_LABELS[key] || value.name,
        judge0_id: value.id,
        available: judgeLangs.some((l) => Number(l.id) === Number(value.id)),
      }));

      return res.json(result);
    }

    const fallback = entries.map(([key, value]) => ({
      key,
      name: LANGUAGE_LABELS[key] || value.name,
      judge0_id: value.id,
      available: false,
    }));

    return res.json(fallback);
  } catch (error) {
    console.error("judge0-languages error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

router.post("/invite-join/:token", verifyToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId;

    const project = await Project.findOne({ inviteToken: token });

    if (!project) return res.status(404).json({ message: "Invalid Token" });

    if (project.members.includes(userId))
      return res.status(200).json({ message: "Already Exist." });

    project.members.push(userId);

    await project.save();
    return res.status(200).json({ message: "Joined successfully." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
});

router.put("/file/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const { fileName, content } = req.body;

  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const file = project.files.find((f) => f.name === fileName);
    if (file) {
      file.content = content;
    } else {
      project.files.push({ name: fileName, content });
    }

    await project.save();

    res.status(201).json({ message: "File saved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error saving file." });
  }
});

router.get("/files/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    res.json(project.files);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post("/run-code", async (req, res) => {
  const { language, fileName, code, stdin } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided." });
  }

  const detectedLanguage = String(language || getLanguageFromFileName(fileName) || "").toLowerCase();

  if (!detectedLanguage || !SUPPORTED_RUNTIME_LANGUAGES.has(detectedLanguage)) {
    return res.status(400).json({
      error: `Language ${detectedLanguage || fileName || "unknown"} is not supported for code execution.`,
    });
  }

  const oneCompilerBaseUrl = getOneCompilerBaseUrl();
  if (oneCompilerBaseUrl) {
    try {
      const result = await executeOneCompiler(detectedLanguage, code, stdin || "");
      return res.json(result);
    } catch (error) {
      console.error("OneCompiler execution failed:", error);
      return res.status(502).json({
        error: "OneCompiler execution failed: " + error.message,
      });
    }
  }

  const baseUrl = getJudge0BaseUrl();
  if (!baseUrl) {
    return res.status(500).json({
      error: "OneCompiler API is not configured. Add ONECOMPILER_API_URL and ONECOMPILER_API_KEY to the backend environment.",
    });
  }

  try {
    const judge0LanguageId = await resolveJudge0LanguageId(detectedLanguage);
    if (!judge0LanguageId) {
      return res.status(400).json({
        error: `Language ${detectedLanguage} is not available on the configured Judge0 service.`,
      });
    }

    const submissionResponse = await fetch(`${baseUrl}/submissions`, {
      method: "POST",
      headers: getJudge0Headers(),
      body: JSON.stringify({
        source_code: code,
        language_id: judge0LanguageId,
        stdin: stdin || "",
        cpu_time_limit: 5,
        memory_limit: 512000,
      }),
    });

    if (!submissionResponse.ok) {
      const text = await submissionResponse.text();
      return res.status(502).json({ error: `Judge0 submission error: ${submissionResponse.status} ${text}` });
    }

    const submissionResult = await submissionResponse.json();
    const token = submissionResult.token;

    if (!token) {
      return res.status(502).json({ error: "Judge0 did not return a submission token." });
    }

    let statusResult = null;
    const maxAttempts = 25;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const pollResponse = await fetch(`${baseUrl}/submissions/${token}?base64_encoded=false`, {
        method: "GET",
        headers: getJudge0Headers(),
      });

      if (!pollResponse.ok) {
        const text = await pollResponse.text();
        return res.status(502).json({ error: `Judge0 polling error: ${pollResponse.status} ${text}` });
      }

      statusResult = await pollResponse.json();
      const statusId = Number(statusResult?.status?.id ?? 0);

      if (statusId >= 3) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (!statusResult) {
      return res.status(502).json({ error: "Judge0 execution did not return a result." });
    }

    const statusId = Number(statusResult?.status?.id ?? 0);
    const statusLabel = JUDGE0_STATUS_MAP[statusId] || statusResult?.status?.description || "Unknown";
    const stdout = statusResult.stdout || "";
    const stderr = statusResult.stderr || "";
    const compileOutput = statusResult.compile_output || "";

    const success = statusId === 3;

    const combinedOutput = [stdout, stderr, compileOutput].filter(Boolean).join("\n\n").trim();

    return res.json({
      success,
      status: statusLabel,
      stdout,
      stderr,
      compileOutput,
      output: combinedOutput,
      time: statusResult.time ?? null,
      memory: statusResult.memory ?? null,
      token,
      raw: statusResult,
    });
  } catch (error) {
    console.error("Run-code handler error:", error);
    return res.status(500).json({ error: "Execution failed: " + error.message });
  }
});

export default router;
