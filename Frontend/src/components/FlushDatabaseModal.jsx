import React, { useState } from "react";
import { AlertTriangle, Trash2, X, RotateCcw, CheckCircle2 } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { flushDatabase } from "../api";
import showToast from "../utils/toastUtils";

export default function FlushDatabaseModal({ isOpen, onClose, onSuccess }) {
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toLowerCase() === "flush";

  const handleClose = () => {
    if (loading) return;
    setConfirmInput("");
    setErrorMessage("");
    onClose();
  };

  const handleFlushSubmit = async (e) => {
    e.preventDefault();
    if (!isConfirmed) {
      setErrorMessage("Please type 'flush' to proceed with database reset.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await flushDatabase(confirmInput.trim().toLowerCase());
      showToast.success(
        res.data?.message || "Semester database flushed successfully! Starting fresh."
      );
      setConfirmInput("");
      if (onSuccess) {
        onSuccess(res.data?.stats);
      }
      onClose();
    } catch (err) {
      console.error("Flush Database Error:", err);
      const msg =
        err.response?.data?.message ||
        "Failed to flush database. Please check your network and authorization.";
      setErrorMessage(msg);
      showToast.error(msg, { id: "flush-db-error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl border-2 border-red-600 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top red accent line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 border-2 border-red-300 flex items-center justify-center text-red-600 flex-shrink-0 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300 text-[10px] font-black uppercase tracking-wider">
              Danger Zone &bull; Admin Only
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 mt-1">
              Flush Semester Database
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Reset the allocation portal to start clean for a new semester round
            </p>
          </div>
        </div>

        {/* Warning Explanation Box */}
        <div className="p-4 bg-red-50/80 border-2 border-red-200 rounded-2xl text-xs space-y-2.5 text-slate-800">
          <p className="font-extrabold text-red-900">
            ⚠️ This will permanently erase all semester operational data:
          </p>
          <ul className="space-y-1.5 font-medium pl-1 text-[11px] text-slate-700">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>All proposed Major Projects & descriptions</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>All Student Applications & team invitations</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>All Approved Team Allocations & roster memberships</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>All Student Change Tickets & audit timeline trails</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>All Faculty Quota Request Tokens & in-app alerts</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="font-bold text-slate-900">
                Resets Teacher Upload Quotas back to 2 projects
              </span>
            </li>
          </ul>
          <p className="text-[11px] font-bold text-slate-600 pt-1 border-t border-red-200">
            🔒 Note: Official teacher and student university user accounts are preserved. Only semester transaction records are wiped.
          </p>
        </div>

        {/* Confirmation Form */}
        <form onSubmit={handleFlushSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
              Type <span className="font-mono text-red-700 text-sm font-black bg-red-100 px-1.5 py-0.5 rounded border border-red-300">flush</span> below to confirm:
            </label>
            <div className="relative">
              <input
                type="text"
                autoComplete="off"
                disabled={loading}
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="type flush to confirm"
                className={`w-full px-4 py-3 rounded-2xl text-sm font-mono border-2 transition focus:outline-none ${
                  isConfirmed
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold"
                    : "border-slate-300 bg-slate-50 text-slate-900 focus:border-red-600"
                }`}
              />
              {isConfirmed && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Confirmed</span>
                </div>
              )}
            </div>
            {errorMessage && (
              <p className="text-xs text-red-600 font-bold mt-1.5">{errorMessage}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="w-full sm:flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-full font-bold text-xs text-slate-800 transition active:scale-95 disabled:opacity-50"
            >
              Cancel &amp; Keep Data
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || loading}
              className="w-full sm:flex-1 py-3 px-5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 text-white rounded-full font-black text-xs border-2 border-red-900 shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="xs" color="#ffffff" />
                  <span>Flushing Database...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Whole Database</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
