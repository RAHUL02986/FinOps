const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Account = require('../models/Account');


router.use(protect);

// GET all accounts (open to all roles)
router.get('/', authorize('superadmin', 'hr', 'manager', 'dataentry'), async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const accounts = await Account.find(query).populate('createdBy', 'name email').sort('-createdAt');
    res.json({ data: accounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// All other account routes restricted to superadmin, hr
router.use(authorize('superadmin', 'hr'));

// POST create account
router.post('/', async (req, res) => {
  try {
    // Only allow includeInAvailableFunds if present in body, else use model default
    const accountData = {
      ...req.body,
      currentBalance: req.body.openingBalance || 0,
      createdBy: req.user._id
    };
    if (typeof req.body.includeInAvailableFunds !== 'undefined') {
      accountData.includeInAvailableFunds = req.body.includeInAvailableFunds;
    }
    const account = await Account.create(accountData);
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update account
router.put('/:id', async (req, res) => {
  try {
    // Only allow includeInAvailableFunds if present in body
    const updateData = { ...req.body };
    if (typeof req.body.includeInAvailableFunds === 'undefined') {
      delete updateData.includeInAvailableFunds;
    }
    const account = await Account.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE account
router.delete('/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
