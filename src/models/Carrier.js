const mongoose = require("mongoose");

const carrierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    scac: { type: String, trim: true, default: "" },
    ediConnected: { type: Boolean, default: false },
    portalEnabled: { type: Boolean, default: false },
    modes: {
      type: [String],
      enum: ["Bulk", "TL", "LTL", "Intermodal"],
      default: ["TL"]
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Carrier", carrierSchema);