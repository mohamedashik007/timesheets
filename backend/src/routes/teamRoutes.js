const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { ensureAdmin } = require('../middleware/authMiddleware');

// All routes here require Admin privileges
router.get('/', ensureAdmin, teamController.getAllTeams);
router.post('/', ensureAdmin, teamController.createTeam);
router.put('/:id', ensureAdmin, teamController.updateTeam);
router.delete('/:id', ensureAdmin, teamController.deleteTeam);

module.exports = router;