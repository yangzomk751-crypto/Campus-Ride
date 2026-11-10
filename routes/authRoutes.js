const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated, ensureGuest } = require('../middleware/authMiddleware');

router.get('/login', ensureGuest, authController.getLogin);
router.post('/login', ensureGuest, authController.postLogin);

router.get('/register', ensureGuest, authController.getRegister);
router.post('/register', ensureGuest, authController.postRegister);

router.get('/profile', ensureAuthenticated, authController.getProfile);
router.post('/profile', ensureAuthenticated, authController.postProfile);

router.get('/logout', authController.logout);

module.exports = router;
