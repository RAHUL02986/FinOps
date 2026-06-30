const cron = require('node-cron');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Superadmin Alerts for High Priority Leads
 * Runs every 6 hours to check for high-priority leads not updated in 48+ hours
 */
const checkHighPriorityLeadAlerts = async () => {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const staleHighPriorityLeads = await Lead.find({
      priority: 'High',
      leadStatus: { $nin: ['Converted Lead', 'Closed/Lost'] },
      updatedAt: { $lt: fortyEightHoursAgo }
    })
    .populate('createdBy', 'name email')
    .populate('employee', 'name email');
    
    if (staleHighPriorityLeads.length === 0) {
      console.log('No stale high-priority leads found');
      return;
    }
    
    const superadmins = await User.find({ role: 'superadmin' });
    
    if (superadmins.length === 0) {
      console.log('No superadmins found to notify');
      return;
    }
    
    for (const lead of staleHighPriorityLeads) {
      const hoursSinceUpdate = Math.floor((Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60));
      
      for (const admin of superadmins) {
        await Notification.create({
          user: admin._id,
          type: 'lead_alert',
          title: '⚠️ High Priority Lead Requires Attention',
          message: `Lead "${lead.projectDescription.substring(0, 50)}..." (${lead.clientName || 'No name'}) has not been updated in ${hoursSinceUpdate} hours. Temperature: ${lead.leadTemperature}. Expected Value: ${lead.currency} $${lead.expectedValue?.toLocaleString()}.`,
          priority: 'high'
        });
      }
    }
    
    console.log(`✅ Sent alerts for ${staleHighPriorityLeads.length} high-priority leads to ${superadmins.length} superadmin(s)`);
    
  } catch (error) {
    console.error('❌ Error in checkHighPriorityLeadAlerts:', error);
  }
};

/**
 * Check for overdue follow-ups
 */
const checkOverdueFollowUps = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueLeads = await Lead.find({
      followUpDate: { $lt: today },
      leadStatus: { $nin: ['Converted Lead', 'Closed/Lost'] }
    })
    .populate('createdBy', 'name email')
    .populate('employee', 'name email');
    
    if (overdueLeads.length === 0) {
      console.log('No overdue follow-ups found');
      return;
    }
    
    const leadsByEmployee = {};
    
    for (const lead of overdueLeads) {
      const employeeId = lead.employee?._id?.toString() || lead.createdBy._id.toString();
      if (!leadsByEmployee[employeeId]) {
        leadsByEmployee[employeeId] = [];
      }
      leadsByEmployee[employeeId].push(lead);
    }
    
    for (const [employeeId, leads] of Object.entries(leadsByEmployee)) {
      const leadsList = leads.map(l => 
        `• ${l.clientName || 'No name'} - ${l.projectDescription.substring(0, 30)}...`
      ).join('\n');
      
      await Notification.create({
        user: employeeId,
        type: 'lead_reminder',
        title: '📅 Overdue Lead Follow-ups',
        message: `You have ${leads.length} lead(s) with overdue follow-up dates:\n${leadsList}`,
        priority: 'medium'
      });
    }
    
    console.log(`✅ Sent overdue follow-up notifications to ${Object.keys(leadsByEmployee).length} user(s)`);
    
  } catch (error) {
    console.error('❌ Error in checkOverdueFollowUps:', error);
  }
};

/**
 * Hot lead alerts (24 hour check)
 */
const checkHotLeadAlerts = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const staleHotLeads = await Lead.find({
      leadTemperature: 'Hot',
      leadStatus: { $nin: ['Converted Lead', 'Closed/Lost'] },
      updatedAt: { $lt: twentyFourHoursAgo }
    })
    .populate('employee', 'name email')
    .populate('createdBy', 'name email');
    
    if (staleHotLeads.length === 0) {
      console.log('No stale hot leads found');
      return;
    }
    
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    
    for (const lead of staleHotLeads) {
      const assignedUser = lead.employee || lead.createdBy;
      
      if (assignedUser) {
        await Notification.create({
          user: assignedUser._id,
          type: 'lead_reminder',
          title: '🔥 Hot Lead Needs Attention',
          message: `Your hot lead "${lead.projectDescription.substring(0, 50)}..." requires immediate follow-up. Last updated 24+ hours ago.`,
          priority: 'high'
        });
      }
      
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: 'lead_alert',
          title: '🔥 Hot Lead Alert',
          message: `Hot lead "${lead.projectDescription.substring(0, 40)}..." (Assigned to: ${assignedUser?.name || 'Unassigned'}) has not been updated in 24+ hours. Expected Value: ${lead.currency} $${lead.expectedValue?.toLocaleString()}.`,
          priority: 'high'
        });
      }
    }
    
    console.log(`✅ Sent hot lead alerts for ${staleHotLeads.length} lead(s)`);
    
  } catch (error) {
    console.error('❌ Error in checkHotLeadAlerts:', error);
  }
};

// Schedule jobs
const scheduleHighPriorityAlerts = () => {
  cron.schedule('0 */6 * * *', checkHighPriorityLeadAlerts);
  console.log('✅ High Priority Lead Alerts cron job scheduled (every 6 hours)');
};

const scheduleOverdueFollowUps = () => {
  cron.schedule('0 9 * * *', checkOverdueFollowUps);
  console.log('✅ Overdue Follow-ups cron job scheduled (daily at 9 AM)');
};

const scheduleHotLeadAlerts = () => {
  cron.schedule('0 */12 * * *', checkHotLeadAlerts);
  console.log('✅ Hot Lead Alerts cron job scheduled (every 12 hours)');
};

module.exports = {
  scheduleHighPriorityAlerts,
  scheduleOverdueFollowUps,
  scheduleHotLeadAlerts,
  checkHighPriorityLeadAlerts,
  checkOverdueFollowUps,
  checkHotLeadAlerts
};
