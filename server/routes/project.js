import { Router } from "express";
import Project from "../model/Project.js";
import Message from "../model/Message.js";
import crypto from "crypto";
import { verifyToken } from "../middleware/verifyToken.js";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
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

// Endpoint to expose Judge0 language mappings to frontend
router.get("/judge0-languages", async (req, res) => {
  try {
    const JUDGE0_URL = process.env.JUDGE0_URL;

    const entries = Object.entries(JUDGE0_LANGUAGE_MAP);

    if (JUDGE0_URL) {
      const url = `${JUDGE0_URL.replace(/\/$/, "")}/languages`;
      const resp = await fetch(url);
      if (!resp.ok) {
        return res.status(502).json({ message: "Failed to fetch languages from Judge0" });
      }
      const judgeLangs = await resp.json();

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

  const detectedLanguage = (language || getLanguageFromFileName(fileName) || "").toLowerCase();

  if (!detectedLanguage || !SUPPORTED_RUNTIME_LANGUAGES.has(detectedLanguage)) {
    return res.status(400).json({
      error: `Language ${detectedLanguage || fileName || "unknown"} is not supported for code execution.`,
    });
  }

  const JUDGE0_URL = process.env.JUDGE0_URL;

  try {
    if (JUDGE0_URL) {
      const judge0Language = JUDGE0_LANGUAGE_MAP[detectedLanguage];
      if (!judge0Language) {
        return res.status(400).json({ error: `Language ${detectedLanguage} not supported by Judge0 mapping.` });
      }

      const submissionsUrl = `${JUDGE0_URL.replace(/\/$/, "")}/submissions?base64_encoded=false&wait=true`;

      const response = await fetch(submissionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: judge0Language.id,
          stdin: stdin || "",
          cpu_time_limit: 5,
          memory_limit: 512000,
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        return res.status(502).json({ error: `Judge0 error: ${response.status} ${txt}` });
      }

      const result = await response.json();
      const output = [result.stdout, result.stderr, result.compile_output, result.message]
        .filter(Boolean)
        .join("\n");

      return res.json({
        output: output || "Execution completed successfully with no output.",
        raw: result,
      });
    }

    const tempDir = path.join(process.cwd(), "temp_runs");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileId = crypto.randomBytes(8).toString("hex");
    let fileNameForRun = "";
    let runCommand = "";

    switch (detectedLanguage) {
      case "python":
        fileNameForRun = `run_${fileId}.py`;
        runCommand = `python "${path.join(tempDir, fileNameForRun)}"`;
        break;
      case "javascript":
      case "typescript":
        fileNameForRun = `run_${fileId}.js`;
        runCommand = `node "${path.join(tempDir, fileNameForRun)}"`;
        break;
      default:
        return res.status(400).json({ error: `Language ${detectedLanguage} not supported for local backend execution.` });
    }

    const filePath = path.join(tempDir, fileNameForRun);

    try {
      fs.writeFileSync(filePath, code);

      exec(runCommand, { timeout: 5000 }, (error, stdout, stderr) => {
        fs.unlink(filePath, () => {});

        if (error && error.killed) {
          return res.json({ output: "Error: Execution timed out (exceeded 5 seconds limit)." });
        }

        const output = stdout + stderr;
        return res.json({ output: output || "Execution completed successfully with no output." });
      });
    } catch (err) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({ error: "Server execution error: " + err.message });
    }
  } catch (err) {
    console.error("Run-code handler error:", err);
    return res.status(500).json({ error: "Execution failed: " + err.message });
  }
});

export default router;
