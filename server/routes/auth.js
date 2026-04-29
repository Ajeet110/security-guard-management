const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate access token (15 minutes)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate refresh token (30 days)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, user_id: user.user_id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

// Login
router.post('/login', (req, res) => {
  const { user_id, password } = req.body;

  console.log('🔐 Login attempt for user:', user_id);

  if (!user_id || !password) {
    console.log('❌ Missing credentials');
    return res.status(400).json({ error: 'User ID and password required' });
  }

  try {
    console.log('🔄 Querying database for user:', user_id);
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user_id);

    if (!user) {
      console.log('❌ User not found:', user_id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.name, 'ID:', user.id);
    console.log('🔄 Comparing passwords...');
    console.log('Stored hash:', user.password);
    console.log('Input password:', password);

    const passwordMatch = bcrypt.compareSync(password, user.password);
    console.log('Password match result:', passwordMatch);

    if (!passwordMatch) {
      console.log('❌ Password mismatch for user:', user_id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Password verified for user:', user_id);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log('🔄 Storing refresh token...');
    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
      user.id,
      refreshToken,
      expiresAt.toISOString()
    );
    console.log('✅ Refresh token stored');

    // Set cookies
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('🔄 Setting cookies (production:', isProduction, ')');
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    console.log('✅ Login successful for user:', user_id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        profile_photo: user.profile_photo
      },
      accessToken
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Login failed', details: error.message, stack: error.stack });
  }
});

// Refresh token
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const tokenRecord = db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ?').get(
      refreshToken,
      decoded.id
    );

    if (!tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    const newAccessToken = generateAccessToken(user);

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// Reset password
router.post('/reset-password', authenticateToken, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!bcrypt.compareSync(current_password, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
      hashedPassword, 
      req.user.id
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, user_id, name, role, mobile, email, profile_photo, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
