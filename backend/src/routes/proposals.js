const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { Proposal, ProposalTemplate } = require('../models/Proposal');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/logos')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

router.use(protect);

// ====== TEMPLATES ======

// GET all templates
router.get('/templates', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const templates = await ProposalTemplate.find().populate('createdBy', 'name email').sort('-createdAt');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create template
router.post('/templates', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const template = await ProposalTemplate.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update template
router.put('/templates/:id', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const template = await ProposalTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE template
router.delete('/templates/:id', authorize('superadmin'), async (req, res) => {
  try {
    const template = await ProposalTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====== PROPOSALS ======

// GET all proposals
router.get('/', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { proposalNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } },
        { 'client.company': { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [proposals, total] = await Promise.all([
      Proposal.find(query).populate('createdBy', 'name email').populate('template').sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Proposal.countDocuments(query)
    ]);
    res.json({ proposals, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single proposal
router.get('/:id', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate('createdBy', 'name email').populate('template');
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create proposal
router.post('/', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const proposalData = {
      ...req.body,
      currency: 'USD', // Always use USD for proposals
      createdBy: req.user._id,
      company: req.body.company || {
        name: process.env.COMPANY_NAME || '',
        email: process.env.COMPANY_EMAIL || '',
        address: process.env.COMPANY_ADDRESS || '',
        phone: process.env.COMPANY_PHONE || '',
        website: process.env.COMPANY_WEBSITE || '',
        logo: process.env.COMPANY_LOGO_URL || ''
      }
    };
    const proposal = await Proposal.create(proposalData);
    const populated = await Proposal.findById(proposal._id).populate('createdBy', 'name email').populate('template');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update proposal
router.put('/:id', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });

    Object.assign(proposal, { ...req.body, currency: 'USD' }); // Always use USD
    await proposal.save();
    const populated = await Proposal.findById(proposal._id).populate('createdBy', 'name email').populate('template');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE proposal
router.delete('/:id', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.id);
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    res.json({ message: 'Proposal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST upload logo for proposal company
router.post('/upload-logo', authorize('superadmin', 'manager'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    res.json({ logoUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST send proposal to client via email
router.post('/:id/send', authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate('template');
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });

    const clientEmail = req.body.email || proposal.client.email;
    if (!clientEmail) return res.status(400).json({ message: 'Client email is required' });

    // Get invoice SMTP config or fall back to system SMTP or env
    let smtpConfig = await SmtpConfig.findOne({ type: 'invoice', isActive: true });
    if (!smtpConfig) smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });

    const transportConfig = smtpConfig ? {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass }
    } : {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      }
    };

    const transporter = nodemailer.createTransport(transportConfig);

    const fromEmail = smtpConfig?.fromEmail || process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromName = smtpConfig?.fromName || proposal.company.name || process.env.COMPANY_NAME || 'FinOps';

    // Build email HTML
    const bgColor = proposal.backgroundColor || '#ffffff';
    const textColor = proposal.textColor || '#1a1a1a';
    const accentColor = proposal.accentColor || '#6366f1';
    const headerBg = proposal.headerBgColor || accentColor;
    const headerText = proposal.headerTextColor || '#ffffff';

    let sectionsHtml = '';
    if (proposal.sections && proposal.sections.length > 0) {
      sectionsHtml = proposal.sections.sort((a, b) => a.order - b.order).map(s =>
        `<div style="margin-bottom:20px;"><h3 style="color:${accentColor};margin-bottom:8px;">${s.title}</h3><p style="color:${textColor};line-height:1.6;">${s.content}</p></div>`
      ).join('');
    }

    let itemsHtml = '';
    if (proposal.items && proposal.items.length > 0) {
      const rows = proposal.items.map(item =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${proposal.currency} ${item.unitPrice.toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${proposal.currency} ${item.amount.toFixed(2)}</td></tr>`
      ).join('');
      itemsHtml = `
        <h3 style="color:${accentColor};margin-top:30px;">Pricing</h3>
        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
          <thead><tr style="background:${accentColor};color:#fff;"><th style="padding:10px;text-align:left;">Description</th><th style="padding:10px;text-align:center;">Qty</th><th style="padding:10px;text-align:right;">Unit Price</th><th style="padding:10px;text-align:right;">Amount</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3" style="padding:8px;text-align:right;font-weight:bold;">Subtotal</td><td style="padding:8px;text-align:right;">${proposal.currency} ${(proposal.subtotal || 0).toFixed(2)}</td></tr>
            ${proposal.taxRate > 0 ? `<tr><td colspan="3" style="padding:8px;text-align:right;">Tax (${proposal.taxRate}%)</td><td style="padding:8px;text-align:right;">${proposal.currency} ${(proposal.taxAmount || 0).toFixed(2)}</td></tr>` : ''}
            ${proposal.discount > 0 ? `<tr><td colspan="3" style="padding:8px;text-align:right;">Discount</td><td style="padding:8px;text-align:right;">-${proposal.currency} ${(proposal.discount || 0).toFixed(2)}</td></tr>` : ''}
            <tr style="background:#f9fafb;"><td colspan="3" style="padding:10px;text-align:right;font-weight:bold;font-size:16px;">Total</td><td style="padding:10px;text-align:right;font-weight:bold;font-size:16px;color:${accentColor};">${proposal.currency} ${(proposal.total || 0).toFixed(2)}</td></tr>
          </tfoot>
        </table>`;
    }

    const watermarkStyle = proposal.showWatermark && proposal.watermarkText
      ? `position:relative;` : '';
    const watermarkOverlay = proposal.showWatermark && proposal.watermarkText
      ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;font-weight:bold;color:${accentColor};opacity:${proposal.watermarkOpacity || 0.06};pointer-events:none;white-space:nowrap;z-index:0;">${proposal.watermarkText}</div>` : '';

    const html = `
      <div style="max-width:800px;margin:0 auto;font-family:Arial,sans-serif;background:${bgColor};color:${textColor};${watermarkStyle}">
        ${watermarkOverlay}
        <div style="background:${headerBg};color:${headerText};padding:40px 30px;border-radius:8px 8px 0 0;position:relative;z-index:1;">
          ${proposal.company.logo ? `<img src="cid:companyLogo" style="max-height:60px;margin-bottom:15px;" />` : ''}
          <h1 style="margin:0;font-size:28px;">${proposal.title}</h1>
          <p style="margin:8px 0 0;opacity:0.9;">${proposal.proposalNumber} | ${new Date(proposal.issueDate).toLocaleDateString()}</p>
        </div>
        <div style="padding:30px;position:relative;z-index:1;">
          <div style="display:flex;justify-content:space-between;margin-bottom:30px;">
            <div>
              <h4 style="color:${accentColor};margin-bottom:5px;">From</h4>
              <p style="margin:2px 0;">${proposal.company.name || ''}</p>
              <p style="margin:2px 0;">${proposal.company.email || ''}</p>
              <p style="margin:2px 0;">${proposal.company.phone || ''}</p>
            </div>
            <div style="text-align:right;">
              <h4 style="color:${accentColor};margin-bottom:5px;">To</h4>
              <p style="margin:2px 0;">${proposal.client.name}</p>
              <p style="margin:2px 0;">${proposal.client.company || ''}</p>
              <p style="margin:2px 0;">${proposal.client.email}</p>
            </div>
          </div>
          ${proposal.description ? `<p style="font-size:16px;line-height:1.6;margin-bottom:20px;">${proposal.description}</p>` : ''}
          ${sectionsHtml}
          ${itemsHtml}
          ${proposal.validUntil ? `<p style="margin-top:20px;color:#666;">Valid until: ${new Date(proposal.validUntil).toLocaleDateString()}</p>` : ''}
          ${proposal.terms ? `<div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;"><h4 style="color:${accentColor};">Terms & Conditions</h4><p style="color:#666;line-height:1.6;">${proposal.terms}</p></div>` : ''}
          ${proposal.notes ? `<div style="margin-top:15px;"><h4 style="color:${accentColor};">Notes</h4><p style="color:#666;line-height:1.6;">${proposal.notes}</p></div>` : ''}
        </div>
        <div style="background:${headerBg};color:${headerText};padding:15px 30px;text-align:center;border-radius:0 0 8px 8px;font-size:13px;">
          ${proposal.company.name || ''} ${proposal.company.website ? `| ${proposal.company.website}` : ''}
        </div>
      </div>`;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: clientEmail,
      subject: `Proposal: ${proposal.title} (${proposal.proposalNumber})`,
      html
    };

    // Attach logo if exists
    if (proposal.company.logo) {
      const logoPath = path.join(__dirname, '../../', proposal.company.logo);
      const fs = require('fs');
      if (fs.existsSync(logoPath)) {
        mailOptions.attachments = [{ filename: 'logo.png', path: logoPath, cid: 'companyLogo' }];
      }
    }

    await transporter.sendMail(mailOptions);

    proposal.status = 'sent';
    proposal.sentAt = new Date();
    proposal.sentTo = clientEmail;
    await proposal.save();

    res.json({ message: 'Proposal sent successfully', proposal });
  } catch (err) {
    res.status(500).json({ message: `Failed to send proposal: ${err.message}` });
  }
});

module.exports = router;
