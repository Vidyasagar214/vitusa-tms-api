const express = require("express");

const router = express.Router();

const {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment
} = require("../controllers/shipmentController");

const { protect } =
require("../middleware/authMiddleware");

router.get("/", protect, getShipments);
router.post("/", protect, createShipment);
router.get("/:id", protect, getShipmentById);
router.patch("/:id", protect, updateShipment);

module.exports = router;