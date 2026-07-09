const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    title: String,
    detail: String,
    complete: Boolean,
    active: Boolean
  },
  { _id: false }
);

const bulkRequirementSchema = new mongoose.Schema(
  {
    label: String,
    value: String,
    highlight: { type: Boolean, default: false }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    abbr: String,
    abbrClass: String,
    title: String,
    source: String
  },
  { _id: false }
);

const auditEntrySchema = new mongoose.Schema(
  {
    action: String,
    detail: String
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true
    },

    poNumber: {
      type: String,
      default: ""
    },

    customer: {
      type: String,
      required: true
    },

    commodity: {
      type: String,
      required: true
    },

    lane: {
      type: String,
      required: true
    },

    laneTemplate: {
      type: String,
      default: ""
    },

    bolStatus: {
      type: String,
      default: "BOL pending"
    },

    mode: {
      type: String,
      enum: ["Bulk", "TL", "LTL", "Intermodal"],
      required: true
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Tendered",
        "Dispatched",
        "In Transit",
        "Delivered",
        "Delayed",
        "Blind",
        "Exception"
      ],
      default: "Draft"
    },

    pickupDate: {
      type: Date
    },

    deliveryDate: {
      type: Date
    },

    carrier: {
      type: String
    },

    rate: {
      type: Number,
      required: true
    },

    freightCost: {
      base: Number,
      fsc: Number
    },

    route: {
      pickupLocation: String,
      deliveryLocation: String
    },

    carrierInfo: {
      description: String,
      tenderStatus: String,
      tenderDetail: String
    },

    milestones: [milestoneSchema],
    bulkRequirements: [bulkRequirementSchema],
    documents: [documentSchema],
    auditTrail: [auditEntrySchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Shipment", shipmentSchema);
