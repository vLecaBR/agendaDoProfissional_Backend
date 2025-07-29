const express = require('express');
const passport = require('passport');
require('../services/googleAuth.service'); // configura passport Google OAuth

const router = express.Router();
const auth = require('../controllers/auth.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

// Registro com email/senha (qualquer um pode criar, mas role padrão é CLIENT)
router.post('/register', auth.register);

// Login com email/senha
router.post('/login', auth.login);

// Rota protegida que retorna perfil do usuário logado
router.get('/me', authenticate, auth.getProfile);

// Login via Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback do Google após autenticação
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    const token = req.user.token;
    res.redirect(`http://localhost:5173/login/success?token=${token}`);
  }
);

module.exports = router;
