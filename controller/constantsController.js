const Constants = require("../models/constantsModel");

exports.getConstantsByKey = async (req, res) => {
  try {
    const { key } = req.query;
    if (!key)
      return res.status(400).json({ message: "key query param required" });

    const doc = await Constants.findOne({ key }).lean();
    if (!doc) return res.status(404).json({ message: "constants not found" });

    return res.status(200).json({ data: doc.items || [] });
  } catch (err) {
    console.error("getConstantsByKey error", err);
    return res.status(500).json({ message: "internal error" });
  }
};

exports.upsertConstants = async (req, res) => {
  try {
    const { key, items } = req.body;
    if (!key || !Array.isArray(items))
      return res.status(400).json({ message: "key and items array required" });

    const updated = await Constants.findOneAndUpdate(
      { key },
      { $set: { items } },
      { upsert: true, new: true }
    );

    return res.status(200).json({ data: updated });
  } catch (err) {
    console.error("upsertConstants error", err);
    return res.status(500).json({ message: "internal error" });
  }
};

// Public helper: return the set of interview categories (tags)
exports.getAllTags = async (req, res) => {
  try {
    const key = "interview-categories";
    const doc = await Constants.findOne({ key }).lean();
    if (!doc) return res.status(200).json({ data: [] });
    return res.status(200).json({ data: doc.items || [] });
  } catch (err) {
    console.error("getAllTags error", err);
    return res.status(500).json({ message: "internal error" });
  }
};
