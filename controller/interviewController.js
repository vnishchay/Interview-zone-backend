const interview = require("../models/interviewModel");
const dbService = require("../utils/dbService");
const InterviewModel = require("../models/interviewModel");
const mongoose = require("mongoose");
// top-level DB-backed error persister
const { populateErrorTable } = require("../utils/logger");

/**
 * @description : create document of interview in mongodb collection.
 * @param {obj} req : request including body for creating document.
 * @param {obj} res : response of created document
 * @return {obj} : created interview. {status, message, data}
 */
const addInterview = async (req, res) => {
  try {
    // Prevent client from pre-assigning participant or host fields.
    // Host is always set to the authenticated user creating the interview.
    const payload = { ...req.body };
    delete payload.idOfParticipant;
    delete payload.candidatename;
    delete payload.idOfHost;

    // Build a plain payload object for creation
    const dataPayload = { ...payload };
    // store host as the authenticated user id (prefer id if present)
    // Resolve the authenticated user id into a form acceptable for MongoDB.
    // Sometimes middleware may attach a Buffer or a mongoose ObjectId; normalize
    // to either a string or a mongoose ObjectId to avoid casting failures.
    let resolvedUserId =
      req.user && (req.user.id || req.user._id)
        ? req.user.id || req.user._id
        : req.user;

    // If middleware provided a raw Buffer (12-byte ObjectId buffer), convert to ObjectId
    if (Buffer.isBuffer(resolvedUserId)) {
      try {
        resolvedUserId = mongoose.Types.ObjectId(resolvedUserId);
      } catch (e) {
        // fallback to hex string representation
        resolvedUserId = resolvedUserId.toString("hex");
      }
    }

    // If an object with an _id property was provided, extract it
    if (
      resolvedUserId &&
      typeof resolvedUserId === "object" &&
      resolvedUserId._id
    ) {
      resolvedUserId = resolvedUserId._id;
    }

    dataPayload.idOfHost = resolvedUserId;

    // store hostname from authenticated user when available (keeps server authoritative)
    if (req.user && req.user.username) {
      dataPayload.hostname = req.user.username;
    } else if (payload.hostname) {
      dataPayload.hostname = payload.hostname;
    }

    // Ensure interviewID exists; generate a short unique id if none provided
    if (!payload.interviewID && !dataPayload.interviewID) {
      dataPayload.interviewID = `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .substr(2, 6)}`;
    } else if (payload.interviewID) {
      dataPayload.interviewID = payload.interviewID;
    }

    // record startTime: allow caller to set it (ISO string) or default to now
    if (payload.startTime) {
      try {
        dataPayload.startTime = new Date(payload.startTime);
      } catch (e) {
        dataPayload.startTime = new Date();
      }
    } else {
      dataPayload.startTime = new Date();
    }

    // If client provided an interviewID that already exists, return the existing doc
    if (dataPayload.interviewID) {
      const existing = await InterviewModel.findOne({
        interviewID: dataPayload.interviewID,
      });
      if (existing) {
        return res.ok({ data: existing });
      }
    }

    let result = await dbService.createDocument(interview, dataPayload);
    return res.ok({ data: result });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.validationError({
        message: `Invalid Data, Validation Failed at ${error.message}`,
      });
    }
    if (error.code && error.code == 11000) {
      return res.isDuplicate();
    }
    return res.failureResponse({ data: error.message });
  }
};

/**
 * @description : update document of interview with data by id.
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated interview.
 * @return {obj} : updated interview. {status, message, data}
 */
const updateinterview = async (req, res) => {
  try {
    delete req.body["addedBy"];
    delete req.body["updatedBy"];
    let data = {
      updatedBy: req.user.id,
      ...req.body,
    };

    // If the participant is attempting to 'join' (client uses 'update'),
    // interpret that as the authenticated user wanting to set themselves
    // as the participant for the interview. We must ensure we don't
    // overwrite an already assigned participant.
    let joiningAsParticipant = false;
    if (data.idOfParticipant === "update") {
      joiningAsParticipant = true;
      // normalize to user id
      let participantId =
        req.user && (req.user.id || req.user._id)
          ? req.user.id || req.user._id
          : req.user;
      if (Buffer.isBuffer(participantId)) {
        try {
          participantId = mongoose.Types.ObjectId(participantId);
        } catch (e) {
          participantId = participantId.toString("hex");
        }
      }
      if (
        participantId &&
        typeof participantId === "object" &&
        participantId._id
      ) {
        participantId = participantId._id;
      }
      data.idOfParticipant = participantId;
      // also set candidatename if available on req.user (persist candidate's display name)
      if (req.user && req.user.username) {
        data.candidatename = req.user.username;
      }
    }

    // If attempting to set idOfParticipant to some other value via request body,
    // leave validation to Joi/other logic but we will guard overwrite below.

    let validateRequest = validation.validateParamsWithJoi(
      data,
      interviewSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.inValidParam({
        message: `Invalid values in parameters, ${validateRequest.message}`,
      });
    }
    let query = { _id: req.params.id };

    // If this request is a participant joining, ensure no other participant exists
    if (joiningAsParticipant) {
      const existing = await InterviewModel.findById(req.params.id).lean();
      if (!existing) {
        return res.recordNotFound();
      }

      // If a different participant is already assigned, reject the join
      if (
        existing.idOfParticipant &&
        existing.idOfParticipant.toString() !== String(data.idOfParticipant)
      ) {
        return res.status(400).json({
          message: "Participant already assigned for this interview",
          status: "fail",
        });
      }
    }

    let result = await dbService.findOneAndUpdateDocument(
      interview,
      query,
      // If caller provided an endTime or requested archive, normalize and mark archived
      (() => {
        const normalized = { ...data };
        if (data.endTime) {
          try {
            normalized.endTime = new Date(data.endTime);
          } catch (e) {
            normalized.endTime = new Date();
          }
          normalized.archived = true;
          normalized.archivedAt = new Date();
        }
        if (data.archived && !normalized.archivedAt) {
          normalized.archived = true;
          normalized.archivedAt = new Date();
        }
        return normalized;
      })(),
      { new: true }
    );
    if (!result) {
      return res.recordNotFound();
    }
    return res.ok({ data: result });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.validationError({
        message: `Invalid Data, Validation Failed at ${error.message}`,
      });
    } else if (error.code && error.code == 11000) {
      return res.isDuplicate();
    }
    return res.failureResponse({ data: error.message });
  }
};
const findInterview = async (req, res) => {
  try {
    const interview = await InterviewModel.find();
    return res.status(200).json({
      data: interview,
      status: "success",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
      status: "fail",
    });
  }
};

const findInterviewfilter = async (req, res) => {
  try {
    const filter = req.body;

    const interview = await InterviewModel.find(filter);

    return res.status(200).json({
      data: interview,
      status: "success",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
      status: "fail",
    });
  }
};

const findInterviewById = async (req, res) => {
  try {
    const { id } = req.body;
    const interview = await dbService.getSingleDocumentById(InterviewModel, id);
    return res.status(200).json({
      data: interview,
      status: "success",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
      status: "fail",
    });
  }
};

/**
 * @description : add a log entry to the interview session
 * @param {obj} req : request with interviewID, action, userName, details
 * @param {obj} res : response with updated interview
 * @return {obj} : updated interview
 */
const addSessionLog = async (req, res) => {
  try {
    const { interviewID, action, userName, details } = req.body;

    if (!interviewID || !action || !userName) {
      return res.status(400).json({
        message: "Missing required fields: interviewID, action, userName",
        status: "fail",
      });
    }

    const logEntry = {
      timestamp: new Date(),
      action,
      userName,
      details: details || {},
    };

    const updatedInterview = await InterviewModel.findOneAndUpdate(
      { interviewID },
      { $push: { sessionLogs: logEntry } },
      { new: true }
    );

    if (!updatedInterview) {
      return res.status(404).json({
        message: "Interview not found",
        status: "fail",
      });
    }

    // Session log added (info/debug logs removed per requested replacement)

    return res.status(200).json({
      data: updatedInterview,
      status: "success",
      message: "Log added successfully",
    });
  } catch (e) {
    const { populateErrorTable } = require("../utils/logger");
    populateErrorTable("error", "Session log error", {
      message: e && e.message ? e.message : e,
      stack: e && e.stack ? e.stack : undefined,
    });
    return res.status(500).json({
      message: e.message,
      status: "fail",
    });
  }
};

/**
 * @description : update code snapshot in interview
 * @param {obj} req : request with interviewID, code
 * @param {obj} res : response with updated interview
 * @return {obj} : updated interview
 */
const updateCodeSnapshot = async (req, res) => {
  try {
    const { interviewID, code } = req.body;

    const updatedInterview = await InterviewModel.findOneAndUpdate(
      { interviewID },
      { codeSnapshot: code },
      { new: true }
    );

    if (!updatedInterview) {
      return res.status(404).json({
        message: "Interview not found",
        status: "fail",
      });
    }

    return res.status(200).json({
      data: updatedInterview,
      status: "success",
    });
  } catch (e) {
    return res.status(500).json({
      message: e.message,
      status: "fail",
    });
  }
};

/**
 * @description : save final questions to interview
 * @param {obj} req : request with interviewID, questions
 * @param {obj} res : response with updated interview
 * @return {obj} : updated interview
 */
const saveFinalQuestions = async (req, res) => {
  try {
    const { interviewID, questions } = req.body;

    const updatedInterview = await InterviewModel.findOneAndUpdate(
      { interviewID },
      { finalQuestions: questions },
      { new: true }
    );

    if (!updatedInterview) {
      return res.status(404).json({
        message: "Interview not found",
        status: "fail",
      });
    }

    return res.status(200).json({
      data: updatedInterview,
      status: "success",
    });
  } catch (e) {
    return res.status(500).json({
      message: e.message,
      status: "fail",
    });
  }
};

module.exports = {
  addInterview,
  findInterview,
  updateinterview,
  findInterviewfilter,
  findInterviewById,
  addSessionLog,
  updateCodeSnapshot,
  saveFinalQuestions,
};
