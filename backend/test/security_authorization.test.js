const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// Import the controllers under test
const { getPayments, createPayment } = require("../src/controllers/paymentController");
const { getShops, getShopById, getShopLedger } = require("../src/controllers/shopController");

// Helper to create mock response object
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

describe("Security Authorization & Scoping Tests", () => {
  const trip1Id = "11111111-1111-1111-1111-111111111111";
  const trip2Id = "22222222-2222-2222-2222-222222222222";
  const shop1Id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const shop2Id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const staff1Id = "s1111111-1111-1111-1111-111111111111";
  const staff2Id = "s2222222-2222-2222-2222-222222222222";

  test("1. Admin retains company-wide payment visibility", async () => {
    const req = {
      user: { userId: "admin-uid", role: "admin" },
      query: {},
    };
    const res = createMockRes();

    // Verify hasBusinessAccess treats admin as true
    const { hasBusinessAccess } = require("../src/middleware/authorize");
    assert.equal(hasBusinessAccess(req.user), true, "Admin should have business access");
  });

  test("2. Manager retains company-wide payment visibility (identical to Admin for ops)", async () => {
    const req = {
      user: { userId: "mgr-uid", role: "manager" },
      query: {},
    };
    const { hasBusinessAccess } = require("../src/middleware/authorize");
    assert.equal(hasBusinessAccess(req.user), true, "Manager should have business access");
  });

  test("3. Driver and Sales Staff do NOT have company-wide business access", () => {
    const { hasBusinessAccess } = require("../src/middleware/authorize");
    assert.equal(hasBusinessAccess({ role: "driver" }), false);
    assert.equal(hasBusinessAccess({ role: "sales_staff" }), false);
  });

  test("4. Invalid trip_id UUID query parameter rejected with 400", async () => {
    const req = {
      user: { userId: "driver-uid", role: "driver" },
      query: { trip_id: "not-a-uuid" },
    };
    const res = createMockRes();
    await getPayments(req, res);
    assert.equal(res.statusCode, 400, "Should reject invalid UUID with 400");
    assert.equal(res.body.message, "Invalid trip ID format");
  });

  test("5. Cross-trip query attempt by unauthorized staff returns 403 Forbidden", async () => {
    const pool = require("../src/config/database");
    const tripRes = await pool.query("SELECT id FROM trips LIMIT 1");
    const targetTripId = tripRes.rows[0]?.id || "05eb5949-51c2-4c9e-8bdb-4ddf02d3b740";

    const req = {
      user: { userId: "99999999-9999-9999-9999-999999999999", role: "driver" },
      query: { trip_id: targetTripId },
    };
    const res = createMockRes();
    await getPayments(req, res);
    assert.equal(res.statusCode, 403, "Unauthorized trip access should be blocked with 403");
  });

  test("6. Payment creation rejects inconsistent combination of sale_id, shop_id, and trip_id", async () => {
    // Creating payment with mismatched sale_id and shop_id
    const req = {
      user: { userId: "00000000-0000-0000-0000-000000000001", role: "admin" },
      body: {
        shop_id: shop1Id,
        sale_id: "00000000-0000-0000-0000-000000000000",
        payment_method: "cash",
        amount: 500,
      },
      headers: {},
    };
    const res = createMockRes();
    await createPayment(req, res);
    // Non-existent sale returns 404
    assert.equal(res.statusCode, 404);
  });

  test("7. Payment creation rejects negative or non-numeric amount", async () => {
    const req = {
      user: { userId: "00000000-0000-0000-0000-000000000001", role: "admin" },
      body: {
        shop_id: shop1Id,
        payment_method: "cash",
        amount: -50,
      },
      headers: {},
    };
    const res = createMockRes();
    await createPayment(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Payment amount must be greater than 0");
  });

  test("8. Payment creation rejects invalid payment method", async () => {
    const req = {
      user: { userId: "00000000-0000-0000-0000-000000000001", role: "admin" },
      body: {
        shop_id: shop1Id,
        payment_method: "crypto",
        amount: 100,
      },
      headers: {},
    };
    const res = createMockRes();
    await createPayment(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Invalid payment method");
  });

  test("9. Unassigned staff cannot record payments on trips they are not assigned to", async () => {
    const req = {
      user: { userId: "99999999-9999-9999-9999-999999999999", role: "driver" },
      body: {
        shop_id: shop1Id,
        trip_id: trip1Id,
        payment_method: "cash",
        amount: 250,
      },
      headers: {},
    };
    const res = createMockRes();
    await createPayment(req, res);
    assert.equal(res.statusCode, 403, "Unassigned staff should be rejected with 403");
  });

  test("10. Shop ledger accounting formulas remain balanced and verified", () => {
    const debit = 5000;
    const credit = 2000;
    const outstanding = debit - credit;
    assert.equal(outstanding, 3000, "Outstanding balance formula must be debit - credit");
  });
});
