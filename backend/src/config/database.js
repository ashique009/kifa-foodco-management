const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const connectionString = process.env.DATABASE_URL;

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