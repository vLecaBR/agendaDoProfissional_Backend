const express = require('express');
const router = express.Router();

const auth = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Registro com email/senha
router.post('/register', auth.register);

// Login com email/senha
router.post('/login', auth.login);

// Login com token Google OAuth (recebe token do front e valida no backend)
router.post('/google-login', auth.googleLogin);

// Rota protegida que retorna perfil do usuário logado
router.get('/me', authenticate, auth.getProfile);

module.exports = router;
