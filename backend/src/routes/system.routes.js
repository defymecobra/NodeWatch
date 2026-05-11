const express = require('express');
const router = express.Router();
const { getMetrics } = require('../controllers/system.controller');
const { validateJwt, requireDeveloper } = require('../middleware/auth');

router.use(validateJwt);
router.use(requireDeveloper);

router.get('/metrics', getMetrics);

module.exports = router;
