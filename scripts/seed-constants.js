/**
 * Simple seed script to populate interview categories into Constants collection.
 * Usage: node scripts/seed-constants.js --apply to write to DB. Default is dry-run.
 */

const mongoose = require("mongoose");
const Constants = require("../models/constantsModel");
const argv = process.argv.slice(2);
const apply = argv.includes("--apply");

const INTERVIEW_CATEGORIES = [
  { key: "dsa", label: "Data Structures & Algorithms" },
  { key: "system-design", label: "System Design" },
  { key: "frontend", label: "Frontend Development" },
  { key: "backend", label: "Backend Development" },
  { key: "databases", label: "Databases" },
  { key: "devops", label: "DevOps" },
  { key: "machine-learning", label: "Machine Learning" },
  { key: "mobile", label: "Mobile Development" },
  { key: "security", label: "Security" },
  { key: "testing", label: "Testing & QA" },
  { key: "behavioral", label: "Behavioral / Soft Skills" },
  { key: "product", label: "Product / Design" },
];

async function run() {
  // const apply is set above from process.argv

  const payload = {
    key: "interview-categories",
    items: INTERVIEW_CATEGORIES.map((i) => ({ key: i.key, label: i.label })),
  };

  console.log(
    "DRY RUN: would upsert constants:",
    JSON.stringify(payload, null, 2)
  );
  if (!apply) {
    console.log("\nRun with --apply to persist to the connected DB");
    process.exit(0);
  }

  // connect to DB using MONGO_URI env var
  const uri =
    process.env.MONGO_URI || "mongodb://localhost:27017/interview-zone";
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("connected to", uri);

  const updated = await Constants.findOneAndUpdate(
    { key: payload.key },
    { $set: { items: payload.items } },
    { upsert: true, new: true }
  );
  console.log("seeded constants:", updated);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("seed error", err);
  process.exit(1);
});
