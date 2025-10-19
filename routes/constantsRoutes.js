const express = require("express");
const router = express.Router();
const constantsController = require("../controller/constantsController");
const Constants = require("../models/constantsModel");
const authController = require("../controller/authController");

// Public: read-only constants. Ensure we don't accidentally require auth for this
// route by clearing any Authorization header on the incoming request so invalid
// or malformed tokens won't trigger auth checks elsewhere.
router.get("/constants", constantsController.getConstantsByKey);

// Public: return interview tags directly at /tags for convenience
router.get(
  "/tags",
  // lightweight public handler: remove any authorization header and return
  // interview-categories directly. This bypasses controller-level auth to
  // guarantee the endpoint remains accessible to unauthenticated clients.
  async (req, res) => {
    try {
      if (req.headers && req.headers.authorization) delete req.headers.authorization;
      const key = "interview-categories";
      const doc = await Constants.findOne({ key }).lean();
      if (!doc) return res.status(200).json({ data: [] });
      return res.status(200).json({ data: doc.items || [] });
    } catch (err) {
      console.error("/tags handler error", err);
      return res.status(500).json({ message: "internal error" });
    }
  }
);

// Protected: update constants (admin) - require authentication
router.post(
  "/constants",
  authController.protect,
  constantsController.upsertConstants
);

module.exports = router;
