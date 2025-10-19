
const express = require('express');
const routers = express.Router();

// Mount public constants/tags early so public endpoints are handled before
// any routers that register global auth middleware. This prevents middleware
// like `router.use(authController.protect)` in other routers from running
// for public constant endpoints (e.g. GET /tags).
routers.use(require('./authroutes'));
routers.use(require('./constantsRoutes'));
routers.use(require('./questionsRoute'));
routers.use(require('./interviewRoutes'));
routers.use(require('./userRoutes'));

module.exports = routers;
