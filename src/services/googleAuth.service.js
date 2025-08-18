const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const prisma = require('../prisma'); // Prisma centralizado

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      const { id: googleId, displayName, emails } = profile;
      const email = emails[0].value;

      try {
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Cria novo usuário
          user = await prisma.user.create({
            data: {
              name: displayName,
              email,
              googleId,
              role: 'CLIENT', // padrão
            },
          });
        } else if (!user.googleId) {
          // Vincula Google ao usuário existente
          user = await prisma.user.update({
            where: { email },
            data: { googleId },
          });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
          expiresIn: '7d',
        });

        done(null, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      } catch (err) {
        done(err, null);
      }
    }
  )
);
