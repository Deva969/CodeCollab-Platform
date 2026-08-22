import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getUserData } from "../data/getUserData";
import { resolveApiUrl } from "../config";

function Invite() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_URL = resolveApiUrl();

  useEffect(() => {
    const checkUser = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        localStorage.setItem("inviteRedirect", window.location.pathname);
        navigate("/login");
        return;
      }
      try {
        const user = await getUserData(navigate);
        setData(user);
      } catch (err) {
        console.error("Failed to load user data:", err);
        localStorage.setItem("inviteRedirect", window.location.pathname);
        navigate("/login");
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(
          `${API_URL}/api/project/invite-project/${token}`,
        );
        setProject(res.data);
      } catch (err) {
        console.error("Invite fetch error:", err);
        setError(
          err.response?.data?.message || 
          "Failed to connect to the server. Please verify the backend is running on port 5000."
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, API_URL]);

  const handleJoin = async () => {
    if (!project) return;
    try {
      await axios.post(
        `${API_URL}/api/project/invite-join/${token}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      if (project.projectId) {
        navigate(`/projects/${project.projectId}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to join project.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-200">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-sm text-gray-400 font-mono">Loading invitation details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] text-gray-200 px-4">
      <div className="bg-[#181818] border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center flex flex-col gap-6">
        <div className="w-16 h-16 bg-indigo-600/10 text-indigo-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner font-mono">
          ✉️
        </div>
        
        {error ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-red-400">Invitation Error</h2>
            <p className="text-sm text-gray-400 leading-relaxed font-mono bg-red-950/20 border border-red-900/30 p-3 rounded-xl">
              {error}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 bg-[#242424] hover:bg-[#2c2c2c] text-gray-300 font-semibold py-2.5 px-6 rounded-xl transition cursor-pointer text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider font-mono">Project Invitation</span>
              <h2 className="text-2xl font-bold text-gray-100 mt-2 truncate px-2">
                Join "{project?.projectName}"
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                You have been invited to collaborate in real-time.
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={handleJoin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg hover:shadow-indigo-500/20 cursor-pointer text-sm"
              >
                Accept & Join Workspace
              </button>
              
              <button
                onClick={() => navigate("/")}
                className="bg-[#242424] hover:bg-[#2c2c2c] text-gray-400 hover:text-gray-200 font-semibold py-2.5 px-6 rounded-xl transition cursor-pointer text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Invite;
