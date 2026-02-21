const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ──── Local Strategy (username + password) ────
passport.use(new LocalStrategy(
  { usernameField: 'username' },
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username: username.toLowerCase() });
      if (!user) {
        return done(null, false, { message: 'No account with that username.' });
      }
      if (!user.password) {
        return done(null, false, { message: 'This account uses Google login. Please sign in with Google.' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// ──── Google OAuth Strategy ────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          user.avatar = profile.photos[0]?.value || '';
          await user.save();
          return done(null, user);
        }

        // Create new user — auto-generate a username from Google profile
        const baseUsername = profile.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        let finalUsername = baseUsername;
        let count = 1;
        while (await User.findOne({ username: finalUsername })) {
          finalUsername = baseUsername + count;
          count++;
        }

        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          username: finalUsername,
          email: profile.emails[0].value,
          avatar: profile.photos[0]?.value || ''
        });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
}

module.exports = passport;
