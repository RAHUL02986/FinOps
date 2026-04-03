const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect } = require('../middleware/auth');

// Get all leads (with optional filtering)
router.get('/', protect, async (req, res) => {
  try {
    const { status, source, search } = req.query;
    let query = {};

    // Filter by status if provided
    if (status) {
      query.leadStatus = status;
    }

    // Filter by lead source if provided
    if (source) {
      query.leadSource = source;
    }

    // Search in project description if provided
    if (search) {
      query.projectDescription = { $regex: search, $options: 'i' };
    }

    const leads = await Lead.find(query)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Server error while fetching leads' });
  }
});

// Get a single lead by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: 'Server error while fetching lead' });
  }
});

// Create a new lead
// For file uploads, use multer
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer({
  dest: path.join(__dirname, '../../uploads/leads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

router.post('/', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { leadSource, projectDescription, technologyStack, leadStatus, notes, team, employee } = req.body;

    // Validation
    if (!leadSource || !projectDescription || !technologyStack) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: leadSource, projectDescription, and technologyStack' 
      });
    }

    // Handle file uploads
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => {
        let type = 'other';
        if (file.mimetype.startsWith('image/')) type = 'image';
        else if (file.mimetype === 'application/pdf') type = 'pdf';
        else if (file.mimetype.startsWith('video/')) type = 'video';
        return {
          url: `/uploads/leads/${file.filename}`,
          type,
          name: file.originalname,
        };
      });
    }

    const newLead = new Lead({
      leadSource,
      projectDescription,
      technologyStack,
      leadStatus: leadStatus || 'Lead',
      notes,
      createdBy: req.user.id,
      team: team || undefined,
      employee: employee || undefined,
      attachments,
    });

    const savedLead = await newLead.save();
    const populatedLead = await Lead.findById(savedLead._id)
      .populate('createdBy', 'username email')
      .populate('team', 'name')
      .populate('employee', 'name email');

    res.status(201).json(populatedLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while creating lead' });
  }
});

// Update a lead
router.put('/:id', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { leadSource, projectDescription, technologyStack, leadStatus, notes, team, employee, milestones, productValue, platformFees, finalValue } = req.body;

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Update fields
    if (leadSource !== undefined) lead.leadSource = leadSource;
    if (projectDescription !== undefined) lead.projectDescription = projectDescription;
    if (technologyStack !== undefined) lead.technologyStack = technologyStack;
    if (leadStatus !== undefined) lead.leadStatus = leadStatus;
    if (notes !== undefined) lead.notes = notes;
    if (team !== undefined) lead.team = team;
    if (employee !== undefined) lead.employee = employee;

    // New: Update milestones and financials for converted leads
    if (milestones !== undefined) lead.milestones = milestones;
    if (productValue !== undefined) lead.productValue = productValue;
    if (platformFees !== undefined) lead.platformFees = platformFees;
    // Always recalculate finalValue if productValue or platformFees are provided
    if (productValue !== undefined || platformFees !== undefined) {
      lead.finalValue = (lead.productValue || 0) - (lead.platformFees || 0);
    }
    if (finalValue !== undefined) lead.finalValue = finalValue; // Allow manual override if needed

    // Handle new file uploads (append to attachments)
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => {
        let type = 'other';
        if (file.mimetype.startsWith('image/')) type = 'image';
        else if (file.mimetype === 'application/pdf') type = 'pdf';
        else if (file.mimetype.startsWith('video/')) type = 'video';
        return {
          url: `/uploads/leads/${file.filename}`,
          type,
          name: file.originalname,
        };
      });
      lead.attachments = [...(lead.attachments || []), ...newAttachments];
    }

    const updatedLead = await lead.save();
    const populatedLead = await Lead.findById(updatedLead._id)
      .populate('createdBy', 'username email')
      .populate('team', 'name')
      .populate('employee', 'name email');

    res.json(populatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating lead' });
  }
});

// Delete a lead
router.delete('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    await Lead.findByIdAndDelete(req.params.id);

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ message: 'Server error while deleting lead' });
  }
});

// Get lead statistics
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const activeLeads = await Lead.countDocuments({ leadStatus: 'Lead' });
    const pendingLeads = await Lead.countDocuments({ leadStatus: 'Pending Lead' });
    const convertedLeads = await Lead.countDocuments({ leadStatus: 'Converted Lead' });

    // Get leads by source
    const leadsBySource = await Lead.aggregate([
      {
        $group: {
          _id: '$leadSource',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get leads by tech stack
    const leadsByTech = await Lead.aggregate([
      {
        $group: {
          _id: '$technologyStack',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.json({
      totalLeads,
      activeLeads,
      pendingLeads,
      convertedLeads,
      leadsBySource,
      leadsByTech
    });
  } catch (error) {
    console.error('Error fetching lead statistics:', error);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
});

module.exports = router;
