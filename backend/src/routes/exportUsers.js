const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

const router = express.Router();

// Export all users as JSON (for migration)
// GET /api/export-users
router.get('/', protect, authorize('superadmin', 'admin', 'hr'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.setHeader('Content-Disposition', 'attachment; filename="users-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
