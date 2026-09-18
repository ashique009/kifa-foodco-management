const { Pool } = require("pg");

// Snapshot explicitly supplied environment variables before loading .env
const initialEnv = { ...process.env };

// Load .env as fallback for local development
require("dotenv").config({ override: false });

// Ensure explicitly supplied environment variables always take precedence over .env
for (const [key, value] of Object.entries(initialEnv)) {
  if (value !== undefined) {
    process.env[key] = value;
  }
}

// Normalize connectionString if provided via process.env.DATABASE_URL
let connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : null;
if (connectionString) {
  if (connectionString.startsWith("DATABASE_URL=")) {
    connectionString = connectionString.slice("DATABASE_URL=".length).trim();
  }
  if (
    (connectionString.startsWith('"') && connectionString.endsWith('"')) ||
    (connectionString.startsWith("'") && connectionString.endsWith("'"))
  ) {
    connectionString = connectionString.slice(1, -1).trim();
  }
  if (!connectionString) {
    connectionString = null;
  } else {
    process.env.DATABASE_URL = connectionString;
  }
}

const isProduction = process.env.NODE_ENV === "production";

const poolConfig = connectionString
  ? {
      connectionString,
      ssl:
        process.env.DB_SSL === "false"
          ? false
          : {
              rejectUnauthorized: false,
            },
      max: parseInt(process.env.DB_POOL_MAX || "10", 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || "5000", 10),
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSL === "true" || (isProduction && !process.env.DB_HOST?.includes("localhost") && !process.env.DB_HOST?.includes("127.0.0.1"))
          ? { rejectUnauthorized: false }
          : false,
      max: parseInt(process.env.DB_POOL_MAX || "10", 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || "5000", 10),
    };

const pool = new Pool(poolConfig);

module.exports = pool;