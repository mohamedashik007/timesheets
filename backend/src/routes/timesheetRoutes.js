const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { ensureAuth } = require('../middleware/authMiddleware');

router.use(ensureAuth); // All routes require login

router.get('/', timesheetController.getTimesheets);
router.post('/', timesheetController.saveTimesheet);
router.get('/members', timesheetController.getTeamMembers);

module.exports = router;