const express = require('express')
const router = express.Router();
const userController = require('../controller/userController')
const authController = require('../controller/authController')

router.use(authController.protect)

router.route('/user/profile').get(userController.getprofile); 
router.route('/user/profile').put(userController.updateprofile)
router.route('/user/interviewer').get(userController.findhostprofile)
router.route('/user/findSingleProfileWithFilter').post(userController.findSingleProfileFilter)
router.route('/user/interviewRequest').post(userController.submitInterviewRequest)
router.route('/user/connectionrequest').post(userController.submitConnectionRequest)
router.route('/user/followrequest').post(userController.handleFollow)
router.route('/user/getUserById').post(userController.getProfileWithId)
router.route('/user/acceptConnection').post(userController.acceptConnectionRequest)
router.route('/user/acceptInterview').post(userController.acceptInterviewRequest)
module.exports = router