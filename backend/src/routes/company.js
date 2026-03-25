const express = require('express');
const router = express.Router();

// GET company info (for frontend, e.g. work location)
router.get('/', (req, res) => {
  res.json({
    companyName: process.env.COMPANY_NAME || '',
    companyEmail: process.env.COMPANY_EMAIL || '',
    companyAddress: process.env.COMPANY_ADDRESS || '',
    companyPhone: process.env.COMPANY_PHONE || '',
    companyWebsite: process.env.COMPANY_WEBSITE || '',
    companyLogoUrl: process.env.COMPANY_LOGO_URL || '',
    workLocation: process.env.WORK_LOCATION || '',
  });
});

module.exports = router;
