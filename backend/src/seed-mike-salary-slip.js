// Script to insert a test salary slip for user 'mike' with all fields filled
const mongoose = require('mongoose');
const { SalarySlip } = require('./models/Payroll');
const User = require('./models/User');

async function seedMikeSalarySlip() {
  await mongoose.connect('mongodb://localhost:27017/expenditure'); // Change if your DB URL is different

  const mike = await User.findOne({ name: 'mike' });
  if (!mike) {
    console.error('User mike not found!');
    process.exit(1);
  }

  const slip = new SalarySlip({
    employee: mike._id,
    employeeName: 'mike',
    employeeEmail: mike.email,
    employeeId: 'CMX-EMP-001',
    designation: 'Developer',
    department: 'Development Team',
    workLocation: 'Dharamshala, Himachal Pradesh',
    month: 3,
    monthName: 'March',
    year: 2026,
    companyName: 'CodexMatrix Pvt. Ltd.',
    companyAddress: 'Dharamshala, Himachal Pradesh, India',
    companyEmail: 'hr@codexmatrix.com',
    companyWebsite: 'www.codexmatrix.com',
    earnings: [
      { component: 'Basic Salary', amount: '₹10000', remarks: 'Monthly fixed pay' },
      { component: 'Total Salary Paid', amount: '₹10000', remarks: '' },
      { component: 'Additional Payout', amount: '₹2000', remarks: 'Of EHR' }
    ],
    facilities: [
      { head: 'Office Premises', cost: '₹1000', remarks: 'Shared workspace & infrastructure' },
      { head: 'Utilities', cost: '₹400', remarks: 'Shared workplace utilities' },
      { head: 'Housekeeping', cost: '₹150', remarks: 'Cleaning & maintenance' },
      { head: 'High-Speed Internet', cost: '₹200', remarks: 'Office & WFH connectivity' },
      { head: 'Pantry & Refreshments', cost: '₹250', remarks: 'Tea, coffee & staff amenities' },
      { head: 'Total Company-Borne Facility Value', cost: '₹2000', remarks: 'Covered entirely by company' }
    ],
    totalValue: [
      { component: 'In Hand Salary', amount: '₹12000', remarks: '' },
      { component: 'Company-Provided Facilities', amount: '₹2000', remarks: '' },
      { component: 'Total Monthly Value (Indicative)', amount: '₹14000', remarks: 'Rupees fourteen Thousand Only' }
    ],
    paymentDetails: 'Payment Mode: Bank Transfer\nBank Name: Axis Bank\nAccount Number: 10520200001742\nPayment Date: 8th March 2026',
    authorizedBy: 'Karan Bhardwaj\nFounder & Director – CodexMatrix Pvt. Ltd.\nhr@codexmatrix.com | www.codexmatrix.com',
    notes1: 'CodexMatrix Pvt. Ltd. additionally covers operational expenses for every employee to maintain a comfortable, connected, and professional workplace.',
    notes2: 'These costs represent the approximate per-employee value of office rent, electricity, internet, refreshments, and cleaning — not direct cash components.\nThis slip is intended for internal HR communication and employee awareness.\nSystem-generated – no signature required.',
    basicSalary: 10000,
    hra: 0,
    allowances: 0,
    deductions: 0,
    tax: 0,
    netSalary: 12000,
    bonus: 2000,
    status: 'completed'
  });

  await slip.save();
  console.log('Test salary slip for mike inserted!');
  process.exit(0);
}

seedMikeSalarySlip();
