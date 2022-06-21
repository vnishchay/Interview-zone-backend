const express = require("express");
const router = express.Router();
const { userAddition, userLogin , checkUsername} = require('../controller/authController')

router.route("/signup").post(userAddition);
router.route("/login").post(userLogin);
router.route("/verifyusername").post(checkUsername); 


module.exports = router