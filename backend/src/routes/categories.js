const express = require('express');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const router = express.Router();

// All category routes require authentication
router.use(protect);

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create a new category
router.post('/', async (req, res) => {
  try {
    const { name, type, active } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'Name and type are required.' });
    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Category already exists.' });
    const category = await Category.create({ name, type, active, createdBy: req.user._id });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update a category
router.put('/:id', async (req, res) => {
  try {
    const { name, type, active } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, type, active },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
