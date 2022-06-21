const express = require('express')
const router = express.Router();
const userController = require('../controller/userController')
const authController = require('../controller/authController')

router.use(authController.protect)

router.route('/user/profile').get(userController.getprofile); 
router.route('/user/profile').put(userController.updateprofile)
router.route('/user/interviewer').get(userController.findhostprofile)
router.route('/user/findSingleProfileWithFilter').get(userController.findSingleProfileFilter)

module.exports = router