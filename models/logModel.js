const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    level: { type: String, enum: ["error", "info", "debug"], required: true },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Log", schema, "logs");
