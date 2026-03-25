const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

// ── Logo upload setup ─────────────────────────────────────────────────────────
const LOGOS_DIR = path.join(__dirname, '..', '..', 'uploads', 'logos');
if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, SVG) are allowed'), false);
    }
  },
});

const ELEVATED = ['superadmin', 'manager'];
const isElevated = (role) => ELEVATED.includes(role);

const router = express.Router();
router.use(protect);

// ── Guard: elevated only ──────────────────────────────────────────────────────
const requireElevated = (req, res, next) => {
  if (!isElevated(req.user.role))
    return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};

// ── Validation ────────────────────────────────────────────────────────────────
const invoiceValidation = [
  body('client.name').notEmpty().trim().withMessage('Client name is required'),
  body('client.email').isEmail().normalizeEmail().withMessage('Valid client email required'),
  body('items').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('items.*.description').notEmpty().trim().withMessage('Item description required'),
  body('items.*.quantity').isFloat({ min: 0 }).withMessage('Quantity must be >= 0'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be >= 0'),
];

// ── Build invoice HTML email ──────────────────────────────────────────────────
function buildInvoiceHtml(invoice) {
  const fmt = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency || 'USD' }).format(n ?? 0);

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

  const rows = (invoice.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#374151;">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#374151;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#374151;">${fmt(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#111827;">${fmt(item.amount)}</td>
      </tr>`
    )
    .join('');

  let totalsHtml = `
    <tr>
      <td colspan="3" style="padding:8px 12px;text-align:right;color:#6b7280;font-size:13px;">Subtotal</td>
      <td style="padding:8px 12px;text-align:right;color:#374151;font-weight:600;">${fmt(invoice.subtotal)}</td>
    </tr>`;

  if (invoice.taxRate > 0) {
    totalsHtml += `
    <tr>
      <td colspan="3" style="padding:8px 12px;text-align:right;color:#6b7280;font-size:13px;">Tax (${invoice.taxRate}%)</td>
      <td style="padding:8px 12px;text-align:right;color:#374151;font-weight:600;">${fmt(invoice.taxAmount)}</td>
    </tr>`;
  }

  if (invoice.discount > 0) {
    totalsHtml += `
    <tr>
      <td colspan="3" style="padding:8px 12px;text-align:right;color:#6b7280;font-size:13px;">Discount</td>
      <td style="padding:8px 12px;text-align:right;color:#ef4444;font-weight:600;">-${fmt(invoice.discount)}</td>
    </tr>`;
  }

  totalsHtml += `
    <tr style="background:#f9fafb;">
      <td colspan="3" style="padding:12px 12px;text-align:right;color:#111827;font-weight:700;font-size:15px;">Total</td>
      <td style="padding:12px 12px;text-align:right;color:#4f46e5;font-weight:800;font-size:18px;">${fmt(invoice.total)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice ${invoice.invoiceNumber}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
        <td style="vertical-align:top;">
          ${invoice.company?.logo ? `<img src="cid:companyLogo" alt="${invoice.company?.name || 'Logo'}" style="max-height:54px;max-width:180px;margin-bottom:10px;border-radius:6px;" />` : ''}
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">INVOICE</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">${invoice.invoiceNumber}</p>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <p style="margin:0;color:#fff;font-weight:700;font-size:16px;">${invoice.company?.name || 'Your Company'}</p>
          ${invoice.company?.email ? `<p style="margin:2px 0;color:rgba(255,255,255,0.8);font-size:13px;">${invoice.company.email}</p>` : ''}
          ${invoice.company?.phone ? `<p style="margin:2px 0;color:rgba(255,255,255,0.8);font-size:13px;">${invoice.company.phone}</p>` : ''}
        </td>
      </tr></table>
    </div>

    <!-- Info row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-bottom:1px solid #e5e7eb;">
      <tr>
        <td style="width:50%;padding:24px 40px;vertical-align:top;border-right:1px solid #e5e7eb;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Billed To</p>
          <p style="margin:0;font-weight:700;color:#111827;font-size:15px;">${invoice.client.name}</p>
          ${invoice.client.company ? `<p style="margin:2px 0;color:#6b7280;font-size:13px;">${invoice.client.company}</p>` : ''}
          <p style="margin:2px 0;color:#6b7280;font-size:13px;">${invoice.client.email}</p>
          ${invoice.client.phone ? `<p style="margin:2px 0;color:#6b7280;font-size:13px;">${invoice.client.phone}</p>` : ''}
          ${invoice.client.address ? `<p style="margin:4px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">${invoice.client.address.replace(/\n/g, '<br>')}</p>` : ''}
        </td>
        <td style="width:50%;padding:24px 40px;vertical-align:top;">
          <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding-bottom:12px;padding-right:24px;">
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Issue Date</p>
                <p style="margin:4px 0 0;color:#111827;font-weight:600;font-size:14px;">${fmtDate(invoice.issueDate)}</p>
              </td>
              <td style="padding-bottom:12px;">
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Due Date</p>
                <p style="margin:4px 0 0;color:#111827;font-weight:600;font-size:14px;">${fmtDate(invoice.dueDate)}</p>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Status</p>
                <span style="display:inline-block;margin-top:4px;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;background:#dbeafe;color:#1d4ed8;text-transform:capitalize;">${invoice.status}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Items table -->
    <div style="padding:0 0 0 0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Description</th>
            <th style="padding:12px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="padding:12px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Unit Price</th>
            <th style="padding:12px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>${totalsHtml}</tfoot>
      </table>
    </div>

    <!-- Notes / Terms -->
    ${
      invoice.notes
        ? `<div style="padding:20px 40px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Notes</p>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">${invoice.notes}</p>
      </div>`
        : ''
    }
    ${
      invoice.terms
        ? `<div style="padding:20px 40px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Terms &amp; Conditions</p>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">${invoice.terms}</p>
      </div>`
        : ''
    }

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Thank you for your business!</p>
      ${invoice.company?.website ? `<p style="margin:4px 0 0;"><a href="${invoice.company.website}" style="color:#4f46e5;font-size:12px;">${invoice.company.website}</a></p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

// ── Create transporter (uses DB SMTP config with fallback to env) ─────────────
const SmtpConfig = require('../models/SmtpConfig');

async function createTransporter() {
  // Try invoice SMTP config first, then system, then env
  let smtpConfig = await SmtpConfig.findOne({ type: 'invoice', isActive: true });
  if (!smtpConfig) smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });

  if (smtpConfig) {
    return {
      transporter: nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure || false,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      }),
      fromEmail: smtpConfig.fromEmail || smtpConfig.user,
      fromName: smtpConfig.fromName || ''
    };
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    fromEmail: user,
    fromName: ''
  };
}

// ── GET /api/invoices ─────────────────────────────────────────────────────────
router.get('/', requireElevated, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } },
        { 'client.email': { $regex: search, $options: 'i' } },
        { 'client.company': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/invoices/:id ─────────────────────────────────────────────────────
router.get('/:id', requireElevated, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'name email');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/invoices ────────────────────────────────────────────────────────
router.post('/', requireElevated, invoiceValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { client, company, items = [], taxRate = 0, discount = 0, currency, issueDate, dueDate, notes, terms, status } = req.body;

    // Compute amounts
    const computedItems = items.map((item) => ({
      ...item,
      amount: Math.round(parseFloat(item.quantity) * parseFloat(item.unitPrice) * 100) / 100,
    }));

    const invoice = await Invoice.create({
      createdBy: req.user.id,
      client,
      company: company || {
        name: process.env.COMPANY_NAME || 'Your Company',
        email: process.env.COMPANY_EMAIL || '',
        address: process.env.COMPANY_ADDRESS || '',
        phone: process.env.COMPANY_PHONE || '',
        website: process.env.COMPANY_WEBSITE || '',
        logo: process.env.COMPANY_LOGO_URL || '',
      },
      items: computedItems,
      taxRate: parseFloat(taxRate) || 0,
      discount: parseFloat(discount) || 0,
      currency: 'USD',
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || '',
      terms: terms || '',
      status: status || 'draft',
    });

    await invoice.populate('createdBy', 'name email');
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/invoices/:id ─────────────────────────────────────────────────────
router.put('/:id', requireElevated, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const { client, company, items, taxRate, discount, currency, issueDate, dueDate, notes, terms, status } = req.body;

    if (client) invoice.client = { ...invoice.client.toObject?.() ?? invoice.client, ...client };
    if (company) invoice.company = { ...invoice.company.toObject?.() ?? invoice.company, ...company };
    if (items) {
      invoice.items = items.map((item) => ({
        ...item,
        amount: Math.round(parseFloat(item.quantity) * parseFloat(item.unitPrice) * 100) / 100,
      }));
    }
    if (taxRate !== undefined) invoice.taxRate = parseFloat(taxRate) || 0;
    if (discount !== undefined) invoice.discount = parseFloat(discount) || 0;
    if (currency) invoice.currency = currency;
    if (issueDate) invoice.issueDate = new Date(issueDate);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    if (status) invoice.status = status;

    await invoice.save();
    await invoice.populate('createdBy', 'name email');
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/invoices/:id ──────────────────────────────────────────────────
router.delete('/:id', requireElevated, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/invoices/upload-logo ────────────────────────────────────────────
router.post('/upload-logo', requireElevated, uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const logoPath = `logos/${req.file.filename}`;
    res.json({ success: true, data: { logo: logoPath } });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/invoices/:id/send ───────────────────────────────────────────────
router.post('/:id/send', requireElevated, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'name email');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const recipientEmail = req.body.email || invoice.client.email;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail))
      return res.status(400).json({ success: false, message: 'Invalid recipient email' });

    const html = buildInvoiceHtml(invoice);
    const smtpResult = await createTransporter();
    const transporter = smtpResult?.transporter;

    if (transporter) {
      // Verify SMTP connection
      await transporter.verify();

      const fromName = invoice.company?.name || smtpResult.fromName || process.env.COMPANY_NAME || 'Billing';
      const fromEmail = smtpResult.fromEmail || process.env.SMTP_USER || process.env.EMAIL_USER;

      // Build attachments — embed logo as inline CID if present
      const attachments = [];
      if (invoice.company?.logo) {
        const logoFilePath = path.join(__dirname, '..', '..', 'uploads', invoice.company.logo);
        if (fs.existsSync(logoFilePath)) {
          const ext = path.extname(logoFilePath).toLowerCase().replace('.', '');
          const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' };
          attachments.push({
            filename: `logo.${ext}`,
            path: logoFilePath,
            cid: 'companyLogo',
            contentType: mimeMap[ext] || 'image/png',
          });
        }
      }

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipientEmail,
        subject: `Invoice ${invoice.invoiceNumber} from ${fromName}`,
        html,
        attachments,
      });
    }
    // If no SMTP configured, still mark as sent (client receives via other means)

    invoice.status = 'sent';
    invoice.sentAt = new Date();
    invoice.sentTo = recipientEmail;
    await invoice.save();

    res.json({
      success: true,
      data: invoice,
      emailSent: !!transporter,
      message: transporter
        ? `Invoice sent to ${recipientEmail}`
        : `Invoice marked as sent (configure SMTP to enable email delivery)`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
