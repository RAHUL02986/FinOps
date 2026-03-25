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
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(12).fillColor('#222').text(`Salary Slip – ${slip.monthName} ${slip.year}`, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor('#222').text(`Company: ${slip.companyName || 'CodexMatrix Pvt. Ltd.'}`, { align: 'center' });
    doc.fontSize(10).fillColor('#222').text(`Address: ${slip.companyAddress || 'Dharamshala, Himachal Pradesh, India'}`, { align: 'center' });
    doc.fontSize(10).fillColor('#222').text(`Email: ${slip.companyEmail || 'hr@codexmatrix.com'} | ${slip.companyWebsite || 'www.codexmatrix.com'}`, { align: 'center' });
    doc.moveDown(0.5);

    // Draw outer border
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;
    let y = doc.y;
    doc.rect(startX, y, pageWidth, 700).stroke();

    // Employee Details Table
    y += 5;
    doc.fontSize(11).font('Helvetica-Bold').text('Employee Details', startX, y + 5, { align: 'center', width: pageWidth });
    y += 25;
    const empFields = [
      ['Employee Name', slip.employeeName || ''],
      ['Designation', slip.designation || ''],
      ['Employee ID', slip.employeeId || ''],
      ['Department', slip.department || ''],
      ['Month & Year', `${slip.monthName} ${slip.year}`],
      ['Work Location', slip.workLocation || ''],
    ];
    // Table header
    doc.font('Helvetica-Bold').fontSize(10).text('Field', startX + 10, y, { width: 120 });
    doc.text('Details', startX + 130, y, { width: pageWidth - 140 });
    y += 18;
    doc.font('Helvetica').fontSize(10);
    empFields.forEach(([k, v]) => {
      doc.text(k, startX + 10, y, { width: 120 });
      doc.text(v, startX + 130, y, { width: pageWidth - 140 });
      y += 18;
    });
    y += 10;


    // Earnings Table
    doc.font('Helvetica-Bold').fontSize(11).text('Earnings', startX + 10, y, { width: pageWidth - 20 });
    y += 18;
    doc.font('Helvetica-Bold').fontSize(10).text('Earning Component', startX + 10, y, { width: 140 });
    doc.text('Amount (INR)', startX + 160, y, { width: 100 });
    doc.text('Remarks', startX + 270, y, { width: pageWidth - 280 });
    y += 16;
    doc.font('Helvetica').fontSize(10);
    let earningsRows = (slip.earnings && slip.earnings.length > 0) ? slip.earnings.slice() : [];
    // If earningsRows is empty, auto-populate from legacy fields
    if (earningsRows.length === 0) {
      if (slip.basicSalary && slip.basicSalary > 0) earningsRows.push({ component: 'Basic', amount: slip.basicSalary, remarks: '' });
      if (slip.hra && slip.hra > 0) earningsRows.push({ component: 'HRA', amount: slip.hra, remarks: '' });
      if (slip.allowances && slip.allowances > 0) earningsRows.push({ component: 'DA', amount: slip.allowances, remarks: '' });
    }

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
    earningsRows.forEach(row => {
      doc.text(row.component || '', startX + 10, y, { width: 140 });
      doc.text(row.amount || '', startX + 160, y, { width: 100 });
      doc.text(row.remarks || '', startX + 270, y, { width: pageWidth - 280 });
      y += 16;
    });
    // Dynamically calculate Net Salary
    const basic = slip.basicSalary || 0;
    const earningsTotal = (slip.earnings && slip.earnings.length > 0)
      ? slip.earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
      : 0;
    const tax = slip.tax || 0;
    const netSalary = basic + earningsTotal - totalDeductions - tax;
    y += 6;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#222').text('Net Salary', startX + 10, y, { width: 140 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#222').text(netSalary.toLocaleString('en-IN'), startX + 160, y, { width: 100 });
    doc.font('Helvetica').fontSize(10).fillColor('#222');
    y += 18;

    // Facilities/Expenses Table
    doc.font('Helvetica-Bold').fontSize(10).text('Company-Provided Facilities / Operational Expenses', startX + 10, y, { width: pageWidth - 20 });
    y += 16;
    doc.font('Helvetica').fontSize(9).text('(Additional value provided by the company – not part of take-home pay)', startX + 10, y, { width: pageWidth - 20 });
    y += 16;
    doc.font('Helvetica-Bold').fontSize(10).text('Facility / Expense Head', startX + 10, y, { width: 160 });
    doc.text('Approx. Monthly Cost ', startX + 180, y, { width: 120 });
    doc.text('Remarks', startX + 320, y, { width: pageWidth - 330 });
    y += 16;
    doc.font('Helvetica').fontSize(10);
    const facilitiesRows = (slip.facilities && slip.facilities.length > 0) ? slip.facilities : [{ head: '', cost: '', remarks: '' }];
    facilitiesRows.forEach(row => {
      doc.text(row.head || '', startX + 10, y, { width: 160 });
      doc.text(row.cost || '', startX + 180, y, { width: 120 });
      doc.text(row.remarks || '', startX + 320, y, { width: pageWidth - 330 });
      y += 16;
    });
    y += 10;

    // Removed 'Total Value to Employee' section as requested

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
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateSalarySlipPDF };