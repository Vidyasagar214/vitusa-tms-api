const mongoose = require("mongoose");

const varianceDetailSchema = new mongoose.Schema(
  {
    baseRate: Number,
    fuelSurcharge: Number,
    unauthorizedAccessorial: Number,
    variance: Number,
    reason: String
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    shipmentId: {
      type: String,
      required: true,
      trim: true
    },

    carrier: {
      type: String,
      default: ""
    },

    expectedAmount: {
      type: Number,
      required: true
    },

    submittedAmount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "On Hold", "Rejected"],
      default: "Pending"
    },

    holdReason: {
      type: String,
      default: ""
    },

    varianceDetail: varianceDetailSchema
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
