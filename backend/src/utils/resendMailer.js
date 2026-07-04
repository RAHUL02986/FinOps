require('dotenv').config();
const fs = require('fs');

const RESEND_API_URL = 'https://api.resend.com/emails';

function getSandboxRecipient() {
  return (process.env.RESEND_SANDBOX_RECIPIENT || process.env.RESEND_TEST_TO || process.env.EMAIL_USER || '').trim();
}

function isSandboxRecipientError(errorPayload) {
  const message = errorPayload?.message || '';
  return errorPayload?.statusCode === 403 && /only send testing emails to your own email address/i.test(message);
}

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
  const sandboxRecipient = getSandboxRecipient();

  const buildPayload = (recipientList, recipientCcList, recipientBccList) => {
    const payload = {
      from: fromAddress,
      to: recipientList,
      subject,
      text,
      html,
    };

    if (recipientCcList && recipientCcList.length) payload.cc = recipientCcList;
    if (recipientBccList && recipientBccList.length) payload.bcc = recipientBccList;
    if (replyTo) payload.reply_to = replyTo;

    const normalizedAttachments = normalizeAttachments(attachments);
    if (normalizedAttachments.length) payload.attachments = normalizedAttachments;

    return payload;
  };

  const payload = buildPayload(recipients, ccList, bccList);
  let response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorPayload = null;
    try {
      errorPayload = JSON.parse(errorText);
    } catch {
      // Ignore parse errors and use raw text
    }

    if (sandboxRecipient && isSandboxRecipientError(errorPayload)) {
      const fallbackRecipients = [sandboxRecipient];
      const fallbackText = `${text || ''}\n\n[Resend sandbox fallback] Original recipient(s): ${recipients.join(', ')}`;
      const fallbackHtml = `${html || ''}<p><small>[Resend sandbox fallback] Original recipient(s): ${recipients.join(', ')}</small></p>`;
      response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPayload(fallbackRecipients, undefined, undefined) /* no cc/bcc fallback */),
      });

      if (!response.ok) {
        const fallbackErrorText = await response.text();
        throw new Error(`Resend request failed (${response.status}): ${fallbackErrorText}`);
      }

      return response.json();
    }

    throw new Error(`Resend request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

module.exports = {
  sendEmail,
};
