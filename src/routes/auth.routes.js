const express = require('express');
const passport = require('passport');
require('../services/googleAuth.service');

const router = express.Router();
const auth = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', authMiddleware, auth.getProfile);

// Rota para login com Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    const token = req.user.token;
    // redireciona para frontend com o token como query param
    res.redirect(`http://localhost:5173/login/success?token=${token}`);
  }
);

module.exports = router;
