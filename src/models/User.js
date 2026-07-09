const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["admin", "coordinator", "finance", "carrier"],
      required: true
    },

    department: {
      type: String,
      default: ""
    },

    carrierPortal: {
      type: String,
      enum: ["none", "enabled", "full"],
      default: "none"
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },

    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
