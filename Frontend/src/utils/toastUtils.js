// Frontend/src/utils/toastUtils.js
import { toast } from "react-hot-toast";

/**
 * Extracts a clean, professional, user-friendly error message.
 * Strips technical stack traces, raw HTTP codes, and database errors.
 */
export function getFriendlyErrorMessage(err, fallback = "An unexpected error occurred. Please try again.") {
  if (!err) return fallback;

  if (typeof err === "string") {
    // If it's already a clean string, check for technical leaks
    if (
      err.includes("PrismaClient") ||
      err.includes("SQLSTATE") ||
      err.includes("database") ||
      err.includes("Unhandled error") ||
      err.includes("Cannot read properties") ||
      err.length > 200
    ) {
      return "The system is temporarily busy. Please try again in a few moments.";
    }
    return err;
  }

  // Network / connectivity issues
  if (
    err.code === "ERR_NETWORK" ||
    err.code === "ECONNABORTED" ||
    err.message?.includes("Network Error") ||
    err.message?.includes("Failed to fetch")
  ) {
    return "Network connection issue. Please check your internet connection.";
  }

  // Backend response errors
  const res = err.response;
  if (res) {
    const status = res.status;
    const serverMsg = res.data?.message || res.data?.error;

    if (serverMsg && typeof serverMsg === "string") {
      if (
        serverMsg.includes("PrismaClient") ||
        serverMsg.includes("SQLSTATE") ||
        serverMsg.includes("database") ||
        serverMsg.includes("Unhandled error") ||
        serverMsg.length > 200
      ) {
        return "Server is temporarily experiencing issues. Please try again in a moment.";
      }
      return serverMsg;
    }

    if (status === 400) return "Please check your inputs and try again.";
    if (status === 401) return "Your session has expired. Please log in again.";
    if (status === 403) return "You do not have authorization to perform this action.";
    if (status === 404) return "The requested record or resource was not found.";
    if (status === 409) return "A conflict occurred with the current state of this record.";
    if (status === 429) return "Too many requests. Please wait a moment before trying again.";
    if (status >= 500) return "Server is temporarily unavailable. Please try again shortly.";
  }

  if (err.message && typeof err.message === "string" && !err.message.includes("AxiosError")) {
    return err.message;
  }

  return fallback;
}

/**
 * Professional toast notification helper with automatic deduplication.
 * Prevents identical error toasts from stacking or spamming the screen.
 */
export const showToast = {
  error: (messageOrError, options = {}) => {
    const { fallback, ...toastOptions } = options;
    options = toastOptions;
    const message = getFriendlyErrorMessage(messageOrError, fallback);
    // Use the message itself as the default deduplication ID
    const toastId = options.id || `err_${message.slice(0, 50)}`;
    return toast.error(message, {
      id: toastId,
      duration: options.duration || 4000,
      ...options,
    });
  },

  success: (message, options = {}) => {
    const toastId = options.id || `succ_${message.slice(0, 50)}`;
    return toast.success(message, {
      id: toastId,
      duration: options.duration || 3500,
      ...options,
    });
  },

  info: (message, options = {}) => {
    const toastId = options.id || `info_${message.slice(0, 50)}`;
    return toast(message, {
      id: toastId,
      duration: options.duration || 3500,
      icon: "ℹ️",
      ...options,
    });
  },

  promise: (promise, messages = {}, options = {}) => {
    const defaultError = "Action failed. Please try again.";
    return toast.promise(
      promise,
      {
        loading: messages.loading || "Processing request...",
        success: messages.success || "Completed successfully!",
        // `error` may be a string or a callback; callbacks must actually run
        // (callers use them to reset state) and may return their own message.
        error: (err) => {
          if (typeof messages.error === "function") {
            const custom = messages.error(err);
            return custom || getFriendlyErrorMessage(err, defaultError);
          }
          return getFriendlyErrorMessage(err, messages.error || defaultError);
        },
      },
      options
    );
  },

  dismiss: (id) => toast.dismiss(id),
};

export default showToast;
