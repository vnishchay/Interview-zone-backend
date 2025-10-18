const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;
const schema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: false,
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
  console.log(await bcrypt.compare(candidatePassword, userPassword));
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model("User", schema, "User Model");
