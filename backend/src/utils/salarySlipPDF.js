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

  // Header (compact, no logo)
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  let y = doc.y;
  doc.fontSize(12).font('Helvetica-Bold').text(`Salary Slip – ${slip.monthName} ${slip.year}`, startX, y, { align: 'center', width: pageWidth });
  y += 18;
  doc.fontSize(10).font('Helvetica').text(`Company: ${process.env.COMPANY_NAME || slip.companyName || 'CodexMatrix Pvt. Ltd.'}`, startX, y, { align: 'center', width: pageWidth });
  y += 14;
  doc.fontSize(9).font('Helvetica').text(`Address: ${process.env.COMPANY_ADDRESS || slip.companyAddress || 'Dharamshala, Himachal Pradesh, India'}`, startX, y, { align: 'center', width: pageWidth });
  y += 12;
  doc.fontSize(9).font('Helvetica').text(`Email: ${process.env.COMPANY_EMAIL || slip.companyEmail || 'hr@codexmatrix.com'} | ${process.env.COMPANY_WEBSITE || slip.companyWebsite || 'www.codexmatrix.com'}`, startX, y, { align: 'center', width: pageWidth });
  y += 18;

  // Employee Details Table (bordered)
  doc.rect(startX, y, pageWidth, 24).stroke();
  doc.font('Helvetica-Bold').fontSize(11).text('Employee Details', startX, y + 6, { align: 'center', width: pageWidth });
  y += 24;
  // Table header
  doc.rect(startX, y, pageWidth, 18).stroke();
  doc.font('Helvetica-Bold').fontSize(10).text('Field', startX + 2, y + 4, { width: 120 });
  doc.text('Details', startX + 122, y + 4, { width: pageWidth - 124 });
  y += 18;
  // Table rows
  const empFields = [
    ['Employee Name', slip.employeeName || ''],
    ['Designation', slip.designation || ''],
    ['Employee ID', slip.employeeId || ''],
    ["Father's Name", slip.fatherName || ''],
    ["Mother's Name", slip.motherName || ''],
    ['Department', slip.department || ''],
    ['Month & Year', `${slip.monthName} ${slip.year}`],
    ['Work Location', slip.workLocation || ''],
  ];
  empFields.forEach(([k, v]) => {
    doc.rect(startX, y, pageWidth, 18).stroke();
    doc.font('Helvetica').fontSize(10).text(k, startX + 2, y + 4, { width: 120 });
    doc.text(v, startX + 122, y + 4, { width: pageWidth - 124 });
    y += 18;
  });

  // Earnings Table (bordered)
  y += 8;
  doc.rect(startX, y, pageWidth, 24).stroke();
  doc.font('Helvetica-Bold').fontSize(11).text('Earnings', startX, y + 6, { align: 'center', width: pageWidth });
  y += 24;
  // Table header
  doc.rect(startX, y, pageWidth, 18).stroke();
  doc.font('Helvetica-Bold').fontSize(10).text('Earning Component', startX + 2, y + 4, { width: 140 });
  doc.text('Amount (INR)', startX + 142, y + 4, { width: 80 });
  doc.text('Remarks', startX + 222, y + 4, { width: pageWidth - 224 });
  y += 18;
  // Table rows
  let earningsRows = [];
  if (slip.basicSalary && slip.basicSalary > 0) earningsRows.push({ component: 'Basic Salary', amount: slip.basicSalary, remarks: slip.basicSalaryRemarks || '' });
  if (slip.hra && slip.hra > 0) earningsRows.push({ component: 'HRA', amount: slip.hra, remarks: slip.hraRemarks || '' });
  if (slip.allowances && slip.allowances > 0) earningsRows.push({ component: 'Allowances', amount: slip.allowances, remarks: slip.allowancesRemarks || '' });
  if (slip.bonus && slip.bonus > 0) earningsRows.push({ component: 'Bonus', amount: slip.bonus, remarks: slip.bonusRemarks || '' });
  if (slip.earnings && slip.earnings.length > 0) {
    slip.earnings.forEach(e => {
      if (["Basic","HRA","Allowances","Bonus"].includes((e.component || '').trim())) return;
      earningsRows.push({ component: e.component, amount: e.amount, remarks: e.remarks });
    });
  }
  if (earningsRows.length === 0) earningsRows = [{ component: '', amount: '', remarks: '' }];
  earningsRows.forEach(row => {
    doc.rect(startX, y, pageWidth, 18).stroke();
    doc.font('Helvetica').fontSize(10).text(row.component || '', startX + 2, y + 4, { width: 140 });
    doc.text(row.amount || '', startX + 142, y + 4, { width: 80 });
    doc.text(row.remarks || '', startX + 222, y + 4, { width: pageWidth - 224 });
    y += 18;
  });

  // Facilities/Expenses & Extra Deductions Table (bordered, improved layout)
  const facilitiesRows = (slip.facilities && slip.facilities.length > 0) ? slip.facilities.map(f => ({
    type: 'Facility/Expense',
    head: f.head || '',
    amount: f.cost || '',
    remarks: f.remarks || ''
  })) : [];
  const extraDeductionRows = (slip.extraDeductions && slip.extraDeductions.length > 0) ? slip.extraDeductions.map(d => ({
    type: 'Extra Deduction',
    head: d.head || d.type || d.component || '',
    amount: d.amount || '',
    remarks: d.remarks || ''
  })) : [];
  const allDeductionRows = [...facilitiesRows, ...extraDeductionRows];
  if (allDeductionRows.length > 0) {
    y += 8;
    doc.rect(startX, y, pageWidth, 24).stroke();
    doc.font('Helvetica-Bold').fontSize(11).text('Facilities / Expenses / Extra Deductions', startX, y + 6, { align: 'center', width: pageWidth });
    y += 24;
    // Table header
    doc.rect(startX, y, pageWidth, 18).stroke();
    doc.font('Helvetica-Bold').fontSize(10)
      .text('Type', startX + 2, y + 4, { width: 60 })
      .text('Head', startX + 64, y + 4, { width: 120 })
      .text('Amount (INR)', startX + 186, y + 4, { width: 80 })
      .text('Remarks', startX + 268, y + 4, { width: pageWidth - 270 });
    y += 18;
    allDeductionRows.forEach(row => {
      // Calculate required height for each cell
      const cellTypeHeight = doc.heightOfString(row.type, { width: 60, align: 'left', font: 'Helvetica', fontSize: 10 });
      const cellHeadHeight = doc.heightOfString(row.head, { width: 120, align: 'left', font: 'Helvetica', fontSize: 10 });
      const cellAmountHeight = doc.heightOfString(row.amount, { width: 80, align: 'left', font: 'Helvetica', fontSize: 10 });
      const cellRemarksHeight = doc.heightOfString(row.remarks, { width: pageWidth - 270, align: 'left', font: 'Helvetica', fontSize: 10 });
      const rowHeight = Math.max(cellTypeHeight, cellHeadHeight, cellAmountHeight, cellRemarksHeight) + 8; // 8px padding

      doc.rect(startX, y, pageWidth, rowHeight).stroke();
      doc.font('Helvetica').fontSize(10);
      doc.text(row.type, startX + 2, y + 4, { width: 60 });
      doc.text(row.head, startX + 64, y + 4, { width: 120 });
      doc.text(row.amount, startX + 186, y + 4, { width: 80 });
      doc.text(row.remarks, startX + 268, y + 4, { width: pageWidth - 270 });
      y += rowHeight;
    });
  }


  // Gross Salary, Total Expenses, Total Deductions, Net Salary
  y += 8;
  // Calculate values
  const basic = slip.basicSalary || 0;
  const hra = slip.hra || 0;
  const allowances = slip.allowances || 0;
  const bonus = slip.bonus || 0;
  const earningsTotal = (slip.earnings && slip.earnings.length > 0)
    ? slip.earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    : 0;
  let facilitiesExpenses = 0;
  if (slip.facilities && slip.facilities.length > 0) {
    facilitiesExpenses = slip.facilities.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0);
  }
  let extraDeductionsValue = 0;
  if (slip.extraDeductions && slip.extraDeductions.length > 0) {
    extraDeductionsValue = slip.extraDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  }
  const gross = Number(basic) + Number(hra) + Number(allowances) + Number(bonus) + earningsTotal;
  const netSalary = gross - facilitiesExpenses - extraDeductionsValue;

  // Gross Salary
  doc.rect(startX, y, pageWidth, 18).stroke();
  doc.font('Helvetica-Bold').fontSize(11).text('Gross Salary', startX + 2, y + 4, { width: 140 });
  doc.font('Helvetica-Bold').fontSize(11).text(gross.toLocaleString('en-IN'), startX + 142, y + 4, { width: 80 });
  y += 18;

  // Total Expenses (Facilities/Expenses)
  doc.rect(startX, y, pageWidth, 18).stroke();
  doc.font('Helvetica-Bold').fontSize(11).text('Total Expenses', startX + 2, y + 4, { width: 140 });
  doc.font('Helvetica-Bold').fontSize(11).text(facilitiesExpenses.toLocaleString('en-IN'), startX + 142, y + 4, { width: 80 });
  y += 18;

  // Total Deductions (Extra Deductions)
  doc.rect(startX, y, pageWidth, 18).stroke();
  doc.font('Helvetica-Bold').fontSize(11).text('Total Deductions', startX + 2, y + 4, { width: 140 });
  doc.font('Helvetica-Bold').fontSize(11).text(extraDeductionsValue.toLocaleString('en-IN'), startX + 142, y + 4, { width: 80 });
  y += 18;

  // Net Salary
  doc.rect(startX, y, pageWidth, 18).stroke();
  doc.font('Helvetica-Bold').fontSize(11).text('Net Salary', startX + 2, y + 4, { width: 140 });
  doc.font('Helvetica-Bold').fontSize(11).text(netSalary.toLocaleString('en-IN'), startX + 142, y + 4, { width: 80 });
  y += 24;

  // Payment Details and Authorization (simple rows)
  doc.font('Helvetica-Bold').fontSize(10).text('Payment Details:', startX, y, { width: 100 });
  const paymentDetailsHeight = doc.heightOfString(slip.paymentDetails || '', { width: pageWidth - 110, font: 'Helvetica', fontSize: 10 });
  doc.font('Helvetica').fontSize(10).text(slip.paymentDetails || '', startX + 100, y, { width: pageWidth - 110 });
  y += Math.max(paymentDetailsHeight, 14);

  doc.font('Helvetica-Bold').fontSize(10).text('Authorized By:', startX, y, { width: 100 });
  const authorizedByHeight = doc.heightOfString(slip.authorizedBy || '', { width: pageWidth - 110, font: 'Helvetica', fontSize: 10 });
  doc.font('Helvetica').fontSize(10).text(slip.authorizedBy || '', startX + 100, y, { width: pageWidth - 110 });
  y += Math.max(authorizedByHeight, 14);

  // Notes (multi-line, always at bottom)
  if ((slip.notes1 && slip.notes1.trim()) || (slip.notes2 && slip.notes2.trim())) {
    y += 8;
    doc.font('Helvetica-Bold').fontSize(10).text('Notes:', startX, y, { width: 60 });
    let notesY = y;
    let notesBlockHeight = 0;
    if (slip.notes1 && slip.notes1.trim()) {
      const notes1Height = doc.heightOfString(slip.notes1, { width: pageWidth - 70, font: 'Helvetica', fontSize: 10 });
      doc.font('Helvetica').fontSize(10).text(slip.notes1, startX + 70, notesY, { width: pageWidth - 70 });
      notesBlockHeight += notes1Height;
      notesY += notes1Height;
    }
    if (slip.notes2 && slip.notes2.trim()) {
      const notes2Height = doc.heightOfString(slip.notes2, { width: pageWidth - 70, font: 'Helvetica', fontSize: 10 });
      doc.font('Helvetica').fontSize(10).text(slip.notes2, startX + 70, notesY, { width: pageWidth - 70 });
      notesBlockHeight += notes2Height;
    }
    y += Math.max(notesBlockHeight, 16);
  }

  doc.end();
  // Return a promise that resolves when the PDF is finished writing
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateSalarySlipPDF };