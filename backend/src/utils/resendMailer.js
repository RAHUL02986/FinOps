require('dotenv').config();
const fs = require('fs');

const RESEND_API_URL = 'https://api.resend.com/emails';

function normalizeAttachments(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  return attachments.flatMap((attachment) => {
    if (!attachment) return [];

    if (attachment.path) {
      try {
        const fileBuffer = fs.readFileSync(attachment.path);
        return [{
          filename: attachment.filename || 'attachment',
          content: fileBuffer.toString('base64'),
          contentType: attachment.contentType || 'application/octet-stream',
        }];
      } catch (error) {
        console.warn(`[Resend] Failed to read attachment path ${attachment.path}:`, error.message);
        return [];
      }
    }

    if (attachment.content) {
      return [{
        filename: attachment.filename || 'attachment',
        content: Buffer.isBuffer(attachment.content) ? attachment.content.toString('base64') : attachment.content,
        contentType: attachment.contentType || 'application/octet-stream',
      }];
    }

    return [];
  });
}

async function sendEmail({ to, cc, bcc, subject, text, html, from, attachments, replyTo }) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Resend API key is not configured');
  }

  const fromAddress = from || process.env.RESEND_FROM || process.env.EMAIL_FROM || 'FinOps <onboarding@resend.dev>';
  const recipients = Array.isArray(to) ? to : [to];
  const ccList = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
  const bccList = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;

  const payload = {
    from: fromAddress,
    to: recipients,
    subject,
    text,
    html,
  };

  if (ccList && ccList.length) payload.cc = ccList;
  if (bccList && bccList.length) payload.bcc = bccList;
  if (replyTo) payload.reply_to = replyTo;

  const normalizedAttachments = normalizeAttachments(attachments);
  if (normalizedAttachments.length) payload.attachments = normalizedAttachments;

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

module.exports = {
  sendEmail,
};
