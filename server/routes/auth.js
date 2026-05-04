const router = require('express').Router();
const passport = require('passport');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect(process.env.APP_URL || '/')
);

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  const { id, name, email, avatar_url } = req.user;
  res.json({ id, name, email, avatar: avatar_url });
});

router.post('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

module.exports = router;
