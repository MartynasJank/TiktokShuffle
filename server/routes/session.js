const router = require('express').Router();
const pool = require('../db');

function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT deck, current_index, is_complete, is_demo, file_fingerprint, unavailable_ids, updated_at
       FROM user_sessions WHERE user_id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.json(null);
    const r = rows[0];
    res.json({
      deck: r.deck,
      index: r.current_index,
      complete: !!r.is_complete,
      demo: !!r.is_demo,
      fingerprint: r.file_fingerprint,
      unavailableIds: r.unavailable_ids || [],
      updatedAt: r.updated_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Full upsert — called once when a new file is loaded or reshuffled
router.put('/', requireAuth, async (req, res) => {
  const { deck, index, complete, demo, fingerprint } = req.body;
  if (!Array.isArray(deck)) return res.status(400).json({ error: 'Invalid deck' });
  try {
    await pool.query(
      `INSERT INTO user_sessions (user_id, deck, current_index, is_complete, is_demo, file_fingerprint, unavailable_ids)
       VALUES (?, ?, ?, ?, ?, ?, '[]')
       ON DUPLICATE KEY UPDATE
         deck            = VALUES(deck),
         current_index   = VALUES(current_index),
         is_complete     = VALUES(is_complete),
         is_demo         = VALUES(is_demo),
         file_fingerprint= VALUES(file_fingerprint),
         unavailable_ids = '[]',
         updated_at      = CURRENT_TIMESTAMP`,
      [req.user.id, JSON.stringify(deck), index || 0, complete ? 1 : 0, demo ? 1 : 0, fingerprint || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Progress-only update — called on every video advance (~100 bytes)
router.patch('/', requireAuth, async (req, res) => {
  const { index, complete, unavailableIds } = req.body;
  try {
    await pool.query(
      `UPDATE user_sessions
       SET current_index = ?, is_complete = ?, unavailable_ids = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [index || 0, complete ? 1 : 0, JSON.stringify(unavailableIds || []), req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
