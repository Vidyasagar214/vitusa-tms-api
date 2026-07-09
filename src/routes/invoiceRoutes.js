const express = require("express");

const router = express.Router();

const {
  getSummary,
  getInvoices,
  getInvoiceById,
  updateInvoice
} = require("../controllers/invoiceController");

const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/summary", getSummary);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.patch("/:id", authorize("admin", "finance"), updateInvoice);

module.exports = router;
