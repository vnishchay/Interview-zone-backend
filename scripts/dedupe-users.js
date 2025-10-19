#!/usr/bin/env node
/**
 * Safe dedupe script for Users collection.
 * Usage:
 *  node scripts/dedupe-users.js           # dry-run, report duplicates
 *  node scripts/dedupe-users.js --apply   # perform deletion of duplicates (keep earliest created)
 *
 * The script creates a backup JSON of removed docs before deleting.
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const User = require("../models/userModel");
const dbConnect = require("../config/dbconfig");

async function main() {
  const apply = process.argv.includes("--apply");

  console.log(`Connecting to MongoDB...`);
  await dbConnect();

  console.log(`Searching for duplicate users by email...`);
  // Find duplicate emails
  const duplicatesByEmail = await User.aggregate([
    {
      $group: {
        _id: "$email",
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        docs: { $push: "$$ROOT" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  const duplicatesByUsername = await User.aggregate([
    {
      $group: {
        _id: "$username",
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        docs: { $push: "$$ROOT" },
      },
    },
    { $match: { count: { $gt: 1 }, _id: { $ne: null } } },
  ]);

  const report = {
    emailDuplicates: duplicatesByEmail.map((d) => ({
      email: d._id,
      count: d.count,
      ids: d.ids,
    })),
    usernameDuplicates: duplicatesByUsername.map((d) => ({
      username: d._id,
      count: d.count,
      ids: d.ids,
    })),
  };

  console.log("Duplicate report:");
  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log(
      "\nDry-run mode. No changes made. Rerun with --apply to remove duplicates."
    );
    process.exit(0);
  }

  // Backup duplicates before deletion
  const backupDir = path.join(__dirname, "..", "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(
    backupDir,
    `user-duplicates-backup-${timestamp}.json`
  );

  const toRemove = [];

  // For email duplicates: keep earliest createdAt (or first) and remove rest
  for (const group of duplicatesByEmail) {
    const docs = group.docs.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const keep = docs[0];
    const remove = docs.slice(1);
    toRemove.push(...remove);
  }

  // For username duplicates: avoid removing same doc twice
  for (const group of duplicatesByUsername) {
    const docs = group.docs.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const keep = docs[0];
    const remove = docs
      .slice(1)
      .filter((r) => !toRemove.find((x) => String(x._id) === String(r._id)));
    toRemove.push(...remove);
  }

  if (toRemove.length === 0) {
    console.log("No duplicates to remove after consolidation.");
    process.exit(0);
  }

  // write backup
  fs.writeFileSync(backupFile, JSON.stringify(toRemove, null, 2), "utf8");
  console.log(
    `Backed up ${toRemove.length} duplicate user docs to ${backupFile}`
  );

  // Delete duplicates
  const idsToRemove = toRemove.map((d) => d._id);
  const delResult = await User.deleteMany({ _id: { $in: idsToRemove } });
  console.log(`Deleted ${delResult.deletedCount} duplicate user documents.`);

  console.log("Done. Restart your app and verify results.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error running dedupe script:", err);
  process.exit(1);
});
