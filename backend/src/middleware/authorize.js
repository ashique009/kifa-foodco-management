const pool = require("../config/database");

// Centralized business-access helper
// Returns true when user has admin or manager role
const hasBusinessAccess = (user) => {
  return Boolean(user && (user.role === "admin" || user.role === "manager"));
};

// Require ADMIN role middleware (strictly admin-only)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }
  next();
};

// Require MANAGER or ADMIN role middleware for business / operations
const requireManagerOrAdmin = (req, res, next) => {
  if (!hasBusinessAccess(req.user)) {
    return res.status(403).json({
      message: "Manager or Admin access required",
    });
  }
  next();
};

// Resolve staff ID for authenticated user
const getStaffIdForUser = async (dbClientOrPool, userId) => {
  if (!userId) return null;
  const db = dbClientOrPool || pool;
  const result = await db.query(
    `SELECT id FROM staff WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id || null;
};

// Verify resource-level trip authorization
const verifyTripAccess = async (tripId, req, dbClientOrPool) => {
  if (!tripId) {
    return {
      authorized: false,
      status: 400,
      message: "Trip ID is required",
    };
  }

  const db = dbClientOrPool || pool;

  // 1. Fetch trip
  const tripRes = await db.query(
    `SELECT * FROM trips WHERE id = $1`,
    [tripId]
  );

  if (tripRes.rows.length === 0) {
    return {
      authorized: false,
      status: 404,
      message: "Trip not found",
    };
  }

  const trip = tripRes.rows[0];

  // 2. ADMIN and MANAGER have full access to all trips
  if (hasBusinessAccess(req.user)) {
    return {
      authorized: true,
      trip,
    };
  }

  // 3. STAFF (Driver / Sales Staff) must be assigned as driver or sales_staff
  const staffId = await getStaffIdForUser(db, req.user?.userId);

  if (!staffId) {
    return {
      authorized: false,
      status: 403,
      message: "No staff profile linked to this user",
    };
  }

  if (trip.driver_id === staffId || trip.sales_staff_id === staffId) {
    return {
      authorized: true,
      trip,
      staffId,
    };
  }

  return {
    authorized: false,
    status: 403,
    message: "You are not assigned to this trip",
  };
};

module.exports = {
  hasBusinessAccess,
  requireAdmin,
  requireManagerOrAdmin,
  getStaffIdForUser,
  verifyTripAccess,
};
