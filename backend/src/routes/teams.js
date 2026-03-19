const express = require('express');
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const ELEVATED = ['superadmin', 'hr', 'manager'];
const isElevated = (role) => ELEVATED.includes(role);

// ── GET /api/teams ── list all teams ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('members', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ name: 1 });
    res.json({ success: true, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/teams ── elevated only ──────────────────────────────────────────
router.post('/', async (req, res) => {
  if (!isElevated(req.user.role))
    return res.status(403).json({ success: false, message: 'Not authorized' });
  try {
    const { name, color, members } = req.body;
    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Team name is required' });

    const team = await Team.create({
      name: name.trim(),
      color: color || '#6366f1',
      members: members || [],
      createdBy: req.user.id,
    });
    await team.populate([
      { path: 'members', select: 'name email role' },
      { path: 'createdBy', select: 'name email' },
    ]);
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'A team with this name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/teams/:id ── elevated only ───────────────────────────────────────
router.put('/:id', async (req, res) => {
  if (!isElevated(req.user.role))
    return res.status(403).json({ success: false, message: 'Not authorized' });
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const { name, color, members } = req.body;
    if (name !== undefined) team.name = name.trim();
    if (color !== undefined) team.color = color;
    if (members !== undefined) team.members = members;

    await team.save();
    await team.populate([
      { path: 'members', select: 'name email role' },
      { path: 'createdBy', select: 'name email' },
    ]);
    res.json({ success: true, data: team });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'A team with this name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/teams/:id ── elevated only ────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (!isElevated(req.user.role))
    return res.status(403).json({ success: false, message: 'Not authorized' });
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    await team.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;



