const express = require("express");
const router = express.Router();
const interview = require("../controller/interviewController");
const authController = require('../controller/authController');


router.use(authController.protect)
// router.route("/interview/find").post(interview.)
router.route("/interview/find").get(interview.findInterview)
router.route("/interview/findfilter").post(interview.findInterviewfilter)
router.route('/interview/findbyId').post(interview.findInterviewById); 
// router.route("/interview/get").post(interview.findAllinterview);
router.route("/interview/create").post(interview.addInterview);
router.route("/interview/update/:id").patch(interview.updateinterview);

// Session logging routes
router.route("/interview/log").post(interview.addSessionLog);
router.route("/interview/code").post(interview.updateCodeSnapshot);
router.route("/interview/questions").post(interview.saveFinalQuestions);

module.exports = router;
