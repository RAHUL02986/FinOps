const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Goal = require('../models/Goal');

router.use(protect);
router.use(authorize('superadmin', 'admin', 'manager'));

// GET all goals
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    const goals = await Goal.find(query).populate('createdBy', 'name email').sort('-createdAt');
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create goal
router.post('/', async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update goal
router.put('/:id', async (req, res) => {
  try {
    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE goal
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
