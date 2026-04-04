
'use client';
import api from '../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
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

const LEAD_STATUS_OPTIONS = ['Lead', 'Pending Lead', 'Converted Lead'];

const STATUS_COLORS = {
  'Lead': 'bg-blue-100 text-blue-800',
  'Pending Lead': 'bg-yellow-100 text-yellow-800',
  'Converted Lead': 'bg-green-100 text-green-800',
};


export default function LeadsPage() {
    const [detailLead, setDetailLead] = useState(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [convertedLeads, setConvertedLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('');
  // For inline status editing
  const [statusEditId, setStatusEditId] = useState(null);
  const [statusEditValue, setStatusEditValue] = useState('');
  // For team/employee selection
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    leadSource: '',
    projectDescription: '',
    technologyStack: '',
    leadStatus: 'Lead',
    notes: '',
    team: '',
    employee: '',
  });
  // File upload state
  const [attachments, setAttachments] = useState([]); // for files (images, pdfs)
  const [attachmentLinks, setAttachmentLinks] = useState(['']); // for links
  // Fetch only BDM team on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await teamsAPI.getAll();
        setTeams(res.data.data || []);
      } catch (e) {
        setTeams([]);
      }
    };
    fetchTeams();
  }, []);

  // Fetch only BDM department users for employee dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/users/bdm');
        const data = res.data?.data || [];
        
        setEmployees(data);
      } catch (e) {
        console.error('Error fetching BDM employees:', e); // Debug log
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, [formData.team]);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterSource) params.source = filterSource;

      // Fetch regular leads (not converted)
      const regularLeadsResponse = await leadsAPI.getAll({ 
        ...params, 
        status: activeTab === 'leads' ? undefined : 'Converted Lead' 
      });
      const leadsData = regularLeadsResponse.data;

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
                      {/* Button to open milestone/costing modal */}
                      {detailLead && detailLead.leadStatus === 'Converted Lead' && (
                        <button
                          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
                          onClick={() => setShowMilestoneModal(true)}
                        >
                          Edit Milestones & Costing
                        </button>
                      )}
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, filterSource]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
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
        leadStatus: 'Lead',
        notes: '',
        team: '',
        employee: '',
      });
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
      notes: lead.notes || ''
    });
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
    setFormData({
      leadSource: '',
      projectDescription: '',
      technologyStack: '',
      leadStatus: 'Lead',
      notes: ''
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

  const renderLeadsTable = (leadsData) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lead Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Technology Stack
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leadsData.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                No leads found
              </td>
            </tr>
          ) : (
            leadsData.map((lead) => (
              <tr key={lead._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{lead.leadSource}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={lead.projectDescription}>
                    {lead.projectDescription}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{lead.technologyStack}</div>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {lead.leadStatus === 'Converted Lead' ? (
                    <button
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      onClick={() => setDetailLead(lead)}
                    >
                      See Details
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(lead)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
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
        <div className="flex gap-4 flex-1">
          <input
            type="text"
            placeholder="Search project description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterSource('');
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
            ) : (
              <>
                {/* Details Modal/Section */}
                {detailLead && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full relative">
                      <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
                        onClick={() => setDetailLead(null)}
                      >
                        &times;
                      </button>
                      <h2 className="text-2xl font-bold mb-4">Lead Details</h2>
                      <div className="mb-2"><b>Project:</b> {detailLead.projectDescription}</div>
                      <div className="mb-2"><b>Source:</b> {detailLead.leadSource}</div>
                      <div className="mb-2"><b>Technology:</b> {detailLead.technologyStack}</div>
                      <div className="mb-2"><b>Status:</b> {detailLead.leadStatus}</div>
                      <div className="mb-2"><b>Team:</b> {detailLead.team?.name || 'N/A'}</div>
                      <div className="mb-2"><b>Employee:</b> {detailLead.employee?.name || 'N/A'}</div>
                      <div className="mb-2"><b>Notes:</b> {detailLead.notes || 'N/A'}</div>
                      <div className="mb-2"><b>Created:</b> {new Date(detailLead.createdAt).toLocaleString()}</div>
                      {/* Milestone/financials form removed as requested */}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
     
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingLead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled
                >
                  <option value="">Select team</option>
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
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
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
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                {editingLead ? 'Update Lead' : 'Create Lead'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
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
