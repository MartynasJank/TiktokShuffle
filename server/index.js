require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const REQUIRED_ENV = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  console.error('Copy server/.env.example to server/.env and fill in the values.');
  process.exit(1);
}

const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

const sessionStore = new MySQLStore({}, pool);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

app.use(express.json({ limit: '5mb' }));

const CALLBACK_URL = `${process.env.APP_URL}/api/auth/google/callback`;
console.log('OAuth callback URL:', CALLBACK_URL);

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const avatar = profile.photos?.[0]?.value || null;
    await pool.query(
      `INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), avatar_url = VALUES(avatar_url)`,
      [googleId, email, name, avatar]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, rows[0] || false);
  } catch (err) {
    done(err);
  }
});

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/session', require('./routes/session'));

const DIST = path.join(__dirname, '..', 'dist');
app.use(express.static(DIST));
app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
