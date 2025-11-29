const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { ensureAuth } = require('../middleware/authMiddleware');

router.use(ensureAuth);

// Ensure these match the 'exports.X' names in the controller
router.get('/', timesheetController.getTimesheets);
router.post('/bulk', timesheetController.saveBulkTimesheets); 
router.get('/members', timesheetController.getTeamMembers);

module.exports = router;