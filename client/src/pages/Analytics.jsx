import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { getUserData } from "../data/getUserData";
import { resolveApiUrl } from "../config";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  VscBook,
  VscFiles,
  VscAccount,
  VscGraph,
  VscArrowLeft,
  VscAdd,
  VscNewFile,
  VscComment,
  VscProject,
  VscOrganization,
  VscHubot
} from "react-icons/vsc";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = resolveApiUrl();

function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Protect page
        await getUserData(navigate);
        
        const res = await axios.get(`${API_URL}/api/analytics`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError(err.response?.data?.message || "Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-gray-200">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-sm text-gray-400 font-mono">Compiling workspace statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-gray-200 px-4">
        <div className="bg-[#181818] border border-red-900/30 p-8 rounded-2xl max-w-md w-full text-center flex flex-col gap-4">
          <h2 className="text-xl font-bold text-red-400">Failed to load statistics</h2>
          <p className="text-sm text-gray-400 font-mono bg-red-950/20 p-3 rounded-lg border border-red-950">{error}</p>
          <Link
            to="/"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl transition text-sm cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Chart configs
  const messagesChartData = {
    labels: stats?.charts?.messagesPerDay?.map((d) => d.date) || [],
    datasets: [
      {
        label: "Messages Sent",
        data: stats?.charts?.messagesPerDay?.map((d) => d.count) || [],
        borderColor: "rgb(129, 140, 248)",
        backgroundColor: "rgba(99, 102, 241, 0.05)",
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: "rgb(99, 102, 241)",
        pointHoverRadius: 6,
        pointRadius: 3,
      },
    ],
  };

  const projectActivityChartData = {
    labels: stats?.charts?.projectsPerDay?.map((d) => d.date) || [],
    datasets: [
      {
        label: "Projects Created",
        data: stats?.charts?.projectsPerDay?.map((d) => d.count) || [],
        backgroundColor: "rgba(16, 185, 129, 0.85)",
        borderColor: "rgb(52, 211, 153)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const activeUsersChartData = {
    labels: stats?.charts?.mostActiveUsers?.map((u) => u.name) || [],
    datasets: [
      {
        label: "Messages Sent",
        data: stats?.charts?.mostActiveUsers?.map((u) => u.count) || [],
        backgroundColor: [
          "rgba(99, 102, 241, 0.85)",
          "rgba(139, 92, 246, 0.85)",
          "rgba(217, 70, 239, 0.85)",
          "rgba(16, 185, 129, 0.85)",
          "rgba(6, 182, 212, 0.85)",
        ],
        borderColor: "#0f0f12",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#9ca3af",
          font: { family: "system-ui, -apple-system, sans-serif", size: 11, weight: "medium" },
        },
      },
      tooltip: {
        backgroundColor: "#0d0d11",
        titleFont: { family: "monospace", size: 12 },
        bodyFont: { family: "sans-serif", size: 11 },
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.03)" },
        ticks: { color: "#8e939e", font: { family: "monospace", size: 10 } },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.03)" },
        ticks: { color: "#8e939e", font: { family: "monospace", size: 10 } },
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#070709] text-gray-200 p-6 md:p-10 font-sans relative overflow-x-hidden select-none">
      {/* Glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto flex flex-col gap-8 relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-850 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-widest">Platform Insights</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Analytics Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Real-time statistics, collaboration metrics, and platform performance trends.</p>
          </div>
          <Link
            to="/"
            className="self-start sm:self-auto bg-[#101014] hover:bg-[#16161c] text-gray-300 font-semibold px-4 py-2 rounded-xl border border-gray-850 hover:border-gray-700 transition duration-250 text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-black/40 group"
          >
            <VscArrowLeft className="text-sm group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* STATS SECTION */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Project Statistics */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <VscGraph className="text-indigo-400 text-sm" />
              <h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider font-mono">Platform Aggregates</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-indigo-500/25 transition duration-300 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Total Projects</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.projectStats?.totalProjects}</span>
                <VscBook className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-40 group-hover:scale-105 transition-transform" />
              </div>
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-indigo-500/25 transition duration-300 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Total Files</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.projectStats?.totalFiles}</span>
                <VscFiles className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-40 group-hover:scale-105 transition-transform" />
              </div>
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-indigo-500/25 transition duration-300 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Total Messages</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.projectStats?.totalMessages}</span>
                <VscComment className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-40 group-hover:scale-105 transition-transform" />
              </div>
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-indigo-500/25 transition duration-300 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Collaborators</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.projectStats?.totalCollaborators}</span>
                <VscOrganization className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-40 group-hover:scale-105 transition-transform" />
              </div>
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-indigo-500/25 transition duration-300 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Active Users</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.projectStats?.activeUsers}</span>
                <VscAccount className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-40 group-hover:scale-105 transition-transform" />
              </div>
            </div>
          </div>

          {/* User Specific Statistics */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <VscHubot className="text-emerald-450 text-sm" />
              <h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider font-mono">Your Contribution</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-emerald-500/25 transition duration-300 border-l-[3px] border-l-indigo-500/80 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Projects Created</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.userStats?.projectsCreated}</span>
                <VscAdd className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-30 group-hover:scale-105 transition-transform" />
              </div>
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-emerald-500/25 transition duration-300 border-l-[3px] border-l-emerald-500/80 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Projects Joined</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.userStats?.projectsJoined}</span>
                <VscProject className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-30 group-hover:scale-105 transition-transform" />
              </div>
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-emerald-500/25 transition duration-300 border-l-[3px] border-l-amber-500/80 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Messages Sent</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.userStats?.messagesSent}</span>
                <VscComment className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-30 group-hover:scale-105 transition-transform" />
              </div>
              <div className="bg-[#0f0f13]/70 border border-gray-850/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-emerald-500/25 transition duration-300 border-l-[3px] border-l-blue-500/80 relative group overflow-hidden">
                <span className="text-[10px] text-gray-500 font-mono font-medium uppercase tracking-wider">Files Created</span>
                <span className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">{stats?.userStats?.filesCreated}</span>
                <VscNewFile className="absolute right-4 bottom-4 text-gray-800 text-2xl opacity-30 group-hover:scale-105 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* CHARTS GRID */}
        <div className="grid md:grid-cols-2 gap-8 mt-2">
          
          {/* Chart 1: Messages per Day */}
          <div className="bg-[#0f0f13]/85 backdrop-blur border border-gray-850/90 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase font-bold tracking-widest text-indigo-400 font-mono">1. Weekly Message Inflow</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Chronological summary of system communications.</p>
            </div>
            <div className="h-64 relative">
              <Line data={messagesChartData} options={chartOptions} />
            </div>
          </div>

          {/* Chart 2: Project Activity Trend */}
          <div className="bg-[#0f0f13]/85 backdrop-blur border border-gray-850/90 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-450 font-mono">2. Project Creation Activity</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Timeline of projects created on the platform.</p>
            </div>
            <div className="h-64 relative">
              <Bar data={projectActivityChartData} options={chartOptions} />
            </div>
          </div>

          {/* Chart 3: Most Active Users */}
          <div className="bg-[#0f0f13]/85 backdrop-blur border border-gray-850/90 rounded-2xl p-6 flex flex-col gap-4 md:col-span-2 max-w-xl mx-auto w-full shadow-xl">
            <div className="flex flex-col items-center">
              <h3 className="text-xs uppercase font-bold tracking-widest text-indigo-400 font-mono">3. Contribution Distribution</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 text-center">Top 5 collaborators by system message frequencies.</p>
            </div>
            <div className="h-56 relative mt-2 select-text">
              <Doughnut
                data={activeUsersChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                      labels: {
                        color: "#9ca3af",
                        font: { family: "system-ui, -apple-system, sans-serif", size: 11, weight: "medium" },
                        boxWidth: 12,
                        padding: 12,
                      },
                    },
                    tooltip: {
                      backgroundColor: "#0d0d11",
                      titleFont: { family: "monospace", size: 12 },
                      bodyFont: { family: "sans-serif", size: 11 },
                      borderColor: "rgba(255,255,255,0.08)",
                      borderWidth: 1,
                      padding: 10,
                      cornerRadius: 8,
                    }
                  },
                }}
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Analytics;
