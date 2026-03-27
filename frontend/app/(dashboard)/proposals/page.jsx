'use client';
import { useState, useEffect } from 'react';
import { proposalsAPI } from '../../../lib/api';
import { FILE_BASE } from '../../../lib/api';
import toast from 'react-hot-toast';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD'];
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700', viewed: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', expired: 'bg-orange-100 text-orange-700'
};

const DEFAULT_SECTIONS = [
  { title: 'Executive Summary', content: '', order: 0 },
  { title: 'Scope of Work', content: '', order: 1 },
  { title: 'Timeline', content: '', order: 2 },
  { title: 'Deliverables', content: '', order: 3 },
];

const TEMPLATE_LAYOUTS = [
  { id: 'modern', name: 'Modern', desc: 'Clean with gradient header' },
  { id: 'classic', name: 'Classic', desc: 'Traditional business style' },
  { id: 'minimal', name: 'Minimal', desc: 'Simple and elegant' },
  { id: 'bold', name: 'Bold', desc: 'Eye-catching with strong colors' },
];

const emptyProposal = {
  title: '', description: '',
  client: { name: '', email: '', company: '', address: '', phone: '' },
  company: { name: '', email: '', address: '', phone: '', website: '', logo: '' },
  sections: [...DEFAULT_SECTIONS],
  items: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
  currency: 'USD', taxRate: 0, discount: 0,
  validUntil: '', issueDate: new Date().toISOString().split('T')[0],
  notes: '', terms: '',
  backgroundColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#6366f1',
  headerBgColor: '#6366f1', headerTextColor: '#ffffff',
  watermarkText: '', watermarkOpacity: 0.06, showWatermark: false,
  template: null, status: 'draft'
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyProposal });
  const [templateForm, setTemplateForm] = useState({
    name: '', description: '', backgroundColor: '#ffffff', textColor: '#1a1a1a',
    accentColor: '#6366f1', headerBgColor: '#6366f1', headerTextColor: '#ffffff',
    fontFamily: 'Inter, sans-serif', watermarkText: '', watermarkOpacity: 0.06,
    showWatermark: false, layout: 'modern', isDefault: false
  });
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [activeTab, setActiveTab] = useState('proposals');
  const [previewMode, setPreviewMode] = useState(false);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([proposalsAPI.getAll({ status: filter || undefined, search: search || undefined }), proposalsAPI.getTemplates()]);
      setProposals(pRes.data.proposals || []);
      setTemplates(tRes.data || []);
    } catch (err) { toast.error('Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter, search]);

  // ── Item calculations ──
  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].amount = (parseFloat(items[index].quantity) || 0) * (parseFloat(items[index].unitPrice) || 0);
    }
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const subtotal = form.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  const taxAmount = (subtotal * (parseFloat(form.taxRate) || 0)) / 100;
  const total = subtotal + taxAmount - (parseFloat(form.discount) || 0);

  // ── Section management ──
  const updateSection = (index, field, value) => {
    const sections = [...form.sections];
    sections[index] = { ...sections[index], [field]: value };
    setForm({ ...form, sections });
  };
  const addSection = () => setForm({ ...form, sections: [...form.sections, { title: '', content: '', order: form.sections.length }] });
  const removeSection = (i) => setForm({ ...form, sections: form.sections.filter((_, idx) => idx !== i) });

  // ── Apply template ──
  const applyTemplate = (t) => {
    setForm({
      ...form,
      template: t._id,
      backgroundColor: t.backgroundColor,
      textColor: t.textColor,
      accentColor: t.accentColor,
      headerBgColor: t.headerBgColor,
      headerTextColor: t.headerTextColor,
      watermarkText: t.watermarkText,
      watermarkOpacity: t.watermarkOpacity,
      showWatermark: t.showWatermark,
    });
    toast.success(`Template "${t.name}" applied`);
  };

  // ── Logo upload ──
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await proposalsAPI.uploadLogo(file);
      setForm({ ...form, company: { ...form.company, logo: res.data.logoUrl } });
      toast.success('Logo uploaded');
    } catch { toast.error('Logo upload failed'); }
  };

  // ── Save proposal ──
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await proposalsAPI.update(editingId, form);
        toast.success('Proposal updated');
      } else {
        await proposalsAPI.create(form);
        toast.success('Proposal created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyProposal });
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  // ── Send proposal ──
  const handleSend = async (id) => {
    try {
      await proposalsAPI.send(id, {});
      toast.success('Proposal sent to client!');
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
  };

  // ── Delete proposal ──
  const handleDelete = async (id) => {
    if (!confirm('Delete this proposal?')) return;
    try {
      await proposalsAPI.remove(id);
      toast.success('Proposal deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  // ── Edit proposal ──
  const handleEdit = (p) => {
    setForm({
      title: p.title, description: p.description || '',
      client: p.client || { name: '', email: '', company: '', address: '', phone: '' },
      company: p.company || { name: '', email: '', address: '', phone: '', website: '', logo: '' },
      sections: p.sections?.length > 0 ? p.sections : [...DEFAULT_SECTIONS],
      items: p.items?.length > 0 ? p.items : [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
      currency: p.currency || 'USD', taxRate: p.taxRate || 0, discount: p.discount || 0,
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString().split('T')[0] : '',
      issueDate: p.issueDate ? new Date(p.issueDate).toISOString().split('T')[0] : '',
      notes: p.notes || '', terms: p.terms || '',
      backgroundColor: p.backgroundColor || '#ffffff', textColor: p.textColor || '#1a1a1a',
      accentColor: p.accentColor || '#6366f1', headerBgColor: p.headerBgColor || '#6366f1',
      headerTextColor: p.headerTextColor || '#ffffff', watermarkText: p.watermarkText || '',
      watermarkOpacity: p.watermarkOpacity || 0.06, showWatermark: p.showWatermark || false,
      template: p.template?._id || null, status: p.status || 'draft'
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  // ── Template CRUD ──
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplateId) {
        await proposalsAPI.updateTemplate(editingTemplateId, templateForm);
        toast.success('Template updated');
      } else {
        await proposalsAPI.createTemplate(templateForm);
        toast.success('Template created');
      }
      setShowTemplateForm(false);
      setEditingTemplateId(null);
      setTemplateForm({ name: '', description: '', backgroundColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#6366f1', headerBgColor: '#6366f1', headerTextColor: '#ffffff', fontFamily: 'Inter, sans-serif', watermarkText: '', watermarkOpacity: 0.06, showWatermark: false, layout: 'modern', isDefault: false });
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save template'); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try { await proposalsAPI.deleteTemplate(id); toast.success('Deleted'); loadData(); } catch { toast.error('Failed to delete'); }
  };

  // ── Proposal Preview ──
  const ProposalPreview = ({ data }) => {
    const bg = data.backgroundColor || '#ffffff';
    const text = data.textColor || '#1a1a1a';
    const accent = data.accentColor || '#6366f1';
    const headerBg = data.headerBgColor || accent;
    const headerText = data.headerTextColor || '#ffffff';
    return (
      <div className="border rounded-xl overflow-hidden shadow-lg max-w-3xl mx-auto" style={{ background: bg, color: text, position: 'relative' }}>
        {data.showWatermark && data.watermarkText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ transform: 'rotate(-45deg)', fontSize: '5rem', fontWeight: 'bold', color: accent, opacity: data.watermarkOpacity || 0.06 }}>
            {data.watermarkText}
          </div>
        )}
        <div className="relative z-10" style={{ background: headerBg, color: headerText, padding: '2rem' }}>
          {data.company?.logo && <img src={`${FILE_BASE}${data.company.logo}`} alt="Logo" className="h-12 mb-3" />}
          <h2 className="text-2xl font-bold">{data.title || 'Proposal Title'}</h2>
          <p className="opacity-80 mt-1">{data.issueDate ? new Date(data.issueDate).toLocaleDateString() : ''}</p>
        </div>
        <div className="relative z-10 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-bold uppercase mb-1" style={{ color: accent }}>From</h4>
              <p className="font-semibold">{data.company?.name}</p>
              <p className="text-sm opacity-70">{data.company?.email}</p>
            </div>
            <div className="text-right">
              <h4 className="text-sm font-bold uppercase mb-1" style={{ color: accent }}>To</h4>
              <p className="font-semibold">{data.client?.name}</p>
              <p className="text-sm opacity-70">{data.client?.company}</p>
              <p className="text-sm opacity-70">{data.client?.email}</p>
            </div>
          </div>
          {data.description && <p className="leading-relaxed">{data.description}</p>}
          {data.sections?.filter(s => s.title).map((s, i) => (
            <div key={i}>
              <h3 className="font-bold text-lg mb-2" style={{ color: accent }}>{s.title}</h3>
              <p className="leading-relaxed whitespace-pre-wrap">{s.content}</p>
            </div>
          ))}
          {data.items?.length > 0 && data.items[0].description && (
            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: accent }}>Pricing</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: accent, color: '#fff' }}>
                    <th className="p-2 text-left rounded-tl">Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right rounded-tr">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.filter(it => it.description).map((it, i) => (
                    <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-right">{data.currency} {(parseFloat(it.unitPrice) || 0).toFixed(2)}</td>
                      <td className="p-2 text-right font-medium">{data.currency} {(parseFloat(it.amount) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="3" className="p-2 text-right font-medium">Subtotal</td><td className="p-2 text-right font-bold">{data.currency} {subtotal.toFixed(2)}</td></tr>
                  {(parseFloat(data.taxRate) || 0) > 0 && <tr><td colSpan="3" className="p-2 text-right">Tax ({data.taxRate}%)</td><td className="p-2 text-right">{data.currency} {taxAmount.toFixed(2)}</td></tr>}
                  {(parseFloat(data.discount) || 0) > 0 && <tr><td colSpan="3" className="p-2 text-right">Discount</td><td className="p-2 text-right text-red-500">-{data.currency} {parseFloat(data.discount).toFixed(2)}</td></tr>}
                  <tr style={{ background: '#f9fafb' }}><td colSpan="3" className="p-3 text-right font-bold text-lg">Total</td><td className="p-3 text-right font-bold text-lg" style={{ color: accent }}>{data.currency} {total.toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </div>
          )}
          {data.validUntil && <p className="text-sm opacity-60">Valid until: {new Date(data.validUntil).toLocaleDateString()}</p>}
          {data.terms && <div className="border-t pt-4"><h4 className="font-bold mb-1" style={{ color: accent }}>Terms & Conditions</h4><p className="text-sm opacity-70 whitespace-pre-wrap">{data.terms}</p></div>}
          {data.notes && <div><h4 className="font-bold mb-1" style={{ color: accent }}>Notes</h4><p className="text-sm opacity-70 whitespace-pre-wrap">{data.notes}</p></div>}
        </div>
        <div className="relative z-10 text-center py-4 text-sm" style={{ background: headerBg, color: headerText }}>
          {data.company?.name} {data.company?.website ? `| ${data.company.website}` : ''}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-0 md:p-6 max-w-8xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage client proposals with custom templates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('proposals')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'proposals' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Proposals</button>
          <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'templates' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Templates</button>
        </div>
      </div>

      {/* ════════════ PROPOSALS TAB ════════════ */}
      {activeTab === 'proposals' && !showForm && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input type="text" placeholder="Search proposals..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button onClick={() => { setForm({ ...emptyProposal }); setEditingId(null); setShowForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap">+ New Proposal</button>
          </div>

          {proposals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-700">No proposals yet</h3>
              <p className="text-gray-500 mt-1">Create your first proposal to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {proposals.map(p => (
                <div key={p._id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      </div>
                      <p className="text-sm text-gray-500">{p.proposalNumber} • {p.client?.name} {p.client?.company ? `(${p.client.company})` : ''}</p>
                      <p className="text-sm text-gray-400 mt-1">{p.currency} {(p.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} • {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleEdit(p)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Edit</button>
                      {p.status === 'draft' && <button onClick={() => handleSend(p._id)} className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Send</button>}
                      <button onClick={() => handleDelete(p._id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ PROPOSAL FORM ════════════ */}
      {activeTab === 'proposals' && showForm && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Proposal' : 'New Proposal'}</h2>
            <div className="flex gap-2">
              <button onClick={() => setPreviewMode(!previewMode)} className={`px-4 py-2 rounded-lg text-sm font-medium ${previewMode ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); setPreviewMode(false); }} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
            </div>
          </div>

          {previewMode ? (
            <ProposalPreview data={form} />
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Template selection */}
              {templates.length > 0 && (
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-sm text-gray-700 mb-3">Apply Template</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {templates.map(t => (
                      <button key={t._id} type="button" onClick={() => applyTemplate(t)}
                        className={`flex-shrink-0 p-3 rounded-lg border-2 text-left text-sm transition min-w-[140px] ${form.template === t._id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 rounded-full" style={{ background: t.accentColor }} />
                          <span className="font-medium">{t.name}</span>
                        </div>
                        <p className="text-xs text-gray-500">{t.layout}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic info */}
              <div className="bg-white rounded-xl border p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Proposal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g., Website Redesign Proposal" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Brief overview of this proposal..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                    <input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                    <input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              {/* Client + Company */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5 space-y-3">
                  <h3 className="font-semibold text-gray-800">Client Details</h3>
                  <input type="text" required placeholder="Client Name *" value={form.client.name} onChange={e => setForm({ ...form, client: { ...form.client, name: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <input type="email" required placeholder="Client Email *" value={form.client.email} onChange={e => setForm({ ...form, client: { ...form.client, email: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="Company" value={form.client.company} onChange={e => setForm({ ...form, client: { ...form.client, company: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="Phone" value={form.client.phone} onChange={e => setForm({ ...form, client: { ...form.client, phone: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <textarea rows={2} placeholder="Address" value={form.client.address} onChange={e => setForm({ ...form, client: { ...form.client, address: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="bg-white rounded-xl border p-5 space-y-3">
                  <h3 className="font-semibold text-gray-800">Your Company</h3>
                  <input type="text" placeholder="Company Name" value={form.company.name} onChange={e => setForm({ ...form, company: { ...form.company, name: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <input type="email" placeholder="Company Email" value={form.company.email} onChange={e => setForm({ ...form, company: { ...form.company, email: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="Phone" value={form.company.phone} onChange={e => setForm({ ...form, company: { ...form.company, phone: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="Website" value={form.company.website} onChange={e => setForm({ ...form, company: { ...form.company, website: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                    {form.company.logo && <img src={`${FILE_BASE}${form.company.logo}`} alt="Logo" className="h-10 mb-2 rounded" />}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
                  </div>
                </div>
              </div>

              {/* Styling */}
              <div className="bg-white rounded-xl border p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Styling & Branding</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Background</label>
                    <input type="color" value={form.backgroundColor} onChange={e => setForm({ ...form, backgroundColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
                    <input type="color" value={form.textColor} onChange={e => setForm({ ...form, textColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accent Color</label>
                    <input type="color" value={form.accentColor} onChange={e => setForm({ ...form, accentColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Header BG</label>
                    <input type="color" value={form.headerBgColor} onChange={e => setForm({ ...form, headerBgColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Header Text</label>
                    <input type="color" value={form.headerTextColor} onChange={e => setForm({ ...form, headerTextColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.showWatermark} onChange={e => setForm({ ...form, showWatermark: e.target.checked })} className="rounded" />
                      Show Watermark
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Watermark Text</label>
                    <input type="text" value={form.watermarkText} onChange={e => setForm({ ...form, watermarkText: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g., CONFIDENTIAL" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Watermark Opacity ({Math.round(form.watermarkOpacity * 100)}%)</label>
                    <input type="range" min="0.01" max="0.3" step="0.01" value={form.watermarkOpacity} onChange={e => setForm({ ...form, watermarkOpacity: parseFloat(e.target.value) })} className="w-full" />
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="bg-white rounded-xl border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Sections</h3>
                  <button type="button" onClick={addSection} className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">+ Add Section</button>
                </div>
                {form.sections.map((s, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" value={s.title} onChange={e => updateSection(i, 'title', e.target.value)} placeholder="Section Title" className="flex-1 px-3 py-2 border rounded-lg text-sm font-medium" />
                      <button type="button" onClick={() => removeSection(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">✕</button>
                    </div>
                    <textarea rows={3} value={s.content} onChange={e => updateSection(i, 'content', e.target.value)} placeholder="Section content..." className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                ))}
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-xl border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Pricing</h3>
                  <button type="button" onClick={addItem} className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description" className="col-span-5 px-3 py-2 border rounded-lg text-sm" />
                      <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0" step="1" className="col-span-2 px-3 py-2 border rounded-lg text-sm text-center" />
                      <input type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} min="0" step="0.01" className="col-span-2 px-3 py-2 border rounded-lg text-sm text-right" />
                      <div className="col-span-2 text-right text-sm font-medium text-gray-700">{form.currency} {(parseFloat(item.amount) || 0).toFixed(2)}</div>
                      <button type="button" onClick={() => removeItem(i)} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg text-sm text-center">✕</button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                    <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                    <input type="number" min="0" max="100" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discount</label>
                    <input type="number" min="0" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div className="text-right space-y-1 text-sm">
                  <p>Subtotal: <span className="font-medium">{form.currency} {subtotal.toFixed(2)}</span></p>
                  {(parseFloat(form.taxRate) || 0) > 0 && <p>Tax ({form.taxRate}%): <span className="font-medium">{form.currency} {taxAmount.toFixed(2)}</span></p>}
                  {(parseFloat(form.discount) || 0) > 0 && <p>Discount: <span className="font-medium text-red-500">-{form.currency} {parseFloat(form.discount).toFixed(2)}</span></p>}
                  <p className="text-lg font-bold" style={{ color: form.accentColor }}>Total: {form.currency} {total.toFixed(2)}</p>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                  <textarea rows={4} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea rows={4} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-2.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  {editingId ? 'Update Proposal' : 'Create Proposal'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ════════════ TEMPLATES TAB ════════════ */}
      {activeTab === 'templates' && !showTemplateForm && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Templates define the visual style for proposals</p>
            <button onClick={() => { setTemplateForm({ name: '', description: '', backgroundColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#6366f1', headerBgColor: '#6366f1', headerTextColor: '#ffffff', fontFamily: 'Inter, sans-serif', watermarkText: '', watermarkOpacity: 0.06, showWatermark: false, layout: 'modern', isDefault: false }); setEditingTemplateId(null); setShowTemplateForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Template</button>
          </div>
          {templates.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-lg font-semibold text-gray-700">No templates yet</h3>
              <p className="text-gray-500 mt-1">Create a template to style your proposals</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => (
                <div key={t._id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
                  <div className="h-20 flex items-center justify-center text-white font-bold text-lg" style={{ background: t.headerBgColor, color: t.headerTextColor }}>
                    {t.name}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full border" style={{ background: t.accentColor }} />
                      <div className="w-5 h-5 rounded-full border" style={{ background: t.backgroundColor }} />
                      <div className="w-5 h-5 rounded-full border" style={{ background: t.textColor }} />
                      <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">{t.layout}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{t.description || 'No description'}</p>
                    {t.showWatermark && t.watermarkText && <p className="text-xs text-gray-400 mb-2">Watermark: "{t.watermarkText}"</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setTemplateForm(t); setEditingTemplateId(t._id); setShowTemplateForm(true); }} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex-1">Edit</button>
                      <button onClick={() => handleDeleteTemplate(t._id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ TEMPLATE FORM ════════════ */}
      {activeTab === 'templates' && showTemplateForm && (
        <form onSubmit={handleSaveTemplate} className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">{editingTemplateId ? 'Edit Template' : 'New Template'}</h2>
            <button type="button" onClick={() => { setShowTemplateForm(false); setEditingTemplateId(null); }} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
          </div>
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input type="text" required value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                <select value={templateForm.layout} onChange={e => setTemplateForm({ ...templateForm, layout: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {TEMPLATE_LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.name} - {l.desc}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <h4 className="font-medium text-gray-700">Colors</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div><label className="block text-xs text-gray-600 mb-1">Background</label><input type="color" value={templateForm.backgroundColor} onChange={e => setTemplateForm({ ...templateForm, backgroundColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Text</label><input type="color" value={templateForm.textColor} onChange={e => setTemplateForm({ ...templateForm, textColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Accent</label><input type="color" value={templateForm.accentColor} onChange={e => setTemplateForm({ ...templateForm, accentColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Header BG</label><input type="color" value={templateForm.headerBgColor} onChange={e => setTemplateForm({ ...templateForm, headerBgColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Header Text</label><input type="color" value={templateForm.headerTextColor} onChange={e => setTemplateForm({ ...templateForm, headerTextColor: e.target.value })} className="w-full h-10 rounded cursor-pointer" /></div>
            </div>
            <h4 className="font-medium text-gray-700">Watermark</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={templateForm.showWatermark} onChange={e => setTemplateForm({ ...templateForm, showWatermark: e.target.checked })} className="rounded" /> Enable Watermark</label>
              <div><label className="block text-xs text-gray-600 mb-1">Text</label><input type="text" value={templateForm.watermarkText} onChange={e => setTemplateForm({ ...templateForm, watermarkText: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="DRAFT" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Opacity ({Math.round(templateForm.watermarkOpacity * 100)}%)</label><input type="range" min="0.01" max="0.3" step="0.01" value={templateForm.watermarkOpacity} onChange={e => setTemplateForm({ ...templateForm, watermarkOpacity: parseFloat(e.target.value) })} className="w-full" /></div>
            </div>

            {/* Preview */}
            <h4 className="font-medium text-gray-700">Preview</h4>
            <div className="rounded-lg overflow-hidden border shadow-sm" style={{ background: templateForm.backgroundColor, position: 'relative' }}>
              {templateForm.showWatermark && templateForm.watermarkText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'rotate(-45deg)', fontSize: '3rem', fontWeight: 'bold', color: templateForm.accentColor, opacity: templateForm.watermarkOpacity }}>
                  {templateForm.watermarkText}
                </div>
              )}
              <div className="p-4 relative z-10" style={{ background: templateForm.headerBgColor, color: templateForm.headerTextColor }}>
                <h3 className="font-bold text-lg">Proposal Title</h3>
                <p className="text-sm opacity-80">PROP-2026-0001</p>
              </div>
              <div className="p-4 relative z-10 space-y-2" style={{ color: templateForm.textColor }}>
                <h4 className="font-bold" style={{ color: templateForm.accentColor }}>Section Heading</h4>
                <p className="text-sm">This is how the body text will look with your chosen colors and styling options.</p>
                <div className="h-8 rounded mt-2 flex items-center justify-center text-white text-sm font-medium" style={{ background: templateForm.accentColor }}>Accent Button</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowTemplateForm(false); setEditingTemplateId(null); }} className="px-6 py-2.5 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{editingTemplateId ? 'Update Template' : 'Create Template'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
