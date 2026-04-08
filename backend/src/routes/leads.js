const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect } = require('../middleware/auth');

// Get all leads (with optional filtering)
router.get('/', protect, async (req, res) => {
  try {
    const { status, source, search, priority, tag } = req.query;
    let query = {};

    // Filter by status if provided
    if (status) {
      query.leadStatus = status;
    }

    // Filter by lead source if provided
    if (source) {
      query.leadSource = source;
    }

    // Filter by priority if provided
    if (priority) {
      query.priority = priority;
    }

    // Filter by tag if provided
    if (tag) {
      query.tags = tag;
    }

    // Enhanced search - search in multiple fields
    if (search) {
      query.$or = [
        { projectDescription: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { clientEmail: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query)
      .populate('createdBy', 'username email name')
      .populate('team', 'name')
      .populate('employee', 'name email')
      .populate('notes.addedBy', 'username email name')
      .populate('comments.commentedBy', 'username email name')
      .populate('activityLog.performedBy', 'username email name')
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
      .populate('createdBy', 'username email name')
      .populate('team', 'name')
      .populate('employee', 'name email')
      .populate('notes.addedBy', 'username email name')
      .populate('comments.commentedBy', 'username email name')
      .populate('activityLog.performedBy', 'username email name')
      .populate('statusHistory.changedBy', 'username email name');

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
    const { 
      leadSource, projectDescription, technologyStack, leadStatus, notes, team, employee,
      clientName, clientEmail, clientPhone, company, priority, leadTemperature, expectedValue,
      currency, followUpDate, tags, lossReason
    } = req.body;

    // Validation
    if (!leadSource || !projectDescription || !technologyStack) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: leadSource, projectDescription, and technologyStack' 
      });
    }

    if (leadStatus === 'Closed/Lost' && !lossReason) {
      return res.status(400).json({ 
        message: 'Loss reason is required when lead status is Closed/Lost' 
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

    // Prepare notes array if note content provided
    let notesArray = [];
    if (notes && notes.trim()) {
      notesArray = [{
        content: notes,
        addedBy: req.user.id,
        addedAt: new Date()
      }];
    }

    const newLead = new Lead({
      leadSource,
      projectDescription,
      technologyStack,
      leadStatus: leadStatus || 'New',
      notes: notesArray,
      createdBy: req.user.id,
      team: team || undefined,
      employee: employee || undefined,
      attachments,
      clientName: clientName || undefined,
      clientEmail: clientEmail || undefined,
      clientPhone: clientPhone || undefined,
      company: company || undefined,
      priority: priority || 'Medium',
      leadTemperature: leadTemperature || 'Warm',
      expectedValue: expectedValue || 0,
      currency: currency || 'USD',
      followUpDate: followUpDate || undefined,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      lossReason: lossReason || ''
    });

    const savedLead = await newLead.save();
    const populatedLead = await Lead.findById(savedLead._id)
      .populate('createdBy', 'username email')
      .populate('team', 'name')
      .populate('employee', 'name email');

    // Notify all admins about new lead
    try {
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: 'lead_notification',
          title: 'New Lead Added',
          message: `${req.user.name || 'A user'} added a new lead: ${populatedLead.projectDescription}`,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to send lead notification:', notifyErr);
    }

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
    const { 
      leadSource, projectDescription, technologyStack, leadStatus, notes, team, employee, 
      milestones, productValue, platformFees, finalValue,
      clientName, clientEmail, clientPhone, company, priority, leadTemperature, expectedValue,
      currency, followUpDate, tags, lossReason
    } = req.body;

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (leadStatus === 'Closed/Lost' && !lossReason) {
      return res.status(400).json({ 
        message: 'Loss reason is required when lead status is Closed/Lost' 
      });
    }

    // Update basic fields
    if (leadSource !== undefined) lead.leadSource = leadSource;
    if (projectDescription !== undefined) lead.projectDescription = projectDescription;
    if (technologyStack !== undefined) lead.technologyStack = technologyStack;
    if (leadStatus !== undefined) lead.leadStatus = leadStatus;
    if (team !== undefined) lead.team = team;
    if (employee !== undefined) lead.employee = employee;

    // Update contact info
    if (clientName !== undefined) lead.clientName = clientName;
    if (clientEmail !== undefined) lead.clientEmail = clientEmail;
    if (clientPhone !== undefined) lead.clientPhone = clientPhone;
    if (company !== undefined) lead.company = company;
    
    // Update lead details
    if (priority !== undefined) lead.priority = priority;
    if (leadTemperature !== undefined) lead.leadTemperature = leadTemperature;
    if (expectedValue !== undefined) lead.expectedValue = expectedValue;
    if (currency !== undefined) lead.currency = currency;
    if (followUpDate !== undefined) lead.followUpDate = followUpDate;
    if (tags !== undefined) lead.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (lossReason !== undefined) lead.lossReason = lossReason;

    // Update milestones and financials for converted leads
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

    // Track if lead was just converted
    const wasConverted = lead.isModified && lead.isModified('leadStatus') && lead.leadStatus === 'Converted Lead';

    const updatedLead = await lead.save();
    const populatedLead = await Lead.findById(updatedLead._id)
      .populate('createdBy', 'username email')
      .populate('team', 'name')
      .populate('employee', 'name email');

    // Notify all admins if lead was converted
    if (wasConverted) {
      try {
        const Notification = require('../models/Notification');
        const User = require('../models/User');
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            type: 'lead_notification',
            title: 'Lead Converted',
            message: `${req.user.name || 'A user'} converted a lead: ${populatedLead.projectDescription}`,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to send lead conversion notification:', notifyErr);
      }
    }

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

// Add a note to a lead
router.post('/:id/notes', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.notes.push({
      content: content.trim(),
      addedBy: req.user.id,
      addedAt: new Date()
    });

    await lead.save();
    
    const populatedLead = await Lead.findById(lead._id)
      .populate('createdBy', 'username email')
      .populate('team', 'name')
      .populate('employee', 'name email')
      .populate('notes.addedBy', 'username email name')
      .populate('comments.commentedBy', 'username email name')
      .populate('activityLog.performedBy', 'username email name');

    res.json(populatedLead);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Server error while adding note' });
  }
});

// Add a comment to a lead
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.comments.push({
      content: content.trim(),
      commentedBy: req.user.id,
      commentedAt: new Date()
    });

    await lead.save();
    
    const populatedLead = await Lead.findById(lead._id)
      .populate('createdBy', 'username email')
      .populate('team', 'name')
      .populate('employee', 'name email')
      .populate('notes.addedBy', 'username email name')
      .populate('comments.commentedBy', 'username email name')
      .populate('activityLog.performedBy', 'username email name');

    res.json(populatedLead);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error while adding comment' });
  }
});

// Add an activity to a lead
router.post('/:id/activities', protect, async (req, res) => {
  try {
    const { type, description } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: 'Activity type and description are required' });
    }

    const validTypes = ['call', 'email', 'meeting', 'note', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid activity type' });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.activityLog.push({
      type,
      description: description.trim(),
      performedBy: req.user.id,
      performedAt: new Date()
    });

    await lead.save();
    
    const populatedLead = await Lead.findById(lead._id)
      .populate('createdBy', 'username email')
      .populate('team', 'name')
      .populate('employee', 'name email')
      .populate('notes.addedBy', 'username email name')
      .populate('comments.commentedBy', 'username email name')
      .populate('activityLog.performedBy', 'username email name');

    res.json(populatedLead);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ message: 'Server error while adding activity' });
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
