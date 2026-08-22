import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { IoSend } from "react-icons/io5";
import CodeEditor from "../components/CodeEditor";
import { io } from "socket.io-client";
import { getUserData } from "../data/getUserData";
import { debounce } from "lodash";
import { VscBook, VscFiles, VscComment, VscPlug } from "react-icons/vsc";
import { resolveApiUrl } from "../config";

const API_URL = resolveApiUrl();

function Project() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [chat, setChat] = useState([]);
  const [text, setText] = useState("");
  const [userData, setUserData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [remoteRunTrigger, setRemoteRunTrigger] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  
  const [files, setFiles] = useState({
    "main.js": "console.log('Hello World')",
  });
  const [activeFile, setActiveFile] = useState("main.js");

  const saveFileToDB = async (fileName, content) => {
    try {
      await axios.put(
        `${API_URL}/api/project/file/${projectId}`,
        {
          fileName,
          content,
        },
        { withCredentials: true },
      );
    } catch (error) {
      console.log(error);
    }
  };

  const debounceRef = useRef(
    debounce((fileName, content) => saveFileToDB(fileName, content), 500),
  );

  useEffect(() => {
    if (!projectId) return;

    axios
      .get(`${API_URL}/api/project/files/${projectId}`, {
        withCredentials: true,
      })
      .then((res) => {
        const fileObject = {};
        res.data?.forEach((file) => {
          fileObject[file.name] = file.content;
        });

        setFiles(fileObject);

        if (res.data?.length > 0) {
          setActiveFile(res.data[0].name);
        }
      });
  }, [projectId, API_URL]);

  useEffect(() => {
    const socket = io(API_URL, {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("recive-message", (newMessage) => {
      setChat((prev) => [...prev, newMessage]);
    });

    socket.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("code-change", ({ fileName, content }) => {
      setFiles((prev) => {
        if (prev[fileName] !== content) {
          return {
            ...prev,
            [fileName]: content,
          };
        }
        return prev;
      });
    });

    socket.on("file-create", ({ fileName, content }) => {
      setFiles((prev) => ({
        ...prev,
        [fileName]: content,
      }));
    });

    socket.on("run-code", ({ fileName }) => {
      setRemoteRunTrigger({ fileName, timestamp: Date.now() });
    });

    return () => {
      socket.disconnect();
    };
  }, [API_URL]);

  useEffect(() => {
    if (!projectId || !userData || !socketRef.current) return;
    
    socketRef.current.emit("join-project", {
      projectId,
      user: { _id: userData._id, name: userData.name },
    });
  }, [projectId, userData]);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = await getUserData(navigate);
      setUserData(user);
    };

    fetchUserData();
  }, [navigate]);

  const createFile = async () => {
    const fileName = prompt("Enter file name (e.g. index.html, style.css, app.py):");
    if (!fileName) return;

    if (files[fileName] !== undefined) {
      alert("File already Exists.");
      return;
    }

    try {
      await saveFileToDB(fileName, "");
      setFiles((prev) => ({ ...prev, [fileName]: "" }));
      setActiveFile(fileName);

      socketRef.current.emit("file-create", {
        projectId,
        fileName,
        content: "",
      });
    } catch (error) {
      console.error("Error creating file:", error);
    }
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    const userName = userData?.name;
    const userId = userData?._id;
    socketRef.current.emit("send-message", {
      projectId,
      userName,
      userId,
      text,
    });
    setText("");
  };

  useEffect(() => {
    if (!projectId) return;
    axios
      .get(`${API_URL}/api/project/data/${projectId}`, {
        withCredentials: true,
      })
      .then((res) => setData(res.data));
  }, [projectId, API_URL]);

  useEffect(() => {
    if (!projectId) return;
    axios
      .get(
        `${API_URL}/api/project/messages/${projectId}`,
        { withCredentials: true },
      )
      .then((res) => setChat(res.data));
  }, [projectId, API_URL]);

  // Extension specific file icons helper
  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    switch (ext) {
      case "html":
        return <span className="text-orange-500 font-extrabold text-[10px] select-none border border-orange-500/20 px-1 rounded bg-orange-950/20 font-mono">HTML</span>;
      case "css":
        return <span className="text-blue-400 font-extrabold text-[10px] select-none border border-blue-500/20 px-1 rounded bg-blue-950/20 font-mono">CSS</span>;
      case "js":
      case "jsx":
        return <span className="text-yellow-500 font-extrabold text-[10px] select-none border border-yellow-500/20 px-1.5 rounded bg-yellow-950/20 font-mono">JS</span>;
      case "ts":
      case "tsx":
        return <span className="text-sky-500 font-extrabold text-[10px] select-none border border-sky-500/20 px-1 rounded bg-sky-950/20 font-mono">TS</span>;
      case "py":
        return <span className="text-emerald-450 font-extrabold text-[10px] select-none border border-emerald-500/20 px-1.5 rounded bg-emerald-950/20 font-mono">PY</span>;
      case "json":
        return <span className="text-amber-400 font-extrabold text-[10px] select-none border border-amber-500/20 px-1 rounded bg-amber-950/20 font-mono">JSON</span>;
      case "md":
        return <span className="text-gray-400 font-extrabold text-[10px] select-none border border-gray-500/20 px-1 rounded bg-gray-950/20 font-mono">MD</span>;
      default:
        return <span className="text-indigo-400 font-extrabold text-[10px] select-none border border-indigo-500/20 px-1.5 rounded bg-indigo-950/20 font-mono">TXT</span>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0c0c0e] text-gray-200 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-[#101012] border-b border-gray-800/80 flex items-center px-6 h-14 justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-extrabold text-indigo-400 text-lg hover:text-indigo-300 transition flex items-center gap-1.5">
            <VscBook className="text-xl" /> CodeCollab
          </Link>
          <span className="text-gray-700 font-mono">/</span>
          <span className="font-semibold text-gray-300 text-sm">{data?.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2" title="Connected"></span>
        </div>
        
        {/* Online Users List */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono hidden sm:inline flex items-center gap-1">
            <VscPlug className="text-sm" /> Connected:
          </span>
          <div className="flex -space-x-2">
            {onlineUsers.map((user, idx) => (
              <div
                key={idx}
                className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white text-[10px] flex items-center justify-center font-bold border-2 border-[#101012] hover:scale-110 hover:z-20 transition-all duration-300 shadow-md cursor-default select-none"
                title={`${user.name} is active`}
              >
                {user.name ? user.name.slice(0, 2).toUpperCase() : "??"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        
        {/* Room Chat Sidebar (Discord-style) */}
        <div className="w-80 bg-[#101012] flex flex-col border-r border-gray-850 shrink-0">
          <div className="h-12 flex items-center border-b border-gray-850 font-semibold px-4 text-gray-300 justify-between text-xs font-mono uppercase tracking-wider select-none shrink-0">
            <span className="flex items-center gap-1.5 text-gray-400"><VscComment className="text-sm" /> Room Chat</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-900 text-indigo-400 border border-gray-800 text-[10px]">
              {chat.length} msgs
            </span>
          </div>

          {/* Message List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {chat?.map((m) => (
              <div
                key={m._id}
                className="bg-[#16161a] border border-gray-850 rounded-xl p-3 shadow-sm hover:border-gray-800 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-1.5 select-none">
                  <p className="text-[11px] text-indigo-400 font-bold font-mono">
                    {m.userName}
                  </p>
                  <span className="text-[9px] text-gray-600 font-mono">
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-300 break-words leading-relaxed font-sans select-text">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Send Area */}
          <div className="p-3 border-t border-gray-850 flex bg-[#0c0c0e] items-center gap-2 shrink-0">
            <input
              className="flex-1 bg-[#16161a] text-gray-200 border border-gray-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 font-sans"
              type="text"
              placeholder="Message room..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition duration-200 cursor-pointer shadow-md shrink-0"
            >
              <IoSend className="text-sm" />
            </button>
          </div>
        </div>

        {/* Files Panel (VS Code File Explorer style) */}
        <div className="w-56 bg-[#09090b] flex flex-col border-r border-gray-850 shrink-0">
          <div className="h-12 px-4 font-semibold border-b border-gray-850 flex items-center justify-between text-gray-300 text-xs font-mono uppercase tracking-wider select-none shrink-0">
            <span className="flex items-center gap-1.5 text-gray-400"><VscFiles className="text-sm" /> Files</span>
            <button
              onClick={createFile}
              className="bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-400 px-2 py-0.5 text-[10px] font-semibold border border-indigo-900/30 rounded transition cursor-pointer select-none"
            >
              + Add
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
            {Object.keys(files).map((fileName) => {
              const isActive = activeFile === fileName;
              return (
                <div
                  key={fileName}
                  onClick={() => {
                    setActiveFile(fileName);
                    socketRef.current.emit("file-select", {
                      projectId,
                      userName: userData?.name,
                      fileName,
                    });
                  }}
                  className={`group cursor-pointer py-2 px-3 rounded-lg flex items-center justify-between transition-all select-none ${
                    isActive
                      ? "bg-[#18181c] text-indigo-400 border-l-2 border-indigo-500 font-semibold"
                      : "text-gray-500 hover:bg-[#101012] hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full">
                    {getFileIcon(fileName)}
                    <span className="truncate text-xs font-mono font-medium">{fileName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Code Editor Panel */}
        <div className="flex-1 min-h-0 flex bg-[#1e1e1e]">
          <CodeEditor
            socketRef={socketRef}
            projectId={projectId}
            files={files}
            remoteRunTrigger={remoteRunTrigger}
            code={files[activeFile] || ""}
            setCode={(newCode) => {
              setFiles((prev) => ({
                ...prev,
                [activeFile]: newCode,
              }));
              socketRef.current.emit("code-change", {
                projectId,
                fileName: activeFile,
                content: newCode,
              });
              debounceRef.current(activeFile, newCode);
            }}
            fileName={activeFile}
          />
        </div>
      </div>
    </div>
  );
}

export default Project;
