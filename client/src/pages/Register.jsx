import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerData } from "../api/register";
import { TbTerminal2 } from "react-icons/tb";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    setError(null);
    e.preventDefault();
    setLoading(true);

    try {
      await registerData(name, email, password);
      alert("Registration Successful! Please log in.");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Something went wrong during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden flex items-center justify-center px-4">
      {/* Background Decorative Glow Blobs */}
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Card container */}
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-[#121215]/90 backdrop-blur-md border border-gray-800 p-8 shadow-2xl rounded-2xl z-10 flex flex-col gap-5"
      >
        {/* Logo and title */}
        <div className="flex flex-col items-center gap-2 text-center mb-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/10">
            <TbTerminal2 />
          </div>
          <h1 className="font-extrabold text-2xl text-white tracking-tight mt-2">
            Create an account
          </h1>
          <p className="text-sm text-gray-400 font-mono">Start coding in multiplayer rooms</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">
              Your Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#18181b] border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 outline-none text-gray-200 transition placeholder-gray-600 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#18181b] border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 outline-none text-gray-200 transition placeholder-gray-600 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#18181b] border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 outline-none text-gray-200 transition placeholder-gray-600 text-sm"
            />
          </div>
        </div>

        <div className="text-sm text-center text-gray-400 mt-1">
          Already have an account?{" "}
          <Link className="text-indigo-400 hover:text-indigo-300 font-semibold transition" to="/login">
            Login
          </Link>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 px-4 py-2.5 rounded-xl font-mono">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-indigo-500/10 text-sm flex items-center justify-center mt-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </div>
  );
}

export default Register;
