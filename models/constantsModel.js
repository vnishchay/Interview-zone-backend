const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // e.g. 'interview-categories'
    value: { type: String },
    items: [
      {
        key: { type: String, required: true }, // unique tag key
        label: { type: String, required: true }, // human label
        description: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// ensure one document per key
schema.index({ key: 1 }, { unique: true, background: true });

const Constants = mongoose.model("Constants", schema, "Constants");
module.exports = Constants;
