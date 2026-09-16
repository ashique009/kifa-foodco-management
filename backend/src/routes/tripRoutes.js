const express = require("express");

const {
  createTrip,
  getTrips,
  loadStock,
  addShopToTrip,
  getTripShops,
  markShopVisited,
  getTripStock,
  reconcileTrip,
  startTrip,
} = require("../controllers/tripController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.post("/", createTrip);
router.get("/", getTrips);
router.post("/:tripId/load", loadStock);
router.post("/:tripId/start", startTrip);
router.post("/:tripId/shops", addShopToTrip);
router.get("/:tripId/shops", getTripShops);
router.post("/:tripId/shops/:shopId/visit", markShopVisited);
router.get("/:tripId/stock", getTripStock);
router.post("/:tripId/reconcile", reconcileTrip);
module.exports = router;