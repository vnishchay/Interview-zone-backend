const interview = require("../models/interviewModel");
const dbService = require("../utils/dbService");
const InterviewModel = require("../models/interviewModel");

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

    let data = new interview({
      ...payload,
    });
    // store host as the authenticated user id (prefer id if present)
    data.idOfHost = req.user && req.user.id ? req.user.id : req.user;

    let result = await dbService.createDocument(interview, data);
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
      data.idOfParticipant = req.user && req.user.id ? req.user.id : req.user;
      // also set candidatename if available on req.user
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
      data,
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

    console.log(`[SESSION LOG] ${userName} - ${action}:`, details);

    return res.status(200).json({
      data: updatedInterview,
      status: "success",
      message: "Log added successfully",
    });
  } catch (e) {
    console.error("[SESSION LOG ERROR]:", e);
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
