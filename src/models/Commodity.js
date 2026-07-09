const mongoose = require("mongoose");

const bulkRequirementSchema = new mongoose.Schema(
  {
    label: String,
    value: String,
    highlight: { type: Boolean, default: false }
  },
  { _id: false }
);

const commoditySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    mode: {
      type: String,
      enum: ["Bulk", "TL", "LTL", "Intermodal"],
      default: "Bulk"
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    bulkRequirements: [bulkRequirementSchema],
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Commodity", commoditySchema);