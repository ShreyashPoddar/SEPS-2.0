import { useState, useEffect } from "react";
import { getGlobalDeadline, setGlobalDeadline } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";

export default function SetGlobalDeadline({ user }) {
  const [deadline, setDeadline] = useState("");
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const allowedEmails = [
    "sangeetm@srmist.edu.in",
    "vadivukk@srmist.edu.in",
    "elavelvg@srmist.edu.in",
    "hodece@srmist.edu.in",
  ];

  useEffect(() => {
    getGlobalDeadline().then(res => {
      setCurrent(res.data.deadline ? new Date(res.data.deadline).toISOString().split("T")[0] : "");
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await setGlobalDeadline(deadline);
      setMessage("Deadline updated successfully!");
      setCurrent(deadline);
    } catch {
      setMessage("Failed to update deadline.");
    } finally {
      setLoading(false);
    }
  };

  const userEmail = (user?.email || "").trim().toLowerCase();
  const isAuthorized = allowedEmails.some(e => e.toLowerCase() === userEmail);
  if (!isAuthorized) {
    return <div className="p-8 text-center text-red-500 font-bold">Not authorized. Coordinator access required.</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-900">
      <h2 className="text-2xl font-black mb-6 text-slate-950 text-center">Set Global Application Deadline</h2>
      {message && <p className="mb-4 text-emerald-600 font-bold text-center">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1">Current Deadline</label>
          <div className="w-full mt-1 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-semibold">{current || "No deadline set"}</div>
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1">New Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black font-semibold text-sm transition"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <LoadingSpinner size="xs" color="#ffffff" />
              <span>Updating Deadline...</span>
            </>
          ) : (
            <span>Update Deadline</span>
          )}
        </button>
      </form>
    </div>
  );
}
