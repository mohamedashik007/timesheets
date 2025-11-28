const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAdmin } = require('../middleware/authMiddleware');

// All routes here require Admin privileges
router.get('/', ensureAdmin, userController.getAllUsers);
router.post('/', ensureAdmin, userController.createUser);
router.put('/:id', ensureAdmin, userController.updateUser);
router.delete('/:id', ensureAdmin, userController.deleteUser);

module.exports = router;