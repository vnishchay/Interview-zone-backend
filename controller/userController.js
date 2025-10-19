const userDatabase = require("../models/userModel.js");
const userModel = require("../models/userModel.js");
const bson = require("bson");
const dbService = require("../utils/dbService");
const InterviewModel = require("../models/interviewModel.js");
const mongoose = require("mongoose");
const { v4 } = require("uuid");
const updateprofile = async (req, res) => {
  try {
    const data = req.body;
    // Only allow updating ishost and iscandidate fields for role management
    const updateFields = {};
    if (typeof data.ishost !== "undefined") updateFields.ishost = !!data.ishost;
    if (typeof data.iscandidate !== "undefined")
      updateFields.iscandidate = !!data.iscandidate;
    // Optionally allow other profile fields (e.g., name, country, etc.)
    if (typeof data.name !== "undefined") updateFields.name = data.name;
    if (typeof data.country !== "undefined")
      updateFields.country = data.country;
    if (typeof data.description !== "undefined")
      updateFields.description = data.description;

    let query = { _id: req.user };
    let result = await dbService.findOneAndUpdateDocument(
      userDatabase,
      query,
      updateFields,
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

const getprofile = async (req, res) => {
  try {
    const user_id = req.user;
    const user = await userModel.findById(user_id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "fail",
      });
    }

    return res.status(200).json({
      user: user,
      status: "200",
    });
  } catch (e) {
    res.status(400).json({
      message: e.message,
      status: "fail",
    });
  }
};

const findhostprofile = async (req, res) => {
  try {
    const users = await userModel.find({ ishost: true });

    return res.status(200).json({
      data: users,
      status: "success",
    });
  } catch (e) {
    res.status(400).json({
      message: e.message,
      status: "fail",
    });
  }
};

const findcandidateprofile = async (req, res) => {
  try {
    // Find users who are not hosts (candidates looking for interviews)
    const users = await userModel.find({ ishost: { $ne: true } });

    return res.status(200).json({
      data: users,
      status: "success",
    });
  } catch (e) {
    res.status(400).json({
      message: e.message,
      status: "fail",
    });
  }
};

const findSingleProfileFilter = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username === null)
      return res.status(400).json({
        status: "fail",
        message: "username not found",
      });

    const userFound = await dbService.getSingleDocument(userModel, {
      username: username,
    });
    res.status(200).json({
      status: "success",
      user: userFound,
    });
  } catch (e) {
    res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

const submitInterviewRequest = async (req, res) => {
  try {
    const { id } = req.body;
    const user_id = req.user;
    if (`${id}` === `${user_id}`) {
      return res.status(400).json({
        status: "fail",
        message: "same user",
      });
    }
    const curr_user = await dbService.getSingleDocumentById(userModel, user_id);
    const { connections } = curr_user;
    let isConnection = false;
    for (let index = 0; index < connections.length; index++) {
      if (`${connections[index]}` === `${id}`) {
        isConnection = true;
      }
    }
    if (!isConnection) {
      return res.status(200).json({
        status: "fail",
        isConnection: false,
      });
    }

    await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: id },
      { $push: { interviewRequest: user_id } }
    );
    await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: user_id },
      { $push: { sentInterviewRequest: id } }
    );
    return res.status(200).json({
      status: "success",
      isConnection: true,
    });
  } catch (e) {
    res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

const submitConnectionRequest = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "User id is required",
      });
    }

    const user_id = req.user;

    if (`${id}` === `${user_id}`) {
      return res.status(400).json({
        status: "fail",
        message: "Cannot send connection request to yourself",
      });
    }

    // Check if target user exists
    const targetUser = await userModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    const curr_user = await dbService.getSingleDocumentById(userModel, user_id);

    // Check if already sent request
    const { sentConnectionRequest } = curr_user;
    for (let index = 0; index < sentConnectionRequest.length; index++) {
      if (`${sentConnectionRequest[index]}` === `${id}`) {
        return res.status(400).json({
          status: "fail",
          message: "Connection request already sent",
        });
      }
    }

    // Check if there's an incoming request from this user
    const { connectionRequests } = curr_user;
    for (let index = 0; index < connectionRequests.length; index++) {
      if (`${connectionRequests[index]}` === `${id}`) {
        return res.status(400).json({
          status: "fail",
          message: "Please accept the incoming connection request instead",
        });
      }
    }

    // Check if already connected
    const { connections } = curr_user;
    for (let index = 0; index < connections.length; index++) {
      if (`${connections[index]}` === `${id}`) {
        return res.status(400).json({
          status: "fail",
          message: "Already connected with this user",
        });
      }
    }

    await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: id },
      { $push: { connectionRequests: user_id } }
    );
    await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: user_id },
      { $push: { sentConnectionRequest: id } }
    );

    return res.status(200).json({
      status: "success",
      message: "Connection request sent successfully",
    });
  } catch (e) {
    res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

const handleFollow = async (req, res) => {
  try {
    const { username } = req.body;
    const userFound = await userModel.findOne({ username: username });
    if (!userFound || userFound === null) {
      return res.status(400).json({
        status: "fail",
        message: "user not found",
      });
    }
    const _id = userFound._id;
    const user_id = req.user;
    if (`${_id}` === `${user_id}`) {
      return res.status(400).json({
        status: "fail",
        message: "same user",
      });
    }

    await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: _id },
      { $push: { followers: user_id } }
    );
    await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: user_id },
      { $push: { following: _id } }
    );
    return res.status(200).json({
      status: "success",
    });
  } catch (e) {
    res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

const getProfileWithId = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await dbService.getSingleDocumentById(userModel, id);
    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (e) {
    return res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

const deleteConnectionRequest = async (req, res) => {
  try {
    const { id } = req.body;
    const user_id = req.user;
    const query = { $pull: { sentConnectionRequest: bson.ObjectID(user_id) } };
    const q = await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: id },
      query
    );
    const query2 = { $pull: { connectionRequests: bson.ObjectID(id) } };
    const q2 = await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: user_id },
      query2
    );
    res.status(200).json({
      status: "success",
      message: "Removed Connection",
    });
  } catch (e) {
    res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

const acceptConnectionRequest = async (req, res) => {
  try {
    const { id } = req.body;
    const user_id = req.user;
    const query = { $pull: { sentConnectionRequest: bson.ObjectID(user_id) } };
    const q = await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: id },
      query
    );
    const query2 = { $pull: { connectionRequests: bson.ObjectID(id) } };
    const q2 = await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: user_id },
      query2
    );
    const query3 = { $push: { connections: bson.ObjectID(id) } };
    const q3 = await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: user_id },
      query3
    );
    const query4 = { $push: { connections: bson.ObjectID(user_id) } };
    const q4 = await dbService.findOneAndUpdateDocument(
      userModel,
      { _id: id },
      query4
    );
    return res.status(200).json({
      status: "success",
      message: "successfully added connection",
    });
  } catch (e) {
    return res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

const acceptInterviewRequest = async (req, res) => {
  try {
    const { id } = req.body;
    const user_id = req.user;
    let interview_id = null;
    let session = null;
    let host = null;
    let candidate = null;

    await mongoose
      .startSession()
      .then((_session) => {
        session = _session;
        session.startTransaction();
        return userModel.findByIdAndUpdate(
          { _id: id },
          { $pull: { sentInterviewRequest: user_id } },
          { session: session }
        );
      })
      .then((res) => {
        // candidate info retrieved
        candidate = res.username;
        return userModel.findByIdAndUpdate(
          user_id,
          { $pull: { interviewRequest: id } },
          { session: session }
        );
      })
      .then((res) => {
        host = res.username;
        return InterviewModel.create(
          [
            {
              idOfHost: user_id,
              idOfParticipant: id,
              interviewID: v4(),
              hostname: host,
              candidatename: candidate,
            },
          ],
          { session: session }
        );
      })
      .then((res) => {
        interview_id = res[0]._id;
        return userModel.findByIdAndUpdate(
          id,
          { $push: { interviews: interview_id } },
          { session: session }
        );
      })
      .then((res) => {
        return userModel.findByIdAndUpdate(
          user_id,
          { $push: { interviews: interview_id } },
          { session: session }
        );
      })
      .then(() => {
        return session.commitTransaction();
      })
      .then(() => {
        session.endSession();
        return res.status(200).json({
          status: "success",
        });
      });
  } catch (e) {
    return res.status(400).json({
      status: "fail",
      message: e.message,
    });
  }
};

module.exports = {
  updateprofile,
  getprofile,
  findhostprofile,
  findcandidateprofile,
  submitInterviewRequest,
  findSingleProfileFilter,
  submitConnectionRequest,
  handleFollow,
  getProfileWithId,
  acceptConnectionRequest,
  acceptInterviewRequest,
  deleteConnectionRequest,
};
