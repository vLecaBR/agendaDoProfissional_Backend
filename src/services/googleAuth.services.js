const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails } = profile;

    let user = await prisma.user.findUnique({ where: { email: emails[0].value } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: displayName,
          email: emails[0].value,
          googleId: id,
        }
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    done(null, { ...user, token });
  })
);
