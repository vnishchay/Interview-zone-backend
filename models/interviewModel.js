const Question = require("./questionModel");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    typeOfInterview: {
      type: String,
      required: false,
      ref: "typeOfInterview",
    },
    numberOfQuestions: {
      type: String,
      required: false,
      ref: "numberOfQuestions",
    },
    levelOfQuestions: {
      type: String,
      default: "EASY",
      ref: "levelOfQuestions",
    },
    questions: {
      type: [{ type: Schema.Types.ObjectId }],
      ref: "questions",
    },
    idOfHost: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "host",
    },
    hostname: {
      type: String,
    },
    candidatename: {
      type: String,
    },
    idOfParticipant: {
      type: Schema.Types.ObjectId,
      ref: "participant",
    },
    interviewID: {
      type: String,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    sessionLogs: {
      type: [
        {
          timestamp: { type: Date, default: Date.now },
          action: { type: String }, // 'join', 'leave', 'video_toggle', 'audio_toggle', 'question_add', 'question_edit', 'question_delete', 'code_edit', 'chat_message'
          userName: { type: String },
          details: { type: Schema.Types.Mixed }, // Flexible field for any additional data
        },
      ],
      default: [],
    },
    codeSnapshot: {
      type: String,
      default: "",
    },
    finalQuestions: {
      type: [
        {
          questionTitle: String,
          questionLevel: String,
          questionCategory: String,
          questionExample: String,
          questionOutput: String,
          bestSolution: String,
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

schema.method("toJSON", function () {
  const { _id, __v, ...object } = this.toObject({ virtuals: true });
  object.id = _id;

  return object;
});

const InterviewModel = mongoose.model("interview", schema);

module.exports = InterviewModel;

// Ensure interviewID is unique to avoid accidental duplicate interview docs
schema.index(
  { interviewID: 1 },
  { unique: true, sparse: true, background: true }
);
