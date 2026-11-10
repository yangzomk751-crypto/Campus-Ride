const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { ensureAuthenticated, ensureGuest } = require('../middleware/auth');

router.get('/login', ensureGuest, AuthController.getLogin);
router.post('/login', ensureGuest, AuthController.postLogin);

router.get('/register', ensureGuest, AuthController.getRegister);
router.post('/register', ensureGuest, AuthController.postRegister);

router.all('/logout', AuthController.logout);

router.get('/profile', ensureAuthenticated, AuthController.getProfile);

module.exports = router;
