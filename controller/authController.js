const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
require("dotenv").config();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

const createSendToken = (user, id, statusCode, req, res) => {
  const token = signToken(id);
  const name = (user.firstName || "") + " " + (user.lastName || "");
  const email = user.email;
  // Include a user object so frontend can populate authState.user with id and username
  const userPayload = {
    id: user._id,
    _id: user._id,
    username: user.username || name || email,
    name,
    email,
    role: user.role,
  };
  let data = { name, email, role: user.role };
  res.status(statusCode).json({
    statusCode,
    token,
    data,
    user: userPayload,
  });
};

// provide a top-level reference to the DB-backed error persister
const { populateErrorTable } = require("../utils/logger");

exports.checkUsername = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) return next(createError(500, "username not found"));
    const userfound = await userModel.findOne({ username: username });
    if (userfound) {
      return res.status(400).json({
        status: "fail",
        message: "username already exists",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "unique username",
    });
  } catch (e) {
    return next(createError(400, e.message));
  }
};

exports.userAddition = async (req, res, next) => {
  try {
  // remove noisy request-body log
    const { email, password, username, country } = req.body;
    if (!email || !password || !username) {
      // missing required fields - avoid verbose logging
      return next(createError(500, "email or passowrd or username required"));
    }
    // add a validator to check if input is actually a email
    const userFound = await userModel.findOne({ email: email });
    if (userFound) {
      return res.status(400).json({
        status: "fail",
        message: "Email already exists",
      });
    }
    try {
      const newUser = await userModel.create({
        email: email,
        username: username,
        country: country,
        password: password,
      });
      // new user created
      createSendToken(newUser, newUser._id, 201, req, res);
      return;
    } catch (createErr) {
      // Handle duplicate key error (E11000) gracefully
      if (createErr && createErr.code && createErr.code === 11000) {
        return res.status(409).json({
          status: "fail",
          message: "A user with provided email or username already exists",
        });
      }
      throw createErr;
    }
  } catch (err) {
    const { populateErrorTable } = require("../utils/logger");
    populateErrorTable("error", "[REGISTER] Error", {
      message: err && err.message ? err.message : err,
      stack: err && err.stack ? err.stack : undefined,
    });
    return next(createError(400, err.message));
  }
};

exports.userLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

  // login attempt

    if (!email || !password) {
      return next(createError(500, "email or password required"));
    }

    const user = await userModel.findOne({ email: email });
    if (!user) {
      return next(createError(400, "email or password is not correct"));
    }
    // check password
    const check = await user.CheckPass(password, user.password);

    if (check) {
      createSendToken(user, user._id, 200, req, res);
    } else {
      return next(createError(400, "email or password is not correct"));
    }
  } catch (err) {
    const { populateErrorTable } = require("../utils/logger");
    populateErrorTable("error", "[LOGIN] Error", {
      message: err && err.message ? err.message : err,
      stack: err && err.stack ? err.stack : undefined,
    });
    return next(new Error(err));
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = await req.headers.authorization.split(" ")[1];
    }

    if (!token || token === "null") {
      return next(
        createError(401, "You are not logged in! Please log in to get access.")
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await userModel.findById(decoded.id);

    if (!currentUser) {
      return next(
        createError(
          401,
          "The user belonging to this token does no longer exist."
        )
      );
    }

    req.user = currentUser._id;
    next();
  } catch (err) {
    return next(new Error(err.message));
  }
};
