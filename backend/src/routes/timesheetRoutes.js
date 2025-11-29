const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { ensureAuth } = require('../middleware/authMiddleware');

router.use(ensureAuth);

router.get('/', timesheetController.getTimesheets);
//router.post('/', timesheetController.saveTimesheet);
router.post('/bulk', timesheetController.saveBulkTimesheets); // New Endpoint
router.get('/members', timesheetController.getTeamMembers);

module.exports = router;