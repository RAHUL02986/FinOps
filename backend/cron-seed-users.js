// cron-seed-users.js
// Runs the user seeding script once per day using node-cron
 
const cron = require('node-cron');
const { exec } = require('child_process');
 
// Schedule: every day at 2:00 AM (change as needed)
cron.schedule('0 2 * * *', () => {
  console.log('Running daily user seeding at 2:00 AM...');
  exec('node seed-users-to-nextjs.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Seeding error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Seeding stderr: ${stderr}`);
      return;
    }
    console.log(`Seeding output: ${stdout}`);
  });
});
 
console.log('Cron job scheduled: user seeding will run daily at 2:00 AM.');
 
 