const express = require("express");

const router = express.Router();

const {
  getSummary,
  getCustomers,
  createCustomer,
  getLocations,
  createLocation,
  getCarriers,
  createCarrier,
  getCommodities,
  createCommodity
} = require("../controllers/masterDataController");

const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/summary", getSummary);
router.get("/customers", getCustomers);
router.get("/locations", getLocations);
router.get("/carriers", getCarriers);
router.get("/commodities", getCommodities);

router.post("/customers", authorize("admin", "coordinator"), createCustomer);
router.post("/locations", authorize("admin", "coordinator"), createLocation);
router.post("/carriers", authorize("admin", "coordinator"), createCarrier);
router.post("/commodities", authorize("admin", "coordinator"), createCommodity);

module.exports = router;
