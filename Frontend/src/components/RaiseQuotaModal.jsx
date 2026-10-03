// Frontend/src/components/RaiseQuotaModal.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket, PlusCircle, AlertCircle, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { createQuotaToken } from "../api";
import showToast from "../utils/toastUtils";
import LoadingSpinner from "./LoadingSpinner";

export default function RaiseQuotaModal({
  isOpen,
  onClose,
  currentProjectsCount = 0,
  currentCount = currentProjectsCount,
  currentQuota = 2,
  onSuccess,
}) {
  const requestedProjects = 1;
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim() || reason.trim().length < 10) {
      showToast.error("Please provide a justification (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createQuotaToken({
        requestedProjects: 1,
        reason: reason.trim(),
      });
      showToast.success(res.data?.message || `Token #${res.data?.token?.tokenNumber} submitted successfully!`);
      if (onSuccess) onSuccess(res.data?.token);
      onClose();
    } catch (err) {
      console.error("Error submitting quota token:", err);
      showToast.error(err, { fallback: "Failed to submit project quota token." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-2 border-slate-900 overflow-hidden relative my-8"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-700/50">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
                  Faculty Project Authorization
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  Raise Project Quota Token
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={submitting}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Status overview banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Current Allocation Status
                </p>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  <span className="text-cyan-700">{currentCount}</span> of{" "}
                  <span className="text-slate-900">{currentQuota}</span> Projects Created
                </p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-black">
                  New Quota: {currentQuota + 1}
                </span>
              </div>
            </div>

            {/* Fixed to 1 Additional Project */}
            <div className="p-4 rounded-2xl bg-cyan-50/70 border-2 border-cyan-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-600 text-white shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-900 block">
                      Quota Request Policy
                    </span>
                    <p className="text-xs sm:text-sm font-black text-slate-950 mt-0.5">
                      +1 Additional Project Proposal
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-950 text-white text-xs font-black shadow-sm">
                  1 Project Slot
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-2 leading-relaxed">
                Faculty members can request approval for <strong>1 additional project topic</strong> per quota token. Once this request is reviewed and approved, your project limit will increase by 1.
              </p>
            </div>

            {/* Reason / Description Textarea */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 block mb-1.5">
                Justification & Description of Topics:
              </label>
              <textarea
                rows="4"
                placeholder="Please state why additional project proposals are required (e.g., student demand in specialized domain, multidisciplinary collaboration, high student interest in research lab)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>Minimum 10 characters required</span>
                <span className={reason.trim().length >= 10 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                  {reason.trim().length} chars
                </span>
              </div>
            </div>

            {/* Info callout */}
            <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950 font-medium flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <span>
                Your request will be submitted to the Department Coordinators. Once approved, you will receive an alert notification and your project creation limit will automatically update.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || reason.trim().length < 10}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white rounded-full font-bold text-xs shadow-md border-2 border-slate-900 transition active:scale-95"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="xs" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-cyan-400" />
                    <span>Submit Quota Token</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
