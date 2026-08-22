import { Router } from "express";
import Project from "../model/Project.js";
import Message from "../model/Message.js";
import crypto from "crypto";
import { verifyToken } from "../middleware/verifyToken.js";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

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
  const { language, code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "No code provided." });
  }

  // Create a temporary folder inside the server directory
  const tempDir = path.join(process.cwd(), "temp_runs");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileId = crypto.randomBytes(8).toString("hex");
  let fileName = "";
  let runCommand = "";

  switch (language) {
    case "python":
      fileName = `run_${fileId}.py`;
      runCommand = `python "${path.join(tempDir, fileName)}"`;
      break;
    case "javascript":
      fileName = `run_${fileId}.js`;
      runCommand = `node "${path.join(tempDir, fileName)}"`;
      break;
    default:
      return res.status(400).json({ error: `Language ${language} not supported for backend execution.` });
  }

  const filePath = path.join(tempDir, fileName);

  try {
    fs.writeFileSync(filePath, code);

    // Run the script with a 5-second timeout limit
    exec(runCommand, { timeout: 5000 }, (error, stdout, stderr) => {
      // Clean up the temp file immediately
      fs.unlink(filePath, () => {});

      if (error && error.killed) {
        return res.json({ output: "Error: Execution timed out (exceeded 5 seconds limit)." });
      }

      const output = stdout + stderr;
      res.json({ output: output || "✓ Execution completed successfully with no console output." });
    });
  } catch (err) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ error: "Server execution error: " + err.message });
  }
});

export default router;
