const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// ==== Rotas públicas ====
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);

// ==== Rotas privadas ====
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
