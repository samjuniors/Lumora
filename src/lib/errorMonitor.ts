/**
 * Project Lumina: Error Monitoring & Exception Tracking
 * Provides an operational surface for Sentry error capturing and custom telemetry.
 */

import { config } from "./config";

// Lazy-loaded active client-side exception hook
let isSentryInitialized = false;

export async function initErrorMonitoring() {
  if (isSentryInitialized) return;

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN || "";
  
  if (!sentryDsn || sentryDsn === "your_sentry_dsn_here") {
    console.log("ℹ️  Sentry DSN is unconfigured. Fallback local analytics handler is active.");
    return;
  }

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: sentryDsn,
      environment: config.environment,
      integrations: [],
      tracesSampleRate: config.isProd ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    isSentryInitialized = true;
    console.log(`✅ Sentry initialized successfully under [${config.environment.toUpperCase()}] stream.`);
  } catch (err) {
    console.warn("⚠️  Failed to lazy-load Sentry package runtime:", err);
  }
}

export async function captureException(error: unknown, context?: Record<string, any>) {
  // Always log to console in structured format
  console.error("[MONITORING-EXCEPTION]", error, context ? JSON.stringify(context) : "");

  if (isSentryInitialized) {
    try {
      const Sentry = await import("@sentry/react");
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach((key) => {
            scope.setExtra(key, context[key]);
          });
        }
        Sentry.captureException(error);
      });
    } catch (err) {
      // Avoid infinite error loop
    }
  }
}

export async function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: Record<string, any>) {
  console.log(`[MONITORING-MESSAGE] [${level.toUpperCase()}] ${message}`, context ? JSON.stringify(context) : "");

  if (isSentryInitialized) {
    try {
      const Sentry = await import("@sentry/react");
      Sentry.withScope((scope) => {
        if (context) scope.setExtras(context);
        const l = level === "warning" ? "warning" : level === "error" ? "error" : "info";
        Sentry.captureMessage(message, l);
      });
    } catch (err) {
      // Ignore fallback issues
    }
  }
}

// Initializing right off the imports
if (typeof window !== "undefined") {
  initErrorMonitoring().catch(err => console.warn("Error monitoring startup failure:", err));
}
