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
  recordTransitDamage,
} = require("../controllers/tripController");

const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

router.use(authenticateToken);

router.post("/", requireAdmin, createTrip);
router.get("/", getTrips);
router.post("/:tripId/load", validateUuidParam("tripId"), loadStock);
router.post("/:tripId/start", validateUuidParam("tripId"), startTrip);
router.post("/:tripId/shops", validateUuidParam("tripId"), addShopToTrip);
router.get("/:tripId/shops", validateUuidParam("tripId"), getTripShops);
router.post(
  "/:tripId/shops/:shopId/visit",
  validateUuidParam("tripId", "shopId"),
  markShopVisited
);
router.get("/:tripId/stock", validateUuidParam("tripId"), getTripStock);
router.post("/:tripId/damage", validateUuidParam("tripId"), recordTransitDamage);
router.post("/:tripId/reconcile", validateUuidParam("tripId"), reconcileTrip);
module.exports = router;