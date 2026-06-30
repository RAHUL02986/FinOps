 
// Script: seed-users-to-nextjs.js
// Fetches a token from FinOps backend and uses it to export users, then seeds them to Next.js
 
 
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
 
// === CONFIGURATION ===
 
const FINOPS_LOGIN_URL = process.env.FINOPS_LOGIN_URL;
const FINOPS_EXPORT_URL = process.env.FINOPS_EXPORT_URL;
const NEXTJS_BULK_REGISTER_URL = process.env.NEXTJS_BULK_REGISTER_URL;
const ADMIN_EMAIL_CRM = process.env.ADMIN_EMAIL_CRM;
const ADMIN_PASSWORD_CRM = process.env.ADMIN_PASSWORD_CRM;
 
async function getFinopsToken() {
  const res = await axios.post(FINOPS_LOGIN_URL, {
    email: ADMIN_EMAIL_CRM,
    password: ADMIN_PASSWORD_CRM,
  });
  if (!res.data.success || !res.data.token) throw new Error('Failed to login to FinOps backend');
  return res.data.token;
}
 
async function main() {
  // Debug: print all env variables being used
  console.log('Seeding script configuration:', {
    FINOPS_LOGIN_URL,
    FINOPS_EXPORT_URL,
    NEXTJS_BULK_REGISTER_URL,
    ADMIN_EMAIL_CRM,
    ADMIN_PASSWORD_CRM
  });
  try {
    // 1. Login to FinOps backend and get token
    console.log('Logging in to FinOps backend...');
    const token = await getFinopsToken();
    console.log('Token acquired.');
 
    // 2. Fetch users from FinOps backend
    console.log('Fetching users from FinOps...');
    const exportRes = await axios.get(FINOPS_EXPORT_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!exportRes.data.success) throw new Error('Failed to fetch users');
    const users = exportRes.data.data;
    if (!Array.isArray(users) || users.length === 0) {
      console.log('No users found to seed.');
      return;
    }
    console.log(`Fetched ${users.length} users.`);
 
    // 3. Map FinOps roles to allowed Next.js roles
    const roleMap = {
      'developer': 'developer',
      'designing': 'designer',
      'designer': 'designer',
      'admin': 'admin',
      'project_manager': 'project_manager',
      'qa': 'qa',
      'viewer': 'viewer',
      // Add more mappings as needed
    };
 
    const mappedUsers = users.map(u => {
      let mappedRole = u.role;
      // If user is 'employee', assign role as department (lowercased, trimmed)
      if (u.role === 'employee' && u.department) {
        mappedRole = u.department.trim().toLowerCase();
      }
      // Log the hashed password for each user
      console.log(`User: ${u.email}, Hashed Password: ${u.password}`);
      // Use the password as-is from FinOps export (should be hashed)
      return { ...u, role: mappedRole, isHashed: true };
    });
 
    // 4. Bulk register users in Next.js app
    console.log('Sending users to Next.js bulk register endpoint...');
    const registerRes = await axios.post(NEXTJS_BULK_REGISTER_URL, mappedUsers, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (registerRes.data && Array.isArray(registerRes.data.results)) {
      console.log('Bulk registration results:');
      registerRes.data.results.forEach(r => {
        console.log(`${r.email}: ${r.status}${r.error ? ' - ' + r.error : ''}`);
      });
    } else {
      console.log('Unexpected response:', registerRes.data);
    }
  } catch (err) {
    console.error('Error during seeding:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
      console.error('Status:', err.response.status);
      console.error('Headers:', err.response.headers);
    } else if (err.request) {
      console.error('No response received. Request:', err.request);
    } else {
      console.error('Error config:', err.config);
    }
  }
}
 
main();
 
 