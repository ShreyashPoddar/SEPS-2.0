import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, X, Sparkles, Lock, Layers } from "lucide-react";
import { getStudentSpecializations } from "../api";
import { parseStreams } from "../utils/streamUtils";

const ALL_OPTION = "All Specializations";

export default function SpecializationDropdown({ value = "", onChange, required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Fetch only existing specializations from the student database
  useEffect(() => {
    let mounted = true;
    getStudentSpecializations()
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        setSpecializations(list);
      })
      .catch((err) => {
        console.error("Failed to load student specializations:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine current selected list
  const selectedTokens = parseStreams(value);
  const isAllSelected = selectedTokens.some((t) =>
    /^(all|open|all specializations|all specialization)$/i.test(t.trim())
  );

  const handleToggleAll = () => {
    if (isAllSelected) {
      // Uncheck All -> nothing selected
      onChange("");
    } else {
      // Selecting "All Specializations" restrains teacher from selecting other options
      onChange(ALL_OPTION);
    }
  };

  const handleToggleSpecialization = (spec) => {
    if (isAllSelected) {
      // Restrained: teacher cannot select individual specialization while "All" is active
      return;
    }

    const exists = selectedTokens.some(
      (t) => t.toLowerCase() === spec.toLowerCase()
    );

    let next;
    if (exists) {
      next = selectedTokens.filter(
        (t) => t.toLowerCase() !== spec.toLowerCase()
      );
    } else {
      next = [...selectedTokens, spec];
    }
    onChange(next.join(", "));
  };

  const handleRemoveChip = (spec, e) => {
    e.stopPropagation();
    if (isAllSelected) {
      onChange("");
      return;
    }
    const next = selectedTokens.filter(
      (t) => t.toLowerCase() !== spec.toLowerCase()
    );
    onChange(next.join(", "));
  };

  const filteredSpecializations = specializations.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-600" />
          <span>Project Specialization(s)</span>
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          {isAllSelected
            ? "Open to All Specializations"
            : selectedTokens.length > 0
            ? `${selectedTokens.length} Specialization(s) selected`
            : "Select one, multiple, or all"}
        </span>
      </div>

      {/* Hidden input to ensure native form validation passes when required */}
      <input
        type="text"
        tabIndex={-1}
        className="opacity-0 absolute h-0 w-0 pointer-events-none"
        value={value}
        required={required}
        onChange={() => {}}
      />

      {/* Main trigger field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-3.5 py-2 bg-slate-50 border-2 rounded-2xl cursor-pointer transition flex items-center justify-between gap-2 select-none ${
          isOpen
            ? "border-slate-900 bg-white shadow-sm ring-2 ring-slate-900/10"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <div className="flex-1 flex flex-wrap items-center gap-1.5 overflow-hidden">
          {isAllSelected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-extrabold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>All Specializations Selected</span>
              <button
                type="button"
                onClick={(e) => handleRemoveChip(ALL_OPTION, e)}
                className="hover:bg-black/20 rounded-full p-0.5 ml-0.5 transition"
                title="Clear selection"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : selectedTokens.length > 0 ? (
            selectedTokens.map((spec, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs animate-fadeIn"
              >
                <span className="truncate max-w-[220px]">{spec}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveChip(spec, e)}
                  className="hover:bg-blue-200 text-blue-700 hover:text-blue-950 rounded-full p-0.5 transition"
                  title={`Remove ${spec}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-slate-400">
              Choose specialization(s) from student database...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pl-2 text-slate-500">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-slate-900" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search box if there are more than 4 specializations */}
          {specializations.length > 4 && (
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
              <input
                type="text"
                placeholder="Filter specializations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100">
            {/* OPTION 1: SELECT ALL SPECIALIZATIONS */}
            <div className="pb-1.5">
              <div
                onClick={handleToggleAll}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition border ${
                  isAllSelected
                    ? "bg-cyan-50/80 border-cyan-300 text-cyan-950 shadow-2xs"
                    : "bg-slate-50/60 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    isAllSelected
                      ? "bg-cyan-600 border-cyan-700 text-white"
                      : "bg-white border-slate-400"
                  }`}
                >
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    <span className="text-xs font-black tracking-tight">
                      Select All Specializations
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">
                    Makes this project accessible to students of any specialization.{" "}
                    <span className="font-bold text-slate-700">
                      Restrains individual selections.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: INDIVIDUAL SPECIALIZATIONS FROM STUDENT DATABASE */}
            <div className="pt-2 space-y-1">
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Student Database Specializations ({specializations.length})
                </span>
                {isAllSelected && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Individual options restrained
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-4 text-center text-xs font-semibold text-slate-500">
                  Loading student specializations...
                </div>
              ) : filteredSpecializations.length === 0 ? (
                <div className="py-3 text-center text-xs font-medium text-slate-500">
                  No matching specialization found.
                </div>
              ) : (
                filteredSpecializations.map((spec) => {
                  const isChecked = selectedTokens.some(
                    (t) => t.toLowerCase() === spec.toLowerCase()
                  );

                  return (
                    <div
                      key={spec}
                      onClick={() => handleToggleSpecialization(spec)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                        isAllSelected
                          ? "opacity-35 cursor-not-allowed bg-slate-50 select-none"
                          : isChecked
                          ? "bg-blue-50/80 hover:bg-blue-100/80 cursor-pointer text-blue-950 font-bold"
                          : "hover:bg-slate-100 cursor-pointer text-slate-700 font-medium"
                      }`}
                      title={
                        isAllSelected
                          ? "Deselect 'Select All Specializations' first to choose individual options"
                          : `Select ${spec}`
                      }
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isAllSelected
                            ? "bg-slate-200 border-slate-300"
                            : isChecked
                            ? "bg-blue-600 border-blue-700 text-white"
                            : "bg-white border-slate-300"
                        }`}
                      >
                        {isChecked && !isAllSelected && (
                          <Check className="w-3 h-3 stroke-[3]" />
                        )}
                        {isAllSelected && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                      </div>

                      <span className="text-xs leading-snug flex-1">{spec}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-medium">
              {isAllSelected
                ? "All Specializations active"
                : `${selectedTokens.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-white font-black rounded-lg text-[11px] transition shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
