import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { IoPersonAdd } from "react-icons/io5";
import { getUserData } from "../data/getUserData";
import { resolveApiUrl, resolveFrontendUrl } from "../config";

const Dashboard = () => {
  const API_URL = resolveApiUrl();
  const FRONTEND_URL = resolveFrontendUrl();
  const [data, setData] = useState("");
  const navigate = useNavigate();
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const userId = data?._id;
  const [popup, setPopup] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  let [copied, setCopied] = useState(false);
  let [error, setError] = useState(null);

  useEffect(() => {
    setError(null);

    const fetchUserData = async () => {
      try {
        const user = await getUserData(navigate);
        setData(user);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await axios.post(
        `${API_URL}/api/project/create`,
        {
          name: projectName,
          userId,
        },
        { withCredentials: true },
      );

      setProjects([...projects, res.data]);
      setProjectName("");
      setPopup(false);
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    if (!userId) return;
    setError(null);
    const fetchAllProjectData = async () => {
      try {
        let res = await axios.get(
          `${API_URL}/api/project/all/${userId}`,
          {
            withCredentials: true,
          },
        );
        setProjects(res.data);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchAllProjectData();
  }, [userId, API_URL]);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200 px-6 py-10 relative overflow-hidden font-sans">
      {/* Abstract Glowing Accent Blobs */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-purple-600/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Overlay background for Modals */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"></div>
      )}

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto bg-gradient-to-r from-indigo-950/10 to-purple-950/10 border border-gray-800/80 rounded-3xl p-8 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{data?.name || "Developer"}</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-mono">Ready to write some code? Join or create a collaborative room.</p>
        </div>
        <div className="flex items-center gap-3 z-10">
          <Link
            to="/analytics"
            className="bg-[#141416] hover:bg-[#1f1f23] text-gray-300 font-semibold px-5 py-3 rounded-xl border border-gray-850 transition duration-200 text-xs flex items-center gap-2 cursor-pointer shadow-md"
          >
            📊 Analytics Dashboard
          </Link>
          <button
            onClick={() => setPopup(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition duration-200 text-xs cursor-pointer shadow-lg shadow-indigo-500/10"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* KPI / Features Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-[#121215]/80 border border-gray-850 p-4 rounded-2xl flex flex-col gap-2 hover:border-gray-750 transition">
          <span className="text-xl">👥</span>
          <h3 className="text-xs uppercase font-bold text-indigo-400 font-mono">Multiplayer</h3>
          <p className="text-[11px] text-gray-500 leading-normal font-sans">Edit code live with your team simultaneously.</p>
        </div>
        <div className="bg-[#121215]/80 border border-gray-850 p-4 rounded-2xl flex flex-col gap-2 hover:border-gray-750 transition">
          <span className="text-xl">▶️</span>
          <h3 className="text-xs uppercase font-bold text-emerald-400 font-mono">Runner</h3>
          <p className="text-[11px] text-gray-500 leading-normal font-sans">Compile & run Python/Node.js on the backend.</p>
        </div>
        <div className="bg-[#121215]/80 border border-gray-850 p-4 rounded-2xl flex flex-col gap-2 hover:border-gray-750 transition">
          <span className="text-xl">🤖</span>
          <h3 className="text-xs uppercase font-bold text-purple-400 font-mono">AI Copilot</h3>
          <p className="text-[11px] text-gray-500 leading-normal font-sans">Review bugs, code smells & estimate complexities.</p>
        </div>
        <div className="bg-[#121215]/80 border border-gray-850 p-4 rounded-2xl flex flex-col gap-2 hover:border-gray-750 transition">
          <span className="text-xl">🌐</span>
          <h3 className="text-xs uppercase font-bold text-blue-400 font-mono">Live Preview</h3>
          <p className="text-[11px] text-gray-500 leading-normal font-sans">Render HTML/CSS/JS outputs instantly inside an iframe.</p>
        </div>
      </div>

      {/* Projects Section */}
      {projects.length > 0 ? (
        <section className="max-w-5xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-gray-850 pb-3">
            <h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider font-mono">
              Your Coding Workspaces
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded bg-[#141416] text-indigo-400 border border-gray-850 font-mono">
              {projects.length} Rooms
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {projects.map((project) => {
              const isOwner = project.userId === userId;
              return (
                <Link
                  to={`/projects/${project._id}`}
                  key={project._id}
                  className="flex flex-col justify-between bg-[#121215]/80 border border-gray-850 hover:border-gray-750 p-6 rounded-2xl transition duration-300 group hover:shadow-2xl hover:shadow-indigo-500/[0.02]"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-bold text-white group-hover:text-indigo-400 transition truncate max-w-[280px]">
                        {project.name}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono truncate">
                        ID: {project._id}
                      </span>
                    </div>
                    
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      isOwner 
                        ? "bg-indigo-950/40 text-indigo-400 border border-indigo-900/30" 
                        : "bg-slate-900/60 text-slate-400 border border-slate-800"
                    }`}>
                      {isOwner ? "Owner" : "Member"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-850 pt-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>👥</span>
                      <span>{(project.members?.length || 0) + 1} developers</span>
                    </div>

                    <button
                      onClick={async (e) => {
                        e.preventDefault(); // stop link navigation
                        e.stopPropagation(); // stop bubbling

                        try {
                          const res = await axios.post(
                            `${API_URL}/api/project/invite-link/${project._id}`,
                            { userId },
                          );

                          const inviteUrl = (res.data.inviteLink || "")
                            .replace(/https?:\/\/[^/]+/i, FRONTEND_URL)
                            .replace(/https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i, FRONTEND_URL);
                          setInviteLink(inviteUrl);
                          setInviteModal(true);
                        } catch (error) {
                          alert("Failed to generate invite link.");
                          console.log(error);
                        }
                      }}
                      className="text-xs bg-[#1a1a1f] hover:bg-indigo-600 hover:text-white text-indigo-400 px-3 py-1.5 rounded-lg border border-gray-800 transition flex items-center gap-1 cursor-pointer"
                      title="Generate Invite Link"
                    >
                      <span>🔗</span> Invite
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="max-w-md mx-auto text-center py-20 flex flex-col items-center gap-4 bg-[#121215]/50 border border-gray-850 rounded-3xl p-8 mt-10">
          <span className="text-4xl">📁</span>
          <h2 className="text-xl font-bold text-white">No active workspaces</h2>
          <p className="text-sm text-slate-500 leading-relaxed font-sans">
            Get started by creating a new multiplayer collaborative workspace. Share the link with your team to start coding together!
          </p>
          <button
            onClick={() => setPopup(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition cursor-pointer text-sm shadow-md mt-2"
          >
            + Create Workspace
          </button>
        </div>
      )}

      {/* Copy Invite Link Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#121215] border border-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl flex flex-col gap-4 mx-4">
            <h2 className="text-xl font-bold text-white">Invite Collaborator</h2>
            <div className="flex items-center gap-2 bg-[#18181b] border border-gray-800 p-2.5 rounded-xl">
              <input
                readOnly
                type="text"
                value={inviteLink}
                className="flex-1 bg-transparent text-sm outline-none text-gray-300 px-2 font-mono truncate"
              />
              <button
                className="bg-indigo-600 text-white font-semibold py-1.5 px-4 rounded-lg cursor-pointer hover:bg-indigo-750 transition text-xs shadow-md shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  setCopied(true);
                  setTimeout(() => {
                    setCopied(false);
                  }, 2000);
                }}
              >
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>

            <p className="text-xs text-gray-500 font-mono">
              Anyone with this link can join your workspace in real-time. The link expires in 24 hours.
            </p>

            <div className="flex justify-end mt-2">
              <button
                className="px-4 py-2 bg-[#1c1c1f] hover:bg-[#26262b] text-gray-300 border border-gray-800 rounded-xl transition text-xs cursor-pointer"
                onClick={() => setInviteModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-5xl mx-auto mt-6 text-sm text-red-400 bg-red-950/20 border border-red-900/30 px-4 py-2.5 rounded-xl font-mono">
          {error}
        </div>
      )}

      {/* Create Project Modal */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-[#121215] border border-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-5 relative z-50 animate-fadeIn"
          >
            <h2 className="text-2xl font-bold text-center text-white tracking-tight">
              Create New Workspace
            </h2>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">Workspace Name</label>
              <input
                type="text"
                placeholder="my-cool-app"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-[#18181b] border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 outline-none text-gray-200 transition placeholder-gray-600 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPopup(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-800 hover:bg-[#1a1a1e] text-gray-450 hover:text-gray-200 transition text-sm cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-semibold rounded-xl transition text-sm cursor-pointer shadow-lg shadow-indigo-500/10"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
