
'use client';
import api from '../../../lib/api';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { leadsAPI, teamsAPI, usersAPI } from '../../../lib/api';

// Milestone and financials form for converted leads
function ConvertedLeadDetails({ lead, onSave }) {
    const handleSave = () => {
      onSave({
        milestones,
        productValue,
        platformFees,
        finalValue
      });
    };
  const [milestones, setMilestones] = useState(lead.milestones || []);
  const [productValue, setProductValue] = useState(lead.productValue || 0);
  const [platformFees, setPlatformFees] = useState(lead.platformFees || 0);
  const finalValue = productValue - platformFees;

  const handleMilestoneChange = (idx, field, value) => {
    setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };
  const addMilestone = () => setMilestones([...milestones, { name: '', amount: 0, dueDate: '', status: 'Pending' }]);
  const removeMilestone = (idx) => setMilestones(milestones.filter((_, i) => i !== idx));

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h3 className="text-lg font-semibold mb-2">Project Milestones</h3>
      {milestones.map((m, idx) => (
        <div key={idx} className="flex gap-2 mb-2 items-center">
          <input type="text" placeholder="Milestone name" value={m.name} onChange={e => handleMilestoneChange(idx, 'name', e.target.value)} className="px-2 py-1 border rounded" />
          <input type="number" placeholder="Amount" value={m.amount} onChange={e => handleMilestoneChange(idx, 'amount', Number(e.target.value))} className="px-2 py-1 border rounded w-24" />
          <input type="date" value={m.dueDate ? m.dueDate.slice(0,10) : ''} onChange={e => handleMilestoneChange(idx, 'dueDate', e.target.value)} className="px-2 py-1 border rounded" />
          <select value={m.status} onChange={e => handleMilestoneChange(idx, 'status', e.target.value)} className="px-2 py-1 border rounded">
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
          <button type="button" onClick={() => removeMilestone(idx)} className="text-red-500">Remove</button>
        </div>
      ))}
      <button type="button" onClick={addMilestone} className="px-2 py-1 bg-gray-200 rounded mb-4">+ Add Milestone</button>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">Total Product Value</label>
          <input type="number" value={productValue} onChange={e => setProductValue(Number(e.target.value))} className="w-full px-2 py-1 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Platform Fees</label>
          <input type="number" value={platformFees} onChange={e => setPlatformFees(Number(e.target.value))} className="w-full px-2 py-1 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Final Value</label>
          <input type="number" value={finalValue} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" />
        </div>
      </div>
      <button type="button" onClick={handleSave} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">Save Milestones & Values</button>
    </div>
  );
}

const LEAD_SOURCES = [
  'LinkedIn',
  'Upwork',
  'Fiverr',
  'Freelancer',
  'Referral',
  'Website',
  'Email',
  'Social Media',
  'Other'
];

const TECH_STACKS = [
  'MERN Stack (MongoDB, Express, React, Node.js)',
  'MEAN Stack (MongoDB, Express, Angular, Node.js)',
  'Full Stack JavaScript',
  'Python Django',
  'Python Flask',
  'PHP Laravel',
  'Ruby on Rails',
  'Java Spring Boot',
  '.NET Core',
  'Vue.js + Node.js',
  'Next.js + Node.js',
  'React Native',
  'Flutter',
  'iOS Native',
  'Android Native',
  'WordPress',
  'Shopify',
  'Other'
];

const LEAD_STATUS_OPTIONS = ['New', 'Discovery', 'Proposal Sent', 'Negotiation', 'Converted Lead', 'Closed/Lost'];

const LEAD_TEMPERATURE = ['Hot', 'Warm', 'Cold'];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

const LOSS_REASONS = [
  'Price too high',
  'Competitor chosen',
  'No response',
  'Budget constraints',
  'Timeline mismatch',
  'Technical requirements',
  'Other'
];

const TAG_OPTIONS = [
  'Urgent',
  'High Value',
  'Repeat Client',
  'New Client',
  'Hot Lead',
  'Cold Lead',
  'Follow-up Required',
  'Proposal Sent',
  'Budget Approved',
  'Decision Maker',
  'Technical Discussion',
  'Price Sensitive',
  'Quick Turnaround',
  'Long Term Project',
  'Enterprise Client',
  'Startup',
  'Referral',
  'VIP'
];

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'Discovery': 'bg-purple-100 text-purple-800',
  'Proposal Sent': 'bg-yellow-100 text-yellow-800',
  'Negotiation': 'bg-orange-100 text-orange-800',
  'Converted Lead': 'bg-green-100 text-green-800',
  'Closed/Lost': 'bg-red-100 text-red-800',
};

const TEMPERATURE_COLORS = {
  'Hot': 'bg-red-100 text-red-800',
  'Warm': 'bg-yellow-100 text-yellow-800',
  'Cold': 'bg-blue-100 text-blue-800',
};


export default function LeadsPage() {
    const [detailLead, setDetailLead] = useState(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [convertedLeads, setConvertedLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  // For inline status editing
  const [statusEditId, setStatusEditId] = useState(null);
  const [statusEditValue, setStatusEditValue] = useState('');
  // For comments and activities
  const [newComment, setNewComment] = useState('');
  const [newActivity, setNewActivity] = useState({ type: 'call', description: '' });
  const [newNote, setNewNote] = useState('');
  // For team/employee selection
  const [teams, setTeams] = useState([]);
  const [bdmEmployees, setBdmEmployees] = useState([]); // Only BDM team employees for Lead Generator
  const [employees, setEmployees] = useState([]); // All employees for Tags
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    leadSource: '',
    projectDescription: '',
    technologyStack: '',
    leadStatus: 'New',
    notes: '',
    team: '',
    employee: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    company: '',
    priority: 'Medium',
    leadTemperature: 'Warm',
    expectedValue: 0,
    currency: 'USD',
    followUpDate: '',
    tags: '',
    lossReason: ''
  });
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  // File upload state
  const [attachments, setAttachments] = useState([]); // for files (images, pdfs)
  const [attachmentLinks, setAttachmentLinks] = useState(['']); // for links
  // Fetch only BDM team on mount and auto-select it
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await teamsAPI.getAll();
        const allTeams = res.data.data || [];
        // Filter to only show BDM team
        const bdmTeam = allTeams.find(team => team.name === 'BDM');
        if (bdmTeam) {
          setTeams([bdmTeam]);
          // Auto-select BDM team if not editing
          if (!editingLead) {
            setFormData(prev => ({ ...prev, team: bdmTeam._id }));
          }
        } else {
          setTeams([]);
        }
      } catch (e) {
        setTeams([]);
      }
    };
    fetchTeams();
  }, [editingLead]);

  // Close tag dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setShowTagDropdown(false);
      }
    };

    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagDropdown]);

  // Fetch all users for employee dropdown and tags
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/users');
        const data = res.data?.data || res.data?.users || [];
        
        setEmployees(data);
      } catch (e) {
        console.error('Error fetching employees:', e);
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch only BDM team employees for Lead Generator dropdown
  useEffect(() => {
    const fetchBdmEmployees = async () => {
      try {
        const res = await api.get('/users/bdm');
        const data = res.data?.data || [];
        
        setBdmEmployees(data);
      } catch (e) {
        console.error('Error fetching BDM employees:', e);
        setBdmEmployees([]);
      }
    };
    fetchBdmEmployees();
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterSource) params.source = filterSource;
      if (filterPriority) params.priority = filterPriority;

      // Fetch regular leads (not converted)
      const regularLeadsResponse = await leadsAPI.getAll({ 
        ...params, 
        status: activeTab === 'leads' ? undefined : 'Converted Lead' 
      });
      let leadsData = regularLeadsResponse.data;

      // If backend does not support priority filter, filter on frontend:
      if (filterPriority) {
        leadsData = leadsData.filter(lead => lead.priority === filterPriority);
      }

      if (activeTab === 'leads') {
        // Filter out converted leads
        const nonConvertedLeads = leadsData.filter(
          lead => lead.leadStatus !== 'Converted Lead'
        );
        setLeads(nonConvertedLeads);
      } else {
        setConvertedLeads(leadsData);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, filterSource, filterPriority]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
  };

  const checkDuplicateLead = async (email, company) => {
    try {
      const response = await leadsAPI.getAll({});
      const existingLeads = response.data || [];
      
      let duplicateByEmail = null;
      let duplicateByCompany = null;
      
      if (email && email.trim()) {
        duplicateByEmail = existingLeads.find(lead => 
          lead.clientEmail && 
          lead.clientEmail.toLowerCase().trim() === email.toLowerCase().trim() && 
          (!editingLead || lead._id !== editingLead._id)
        );
      }
      
      if (company && company.trim()) {
        duplicateByCompany = existingLeads.find(lead => 
          lead.company && 
          lead.company.toLowerCase().trim() === company.toLowerCase().trim() && 
          (!editingLead || lead._id !== editingLead._id)
        );
      }
      
      return { duplicateByEmail, duplicateByCompany };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      toast.error('Failed to check for duplicates');
      return { duplicateByEmail: null, duplicateByCompany: null };
    }
  };

  // Auto-tagging based on technology stack
  const autoTag = (techStack) => {
    const techTags = [];
    if (techStack.includes('MERN') || techStack.includes('MEAN') || techStack.includes('Full Stack')) {
      techTags.push('High-Tech');
    }
    if (techStack.includes('React Native') || techStack.includes('Flutter') || techStack.includes('iOS') || techStack.includes('Android')) {
      techTags.push('Mobile Development');
    }
    if (techStack.includes('WordPress') || techStack.includes('Shopify')) {
      techTags.push('CMS/E-commerce');
    }
    return techTags;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'leadStatus' && value !== 'Closed/Lost') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        lossReason: ''
      }));
      return;
    }
    
    if (name === 'clientEmail') {
      if (value && !validateEmail(value)) {
        setEmailError('Invalid email format');
      } else {
        setEmailError('');
      }
    }
    
    if (name === 'clientPhone') {
      if (value && !validatePhone(value)) {
        setPhoneError('Invalid phone format');
      } else {
        setPhoneError('');
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.leadSource || !formData.projectDescription || !formData.technologyStack) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.projectDescription.length < 10) {
      toast.error('Project description must be at least 10 characters');
      return;
    }

    if (formData.clientEmail && !validateEmail(formData.clientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.clientPhone && !validatePhone(formData.clientPhone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (formData.leadStatus === 'Closed/Lost' && !formData.lossReason) {
      toast.error('Please specify a reason for losing this lead');
      return;
    }

    if (formData.followUpDate) {
      const selectedDate = new Date(formData.followUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        toast.error('Follow-up date cannot be in the past');
        return;
      }
    }

    if (formData.clientEmail || formData.company) {
      setCheckingDuplicates(true);
      toast.loading('Checking for duplicates...', { id: 'dup-check' });
      
      const { duplicateByEmail, duplicateByCompany } = await checkDuplicateLead(formData.clientEmail, formData.company);
      
      toast.dismiss('dup-check');
      setCheckingDuplicates(false);
      
      if (duplicateByEmail) {
        const confirm = window.confirm(
          `⚠️ DUPLICATE DETECTED!\n\nA lead with email '${formData.clientEmail}' already exists:\n` +
          `Client: ${duplicateByEmail.clientName || 'N/A'}\n` +
          `Company: ${duplicateByCompany?.company || 'N/A'}\n` +
          `Status: ${duplicateByEmail.leadStatus}\n\n` +
          `Do you still want to create this lead?`
        );
        if (!confirm) {
          toast.error('Lead creation cancelled');
          return;
        }
      }
      
      if (duplicateByCompany && !duplicateByEmail) {
        const confirm = window.confirm(
          `⚠️ DUPLICATE DETECTED!\n\nA lead from company '${formData.company}' already exists:\n` +
          `Client: ${duplicateByCompany.clientName || 'N/A'}\n` +
          `Email: ${duplicateByCompany.clientEmail || 'N/A'}\n` +
          `Status: ${duplicateByCompany.leadStatus}\n\n` +
          `Do you still want to create this lead?`
        );
        if (!confirm) {
          toast.error('Lead creation cancelled');
          return;
        }
      }
    }

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        // Skip team and employee if they're empty strings
        if ((key === 'team' || key === 'employee') && !value) {
          return;
        }
        // Skip tags field as we'll use selectedTags instead
        if (key === 'tags') {
          return;
        }
        data.append(key, value);
      });
      const autoTags = autoTag(formData.technologyStack);
      const allTags = [...new Set([...selectedTags, ...autoTags])];
      
      if (allTags.length > 0) {
        data.append('tags', allTags.join(', '));
      }
      // Attach files
      for (let i = 0; i < attachments.length; i++) {
        if (attachments[i]) data.append('attachments', attachments[i]);
      }
      // Attach links (filter out empty)
      attachmentLinks.filter(l => l.trim()).forEach(link => {
        data.append('attachmentLinks', link);
      });

      if (editingLead) {
        await leadsAPI.update(editingLead._id, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Lead updated successfully');
      } else {
        await leadsAPI.create(data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Lead created successfully');
      }

      // Reset form
      setFormData({
        leadSource: '',
        projectDescription: '',
        technologyStack: '',
        leadStatus: 'New',
        notes: '',
        team: '',
        employee: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        company: '',
        priority: 'Medium',
        leadTemperature: 'Warm',
        expectedValue: 0,
        currency: 'USD',
        followUpDate: '',
        tags: '',
        lossReason: ''
      });
      setEmailError('');
      setPhoneError('');
      setSelectedTags([]);
      setAttachments([]);
      setAttachmentLinks(['']);
      setShowForm(false);
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error(error.response?.data?.message || 'Failed to save lead');
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      leadSource: lead.leadSource,
      projectDescription: lead.projectDescription,
      technologyStack: lead.technologyStack,
      leadStatus: lead.leadStatus,
      notes: (lead.notes && lead.notes.length > 0) ? lead.notes[lead.notes.length - 1].content : '',
      team: lead.team?._id || '',
      employee: lead.employee?._id || '',
      clientName: lead.clientName || '',
      clientEmail: lead.clientEmail || '',
      clientPhone: lead.clientPhone || '',
      company: lead.company || '',
      priority: lead.priority || 'Medium',
      leadTemperature: lead.leadTemperature || 'Warm',
      expectedValue: lead.expectedValue || 0,
      currency: lead.currency || 'USD',
      followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : '',
      tags: lead.tags ? lead.tags.join(', ') : '',
      lossReason: lead.lossReason || ''
    });
    setSelectedTags(lead.tags || []);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      await leadsAPI.delete(id);
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingLead(null);
    setSelectedTags([]);
    setEmailError('');
    setPhoneError('');
    setFormData({
      leadSource: '',
      projectDescription: '',
      technologyStack: '',
      leadStatus: 'New',
      notes: '',
      team: '',
      employee: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      company: '',
      priority: 'Medium',
      leadTemperature: 'Warm',
      expectedValue: 0,
      currency: 'USD',
      followUpDate: '',
      tags: '',
      lossReason: ''
    });
  };

  const handleStatusClick = (lead) => {
    setStatusEditId(lead._id);
    setStatusEditValue(lead.leadStatus);
  };

  const handleStatusChange = async (lead, newStatus) => {
    if (lead.leadStatus === newStatus) {
      setStatusEditId(null);
      return;
    }
    try {
      await leadsAPI.update(lead._id, { ...lead, leadStatus: newStatus });
      toast.success('Status updated');
      setStatusEditId(null);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Handle adding note
  const handleAddNote = async (leadId) => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }
    
    try {
      const response = await api.post(`/leads/${leadId}/notes`, { content: newNote });
      setDetailLead(response.data);
      setNewNote('');
      toast.success('Note added');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  // Handle adding comment
  const handleAddComment = async (leadId) => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    try {
      const response = await api.post(`/leads/${leadId}/comments`, { content: newComment });
      setDetailLead(response.data);
      setNewComment('');
      toast.success('Comment added');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  // Handle adding activity
  const handleAddActivity = async (leadId) => {
    if (!newActivity.description.trim()) {
      toast.error('Please enter activity description');
      return;
    }
    
    try {
      const response = await api.post(`/leads/${leadId}/activities`, newActivity);
      setDetailLead(response.data);
      setNewActivity({ type: 'call', description: '' });
      toast.success('Activity logged');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add activity');
    }
  };

  const isOverdue = (followUpDate, leadStatus) => {
    if (!followUpDate || leadStatus === 'Converted Lead' || leadStatus === 'Closed/Lost') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(followUpDate);
    followUp.setHours(0, 0, 0, 0);
    return followUp < today;
  };

  const renderLeadsTable = (leadsData) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client/Company
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Temperature
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expected Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Follow-up
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leadsData.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                No leads found
              </td>
            </tr>
          ) : (
            leadsData.map((lead) => (
              <tr key={lead._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{lead.clientName || 'N/A'}</div>
                  <div className="text-sm text-gray-500">{lead.company || lead.leadSource}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={lead.projectDescription}>
                    {lead.projectDescription}
                  </div>
                  <div className="text-xs text-gray-500">{lead.technologyStack}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    TEMPERATURE_COLORS[lead.leadTemperature] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.leadTemperature || 'Warm'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lead.currency || 'USD'} ${lead.expectedValue ? lead.expectedValue.toLocaleString() : '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {statusEditId === lead._id ? (
                    <select
                      className="px-2 py-1 border rounded"
                      value={statusEditValue}
                      onChange={e => setStatusEditValue(e.target.value)}
                      onBlur={() => handleStatusChange(lead, statusEditValue)}
                      autoFocus
                    >
                      {LEAD_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer ${STATUS_COLORS[lead.leadStatus]}`}
                      title="Click to change status"
                      onClick={() => handleStatusClick(lead)}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') handleStatusClick(lead); }}
                    >
                      {lead.leadStatus}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {lead.followUpDate ? (
                    <div className={`flex items-center gap-2 ${
                      isOverdue(lead.followUpDate, lead.leadStatus) ? 'text-red-600 font-semibold' : 'text-gray-500'
                    }`}>
                      {isOverdue(lead.followUpDate, lead.leadStatus) && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span>{new Date(lead.followUpDate).toLocaleDateString()}</span>
                      {isOverdue(lead.followUpDate, lead.leadStatus) && <span className="text-xs">(OVERDUE)</span>}
                    </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setDetailLead(lead)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    View
                  </button>
                  {lead.leadStatus !== 'Converted Lead' && (
                    <>
                      <button
                        onClick={() => handleEdit(lead)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(lead._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track and manage potential project leads efficiently
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('leads')}
            className={`${
              activeTab === 'leads'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Leads
          </button>
          <button
            onClick={() => setActiveTab('converted')}
            className={`${
              activeTab === 'converted'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Converted Leads
          </button>
        </nav>
      </div>

      {/* Filters and Add Button */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1 flex-wrap">
          <input
            type="text"
            placeholder="Search by client, company, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[250px]"
          />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterSource('');
              setFilterPriority('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Clear Filters
          </button>
        </div>
        {activeTab === 'leads' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {showForm ? 'Cancel' : '+ Add New Lead'}
          </button>
        )}
        {/* Converted Leads Details UI */}
        {activeTab === 'converted' && (
          <div>
            {convertedLeads.length === 0 ? (
              <div className="text-gray-500">No converted leads yet.</div>
            ) : null}
          </div>
        )}
     
      </div>

      {/* Lead Detail Modal - Available for all leads */}
      {detailLead && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl w-full relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setDetailLead(null)}
            >
              &times;
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Lead Details</h2>
            
            {/* Contact & Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-700">Contact Information</h3>
                <div className="space-y-2">
                  <div><b>Client:</b> {detailLead.clientName || 'N/A'}</div>
                  <div><b>Email:</b> {detailLead.clientEmail || 'N/A'}</div>
                  <div><b>Phone:</b> {detailLead.clientPhone || 'N/A'}</div>
                  <div><b>Company:</b> {detailLead.company || 'N/A'}</div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-700">Lead Information</h3>
                <div className="space-y-2">
                  <div><b>Priority:</b> <span className={`px-2 py-1 rounded text-sm ${
                    detailLead.priority === 'High' ? 'bg-red-100 text-red-800' :
                    detailLead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>{detailLead.priority}</span></div>
                  <div><b>Temperature:</b> <span className={`px-2 py-1 rounded text-sm ${
                    TEMPERATURE_COLORS[detailLead.leadTemperature] || 'bg-gray-100 text-gray-800'
                  }`}>{detailLead.leadTemperature || 'Warm'}</span></div>
                  <div><b>Expected Value:</b> {detailLead.currency || 'USD'} ${detailLead.expectedValue?.toLocaleString() || '0'}</div>
                  <div><b>Follow-up Date:</b> {detailLead.followUpDate ? (
                    <span className={isOverdue(detailLead.followUpDate, detailLead.leadStatus) ? 'text-red-600 font-semibold' : ''}>
                      {new Date(detailLead.followUpDate).toLocaleDateString()}
                      {isOverdue(detailLead.followUpDate, detailLead.leadStatus) && ' (OVERDUE)'}
                    </span>
                  ) : 'N/A'}</div>
                  <div><b>Status:</b> <span className={`px-2 py-1 rounded text-sm ${STATUS_COLORS[detailLead.leadStatus]}`}>{detailLead.leadStatus}</span></div>
                  {detailLead.leadStatus === 'Closed/Lost' && detailLead.lossReason && (
                    <div><b>Loss Reason:</b> <span className="text-red-600">{detailLead.lossReason}</span></div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Project Details */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-700">Project Details</h3>
              <div className="space-y-2">
                <div><b>Source:</b> {detailLead.leadSource}</div>
                <div><b>Technology:</b> {detailLead.technologyStack}</div>
                <div><b>Team:</b> {detailLead.team?.name || 'N/A'}</div>
                <div><b>Employee:</b> {detailLead.employee?.name || 'N/A'}</div>
                <div><b>Description:</b> <p className="mt-1 text-gray-700">{detailLead.projectDescription}</p></div>
                {detailLead.tags && detailLead.tags.length > 0 && (
                  <div><b>Tags:</b> {detailLead.tags.map((tag, idx) => (
                    <span key={idx} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2 mt-1">{tag}</span>
                  ))}</div>
                )}
              </div>
            </div>
            
            {/* Notes History */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-700">Notes History</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {detailLead.notes && detailLead.notes.length > 0 ? (
                  detailLead.notes.map((note, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <p className="text-gray-800">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {note.addedBy?.name || note.addedBy?.username || 'Unknown'} on {new Date(note.addedAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No notes yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                  rows="2"
                />
                <button
                  onClick={() => handleAddNote(detailLead._id)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Note
                </button>
              </div>
            </div>
            
            {/* Activity Log */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-700">Activity Log</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {detailLead.activityLog && detailLead.activityLog.length > 0 ? (
                  detailLead.activityLog.map((activity, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs uppercase">{activity.type}</span>
                        <p className="text-gray-800">{activity.description}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        By {activity.performedBy?.name || activity.performedBy?.username || 'Unknown'} on {new Date(activity.performedAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No activities logged</p>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  placeholder="Activity description..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={() => handleAddActivity(detailLead._id)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Log Activity
                </button>
              </div>
            </div>
            
            {/* Comments/Discussion */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-700">Comments & Discussion</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {detailLead.comments && detailLead.comments.length > 0 ? (
                  detailLead.comments.map((comment, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <p className="text-gray-800">{comment.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {comment.commentedBy?.name || comment.commentedBy?.username || 'Unknown'} on {new Date(comment.commentedAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No comments yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                  rows="2"
                />
                <button
                  onClick={() => handleAddComment(detailLead._id)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Comment
                </button>
              </div>
            </div>
            
            {/* Status History */}
            {detailLead.statusHistory && detailLead.statusHistory.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-700">Status Change History</h3>
                <div className="space-y-2">
                  {detailLead.statusHistory.map((history, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className={`px-2 py-1 rounded ${STATUS_COLORS[history.status]}`}>{history.status}</span>
                      <span className="text-gray-600">{new Date(history.changedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingLead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
            {/* Contact Information Section */}
            <div className="border-b pb-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    placeholder="Enter client name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Email
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    placeholder="client@example.com"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    placeholder="+1 234 567 8900"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      phoneError ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Company name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Lead Details Section */}
            <div className="border-b pb-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Lead Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Temperature
                  </label>
                  <select
                    name="leadTemperature"
                    value={formData.leadTemperature}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {LEAD_TEMPERATURE.map((temp) => (
                      <option key={temp} value={temp}>{temp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Value
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {CURRENCIES.map((curr) => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="expectedValue"
                      value={formData.expectedValue}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="0"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    name="followUpDate"
                    value={formData.followUpDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Cannot select past dates</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="relative" ref={tagDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowTagDropdown(!showTagDropdown)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left bg-white flex justify-between items-center"
                    >
                      <span className="text-gray-700">
                        {selectedTags.length > 0 ? `${selectedTags.length} employee(s) selected` : 'Select employees'}
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showTagDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {employees.map((emp) => {
                          const empName = emp.name || emp.username || emp.email;
                          return (
                            <label
                              key={emp._id}
                              className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(empName)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTags([...selectedTags, empName]);
                                  } else {
                                    setSelectedTags(selectedTags.filter(t => t !== empName));
                                  }
                                }}
                                className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{empName}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Project Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Source <span className="text-red-500">*</span>
                </label>
                <select
                  name="leadSource"
                  value={formData.leadSource}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a source</option>
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technology Stack <span className="text-red-500">*</span>
                </label>
                <select
                  name="technologyStack"
                  value={formData.technologyStack}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select tech stack</option>
                  {TECH_STACKS.map((tech) => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team (BDM)
                </label>
                <select
                  name="team"
                  value={formData.team}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                  disabled={editingLead ? true : false}
                >
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee (Lead Generator)
                </label>
                <select
                  name="employee"
                  value={formData.employee}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={editingLead ? true : false}
                >
                  <option value="">Select employee</option>
                  {bdmEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.name || emp.username || emp.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                required
                rows="4"
                placeholder="Describe the project in detail (minimum 10 characters)..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.projectDescription.length}/2000 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Status <span className="text-red-500">*</span>
              </label>
              <select
                name="leadStatus"
                value={formData.leadStatus}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {formData.leadStatus === 'Closed/Lost' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-red-700 mb-2">
                  Loss Reason <span className="text-red-500">*</span>
                </label>
                <select
                  name="lossReason"
                  value={formData.lossReason}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select a reason</option>
                  {LOSS_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-red-600">Please specify why this lead was lost</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Additional notes about this lead..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* File Uploads */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Images, PDFs)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={e => setAttachments(Array.from(e.target.files))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {attachments.length > 0 && (
                <ul className="mt-2 text-sm text-gray-600">
                  {attachments.map((file, idx) => (
                    <li key={idx}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Attachment Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachment Links (URLs)
              </label>
              {attachmentLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://example.com/file.pdf"
                    value={link}
                    onChange={e => {
                      const newLinks = [...attachmentLinks];
                      newLinks[idx] = e.target.value;
                      setAttachmentLinks(newLinks);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachmentLinks(attachmentLinks.filter((_, i) => i !== idx))}
                    className="px-2 py-1 bg-red-100 text-red-700 rounded"
                    disabled={attachmentLinks.length === 1}
                  >Remove</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAttachmentLinks([...attachmentLinks, ''])}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded"
              >+ Add Link</button>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={checkingDuplicates}
                className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  checkingDuplicates 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {checkingDuplicates && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {checkingDuplicates ? 'Checking...' : (editingLead ? 'Update Lead' : 'Create Lead')}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                disabled={checkingDuplicates}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading leads...</p>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-lg shadow-md">
          {activeTab === 'leads' ? renderLeadsTable(leads) : renderLeadsTable(convertedLeads)}
        </div>
      )}
    </div>
  );
}
