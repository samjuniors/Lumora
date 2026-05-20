/**
 * Project Lumina: High-Stakes Academy Environment Configurations
 * Handles dynamic environment checks and establishes clean boundaries for dev, staging, and production.
 */

export interface SystemConfig {
  environment: "development" | "staging" | "production";
  clerkPublishableKey: string;
  isDev: boolean;
  isStaging: boolean;
  isProd: boolean;
  firebaseConfig: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  apiBaseUrl: string;
  economyTaxRate: number; // Operational premium tax
  features: {
    enableAIGrading: boolean;
    enableOracleAudit: boolean;
    enableSyndicateLeaderboards: boolean;
    enforceStrictDoubleDown: boolean;
  };
}

// Check environment variables safely in both Vite client context and Node server context
const getEnvVar = (key: string): string => {
  if (typeof process !== "undefined" && process?.env?.[key]) {
    return process.env[key] as string;
  }
  
  // Vite client fallback
  const viteKey = `VITE_${key}`;
  if (typeof import.meta !== "undefined" && import.meta?.env?.[viteKey]) {
    return import.meta.env[viteKey] as string;
  }
  if (typeof import.meta !== "undefined" && import.meta?.env?.[key]) {
    return import.meta.env[key] as string;
  }

  return "";
};

const determineEnvironment = (): "development" | "staging" | "production" => {
  const nodeEnv = (typeof process !== "undefined" && process?.env?.NODE_ENV) || "";
  const location = typeof window !== "undefined" ? window.location.hostname : "";

  if (nodeEnv === "production" || location.includes("lumina-prod") || location.includes("ais-pre")) {
    return "production";
  }
  if (nodeEnv === "staging" || location.includes("staging") || location.includes("ais-dev")) {
    return "staging";
  }
  return "development";
};

const curEnv = determineEnvironment();

export const config: SystemConfig = {
  environment: curEnv,
  clerkPublishableKey: getEnvVar("CLERK_PUBLISHABLE_KEY"),
  isDev: curEnv === "development",
  isStaging: curEnv === "staging",
  isProd: curEnv === "production",
  firebaseConfig: {
    apiKey: getEnvVar("FIREBASE_API_KEY"),
    authDomain: getEnvVar("FIREBASE_AUTH_DOMAIN"),
    projectId: getEnvVar("FIREBASE_PROJECT_ID"),
    storageBucket: getEnvVar("FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnvVar("FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnvVar("FIREBASE_APP_ID"),
  },
  apiBaseUrl: curEnv === "production" 
    ? "https://ais-pre-qlh3wnmvayhwks4szedfck-608210195312.asia-southeast1.run.app/api" 
    : curEnv === "staging"
    ? "https://ais-dev-qlh3wnmvayhwks4szedfck-608210195312.asia-southeast1.run.app/api"
    : `http://localhost:${typeof process !== "undefined" && process?.env?.PORT || 3000}/api`,
  
  // Economy Constants - Maintaining Navy/gold elite tension
  economyTaxRate: 0.30, // 30% System Tax

  features: {
    enableAIGrading: true,
    enableOracleAudit: true,
    enableSyndicateLeaderboards: true,
    enforceStrictDoubleDown: true,
  }
};

logger("info", `Initialized active operational setting running in [${config.environment.toUpperCase()}] mode.`);

function logger(level: "info" | "error" | "warn", message: string) {
  if (typeof process !== "undefined") {
    console.log(`[LUMINA-CONFIG] [${level.toUpperCase()}] ${message}`);
  } else {
    console.log(`%c[Lumina] %c[${level.toUpperCase()}] %s`, "color: #D4AF37; font-weight: bold;", level === "error" ? "color: red;" : "color: #1A2B48;", message);
  }
}
