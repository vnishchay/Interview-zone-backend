const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;
const schema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
    },
    country: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    interviews: {
      type: [Schema.Types.ObjectID],
    },
    ishost: {
      type: Boolean,
      default: false,
    },
    iscandidate: {
      type: Boolean,
      default: false,
    },
    connections: {
      type: [Schema.Types.ObjectId],
    },
    followers: {
      type: [Schema.Types.ObjectId],
    },
    connectionRequests: {
      type: [Schema.Types.ObjectId],
    },
    sentConnectionRequest: {
      type: [Schema.Types.ObjectId],
    },
    interviewRequest: {
      type: [Schema.Types.ObjectId], // of user , if accepted, ask to schedule interview in future, and remove from here to intervies
    },
    sentInterviewRequest: {
      type: [Schema.Types.ObjectId],
    },
    following: {
      type: [Schema.Types.ObjectId],
    },
      // tags for interviewer niches / categories. Stored as array of strings
      // (tag keys). This keeps queries simple and avoids expensive joins.
      tags: {
        type: [String],
        default: [],
      },
  },
  {
    timestamps: true,
  }
);

schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

schema.methods.addUsername = async function () {
  return bcrypt.hash(this.password.substr(4), 6);
};

schema.methods.CheckPass = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Ensure indexes are created for uniqueness. Note: if your database already
// contains duplicate documents for `email` or `username`, index creation will
// fail. Clean duplicates before enabling automatic index creation in production.
schema.index({ email: 1 }, { unique: true, background: true });
schema.index({ username: 1 }, { unique: true, sparse: true, background: true });

const User = mongoose.model("User", schema, "User Model");

module.exports = User;
