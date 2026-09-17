const express = require("express");
const cors = require("cors");
const pool = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const authenticateToken = require("./middleware/auth");
const app = express();
const productRoutes = require("./routes/productRoutes");
const batchRoutes = require("./routes/batchRoutes");
const stockRoutes = require("./routes/stockRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const staffRoutes = require("./routes/staffRoutes");
const tripRoutes = require("./routes/tripRoutes");
const shopRoutes = require("./routes/shopRoutes");
const saleRoutes = require("./routes/saleRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const returnRoutes = require("./routes/returnRoutes");
const settingsRoutes = require("./routes/settingsRoutes");


const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== "production" &&
          (origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:")))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/products", productRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Bakery Management API is running 🚀",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

if (process.env.NODE_ENV !== "production") {
  app.get("/api/test-db", async (req, res) => {
    try {
      const result = await pool.query("SELECT NOW()");

      res.json({
        message: "Database connected successfully 🎉",
        time: result.rows[0].now,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Database connection failed",
      });
    }
  });

  app.get("/api/test-auth", authenticateToken, (req, res) => {
    res.json({
      message: "Authentication works 🔐",
      user: req.user,
    });
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});