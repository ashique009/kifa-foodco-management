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
  createAndAddShopToTrip,
} = require("../controllers/tripController");

const authenticateToken = require("../middleware/auth");
const { requireManagerOrAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

router.use(authenticateToken);

router.post("/", requireManagerOrAdmin, createTrip);
router.get("/", getTrips);
router.post("/:tripId/load", validateUuidParam("tripId"), loadStock);
router.post("/:tripId/start", validateUuidParam("tripId"), startTrip);
router.post("/:tripId/shops", validateUuidParam("tripId"), addShopToTrip);
router.post("/:tripId/shops/new", validateUuidParam("tripId"), createAndAddShopToTrip);
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