const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a salary slip PDF matching the provided format.
 * @param {Object} slip - Salary slip data
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Resolves to the PDF file path
 */


async function generateSalarySlipPDF(slip, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Logo (centered, dynamic from COMPANY_LOGO_URL)
  try {
    const logoUrl = process.env.COMPANY_LOGO_URL || '';
    let logoBuffer = null;
    if (logoUrl) {
      if (logoUrl.startsWith('http')) {
        // Download remote logo
        const https = require('https');
        const http = require('http');
        const urlModule = require('url');
        const urlObj = urlModule.parse(logoUrl);
        const getModule = urlObj.protocol === 'https:' ? https : http;
        logoBuffer = await new Promise((resolveLogo, rejectLogo) => {
          getModule.get(logoUrl, (res) => {
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
              resolveLogo(Buffer.concat(data));
            });
          }).on('error', rejectLogo);
        });
      } else {
        // Local file
        const logoPath = path.isAbsolute(logoUrl) ? logoUrl : path.join(__dirname, '../', logoUrl);
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
        }
      }
      if (logoBuffer) {
        doc.image(logoBuffer, doc.page.width / 2 - 40, 20, { width: 80, height: 80 });
        doc.moveDown(4.5);
      }
    }
  } catch (e) { /* ignore logo errors */ }

    // Header
    doc.fontSize(16).fillColor('#1a237e').font('Helvetica-Bold').text(`Salary Slip – ${slip.monthName} ${slip.year}`, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).fillColor('#222').font('Helvetica-Bold').text(process.env.COMPANY_NAME || slip.companyName || 'CodexMatrix Pvt. Ltd.', { align: 'center' });
    doc.fontSize(10).fillColor('#444').font('Helvetica').text(`Address: ${process.env.COMPANY_ADDRESS || slip.companyAddress || 'Dharamshala, Himachal Pradesh, India'}`, { align: 'center' });
    doc.fontSize(10).fillColor('#444').text(`Email: ${process.env.COMPANY_EMAIL || slip.companyEmail || 'hr@codexmatrix.com'} | ${process.env.COMPANY_WEBSITE || slip.companyWebsite || 'www.codexmatrix.com'}`, { align: 'center' });
    doc.moveDown(0.5);

    // Draw outer border
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;
    let y = doc.y;
    doc.roundedRect(startX, y, pageWidth, 700, 10).stroke('#bdbdbd');

    // Employee Details Table
    y += 10;
    doc.rect(startX + 1, y, pageWidth - 2, 28).fillAndStroke('#e3eafc', '#bdbdbd');
    doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(12).text('Employee Details', startX, y + 7, { align: 'center', width: pageWidth });
    y += 32;
    const empFields = [
      ['Employee Name', slip.employeeName || ''],
      ['Designation', slip.designation || ''],
      ['Employee ID', slip.employeeId || ''],
      ['Department', slip.department || ''],
      ['Month & Year', `${slip.monthName} ${slip.year}`],
      ['Work Location', slip.workLocation || ''],
    ];
    // Table header
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
    doc.text('Field', startX + 10, y, { width: 120 });
    doc.text('Details', startX + 130, y, { width: pageWidth - 140 });
    y += 18;
    doc.font('Helvetica').fontSize(10).fillColor('#222');
    empFields.forEach(([k, v], i) => {
      if (i % 2 === 0) {
        doc.rect(startX + 1, y, pageWidth - 2, 18).fill('#f5f7fa');
        doc.fillColor('#222');
      } else {
        doc.fillColor('#222');
      }
      doc.text(k, startX + 10, y, { width: 120 });
      doc.text(v, startX + 130, y, { width: pageWidth - 140 });
      y += 18;
    });
    y += 10;



    // Earnings Table Header
    doc.rect(startX + 1, y, pageWidth - 2, 28).fillAndStroke('#e3eafc', '#bdbdbd');
    doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(12).text('Earnings', startX + 10, y + 7, { width: pageWidth - 20 });
    y += 32;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
    doc.text('Component', startX + 10, y, { width: 120 });
    doc.text('Amount (INR)', startX + 140, y, { width: 100 });
    doc.text('Remarks', startX + 250, y, { width: pageWidth - 260 });
    y += 16;
    doc.font('Helvetica').fontSize(10).fillColor('#222');
    // Always show Basic, HRA, Allowances, Bonus as separate rows if present
    let earningsRows = [];
    if (slip.basicSalary && slip.basicSalary > 0) earningsRows.push({ component: 'Basic Salary', amount: slip.basicSalary, remarks: '' });
    if (slip.hra && slip.hra > 0) earningsRows.push({ component: 'HRA', amount: slip.hra, remarks: '' });
    if (slip.allowances && slip.allowances > 0) earningsRows.push({ component: 'Allowances', amount: slip.allowances, remarks: '' });
    if (slip.bonus && slip.bonus > 0) earningsRows.push({ component: 'Bonus', amount: slip.bonus, remarks: '' });
    // Then add any custom earnings
    if (slip.earnings && slip.earnings.length > 0) {
      slip.earnings.forEach(e => {
        // Avoid duplicate rows for Basic, HRA, Allowances, Bonus if user added them as custom earnings
        if (["Basic","HRA","Allowances","Bonus"].includes((e.component || '').trim())) return;
        earningsRows.push({ component: e.component, amount: e.amount, remarks: e.remarks });
      });
    }
    if (earningsRows.length === 0) earningsRows = [{ component: '', amount: '', remarks: '' }];

    // Calculate deductions from facilities/expenses and extraDeductions
    let facilitiesDeductions = 0;
    if (slip.facilities && slip.facilities.length > 0) {
      facilitiesDeductions = slip.facilities.reduce((sum, f) => {
        const cost = parseFloat(f.cost) || 0;
        return sum + cost;
      }, 0);
    }
    let extraDeductionsValue = 0;
    if (slip.extraDeductions && slip.extraDeductions.length > 0) {
      extraDeductionsValue = slip.extraDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    }
    const totalDeductions = facilitiesDeductions + extraDeductionsValue;
    if (facilitiesDeductions > 0) earningsRows.push({ component: 'Facilities/Expenses Deduction', amount: `-${facilitiesDeductions}`, remarks: '' });
    if (extraDeductionsValue > 0) earningsRows.push({ component: 'Extra Deduction', amount: `-${extraDeductionsValue}`, remarks: '' });
    if (slip.tax && slip.tax > 0) earningsRows.push({ component: 'Tax', amount: `-${slip.tax}`, remarks: '' });
    if (slip.bonus && slip.bonus > 0) earningsRows.push({ component: 'Bonus', amount: slip.bonus, remarks: '' });
    if (earningsRows.length === 0) earningsRows = [{ component: '', amount: '', remarks: '' }];
    earningsRows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.rect(startX + 1, y, pageWidth - 2, 16).fill('#f5f7fa');
        doc.fillColor('#222');
      } else {
        doc.fillColor('#222');
      }
      doc.text(row.component || '', startX + 10, y, { width: 120 });
      doc.text(row.amount || '', startX + 140, y, { width: 100 });
      doc.text(row.remarks || '', startX + 250, y, { width: pageWidth - 260 });
      y += 16;
    });
    // Dynamically calculate Net Salary
    const basic= slip.basicSalary || 0;
    const hra = slip.hra || 0;
    const allowances = slip.allowances || 0;
    const bonus = slip.bonus || 0;
    const earningsTotal = (slip.earnings && slip.earnings.length > 0)
      ? slip.earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
      : 0;
    const gross = Number(basic) + Number(hra) + Number(allowances) + Number(bonus) + earningsTotal;
    const netSalary = gross - totalDeductions;
    y += 8;
    doc.rect(startX + 1, y, pageWidth - 2, 24).fillAndStroke('#e3eafc', '#bdbdbd');
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1a237e').text('Net Salary', startX + 10, y + 6, { width: 120 });

  doc.font('Helvetica-Bold').fontSize(13).fillColor('#1a237e').text(netSalary.toLocaleString('en-IN'), startX + 140, y + 6, { width: 100 });
  y += 32;
  doc.font('Helvetica').fontSize(10).fillColor('#222');

  // Payment Details and Authorization
  doc.font('Helvetica-Bold').fontSize(10).text('Payment Details:', startX + 10, y, { width: 200 });
  doc.font('Helvetica').fontSize(10).text(slip.paymentDetails || '', startX + 10, y + 14, { width: 250 });
  doc.font('Helvetica-Bold').fontSize(10).text('Authorized By:', startX + 270, y, { width: 200 });
  doc.font('Helvetica').fontSize(10).text(slip.authorizedBy || '', startX + 270, y + 14, { width: pageWidth - 280 });
  y += 50;

  // Notes
  doc.font('Helvetica-Bold').fontSize(10).text('Notes:', startX + 10, y, { width: 60 });
  doc.font('Helvetica').fontSize(10).text(slip.notes1 || '', startX + 70, y, { width: 250 });
  doc.text(slip.notes2 || '', startX + 330, y, { width: pageWidth - 340 });

  doc.end();
  // Return a promise that resolves when the PDF is finished writing
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateSalarySlipPDF };