import express from "express";
import { ENV } from "./lib/ENV.js";
import { connectDB } from "./lib/connectDB.js";
import userRoute from "./routes/user.js";
import projectRoute from "./routes/project.js";
import analyticsRoute from "./routes/analytics.js";
import aiRoute from "./routes/ai.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import http from "node:http";
import socketHandler from "./socket/socketHandler.js";
const app = express();
const server = http.createServer(app);

app.use(express.json());
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://0.0.0.0:5173",
  "https://code-collab-platform-ten.vercel.app",
  "https://code-collab-delta-umber.vercel.app",
];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  // Allow any Vercel deployment frontend for this project, plus local/LAN dev origins.
  return (
    /^https:\/\/.*\.vercel\.app$/i.test(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("http://192.168.") ||
    origin.startsWith("http://10.") ||
    origin.startsWith("http://172.")
  );
};

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

app.set("io", io);

socketHandler(io);

app.use("/api", userRoute);
app.use("/api/project", projectRoute);
app.use("/api", analyticsRoute);
app.use("/api", aiRoute);
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const startServer = async () => {
  try {
    await connectDB();

    const preferredPort = Number(ENV.PORT || 5000);
    const fallbackPorts = [preferredPort, 5001, 5002, 5003, 5050, 6000];

    const listenOnPort = (port) =>
      new Promise((resolve, reject) => {
        const onError = (error) => {
          server.removeListener("listening", onListening);
          reject(error);
        };

        const onListening = () => {
          server.removeListener("error", onError);
          console.log("Server running on port", port, "on 0.0.0.0");
          resolve();
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, "0.0.0.0");
      });

    let lastError = null;
    for (const port of fallbackPorts) {
      try {
        await listenOnPort(port);
        return;
      } catch (error) {
        lastError = error;
        if (error.code !== "EADDRINUSE") {
          throw error;
        }
      }
    }

    throw new Error(
      `No free port available. Last error: ${lastError?.message || "port is in use"}`,
    );
  } catch (error) {
    console.error("Server startup failed:", error.message || error);
    process.exit(1);
  }
};

startServer();
