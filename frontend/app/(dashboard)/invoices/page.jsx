'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { invoicesAPI, FILE_BASE } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

/* ── Helpers ─────────────────────────────────────── */
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD', 'SGD'];

const fmt = (n, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const today = () => new Date().toISOString().split('T')[0];

const STATUS_STYLES = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
};

const EMPTY_ITEM = { description: '', quantity: 1, unitPrice: 0, amount: 0 };

const EMPTY_FORM = {
  client: { name: '', email: '', company: '', address: '', phone: '' },
  company: { name: '', email: '', address: '', phone: '', website: '', logo: '' },
  items: [{ ...EMPTY_ITEM }],
  taxRate: 0,
  discount: 0,
  currency: 'USD',
  issueDate: today(),
  dueDate: '',
  notes: '',
  terms: 'Payment due within 30 days of invoice date.',
  status: 'draft',
};

/* ── Invoice Form Modal ────────────────────────────────────────────────── */
function InvoiceFormModal({ invoice, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    invoice
      ? {
          ...invoice,
          issueDate: invoice.issueDate ? invoice.issueDate.split('T')[0] : today(),
          dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
          items: invoice.items?.length ? invoice.items : [{ ...EMPTY_ITEM }],
        }
      : { ...EMPTY_FORM, company: { name: '', email: '', address: '', phone: '', website: '', logo: '' } }
  );
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const res = await invoicesAPI.uploadLogo(file);
      setCompany('logo', res.data.data.logo);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  /* recalc line totals */
  const updateItem = (idx, field, value) => {
    const items = form.items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.amount = Math.round(parseFloat(updated.quantity || 0) * parseFloat(updated.unitPrice || 0) * 100) / 100;
      return updated;
    });
    setForm((f) => ({ ...f, items }));
  };

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));

  const removeItem = (idx) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const taxAmount = Math.round(subtotal * (parseFloat(form.taxRate) || 0) / 100 * 100) / 100;
  const total = Math.max(0, subtotal + taxAmount - (parseFloat(form.discount) || 0));

  const setClient = (field, val) =>
    setForm((f) => ({ ...f, client: { ...f.client, [field]: val } }));

  const setCompany = (field, val) =>
    setForm((f) => ({ ...f, company: { ...f.company, [field]: val } }));

  const handleSubmit = async () => {
    if (!form.client.name.trim() || !form.client.email.trim()) {
      toast.error('Client name and email are required');
      return;
    }
    if (!form.items.length || form.items.every((i) => !i.description.trim())) {
      toast.error('At least one line item is required');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      if (invoice) {
        await invoicesAPI.update(invoice._id, payload);
        toast.success('Invoice updated');
      } else {
        await invoicesAPI.create(payload);
        toast.success('Invoice created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {invoice ? `Edit ${invoice.invoiceNumber}` : 'Create New Invoice'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* ── Row 1: Client + Company ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Client */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bill To (Client)</h3>
              <input className="input text-sm" placeholder="Client Name *" value={form.client.name}
                onChange={(e) => setClient('name', e.target.value)} />
              <input className="input text-sm" placeholder="Client Email *" type="email" value={form.client.email}
                onChange={(e) => setClient('email', e.target.value)} />
              <input className="input text-sm" placeholder="Company (optional)" value={form.client.company}
                onChange={(e) => setClient('company', e.target.value)} />
              <input className="input text-sm" placeholder="Phone" value={form.client.phone}
                onChange={(e) => setClient('phone', e.target.value)} />
              <textarea className="input text-sm resize-none" rows={2} placeholder="Address"
                value={form.client.address} onChange={(e) => setClient('address', e.target.value)} />
            </div>

            {/* Company / From */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">From (Your Company)</h3>
              <input className="input text-sm" placeholder="Company Name" value={form.company.name}
                onChange={(e) => setCompany('name', e.target.value)} />
              <input className="input text-sm" placeholder="Company Email" value={form.company.email}
                onChange={(e) => setCompany('email', e.target.value)} />
              <input className="input text-sm" placeholder="Phone" value={form.company.phone}
                onChange={(e) => setCompany('phone', e.target.value)} />
              <input className="input text-sm" placeholder="Website" value={form.company.website}
                onChange={(e) => setCompany('website', e.target.value)} />
              {/* Logo upload */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company Logo</label>
                <div className="flex items-center gap-3">
                  {form.company.logo && (
                    <img src={`${FILE_BASE}/uploads/${form.company.logo}`} alt="Logo"
                      className="h-10 w-auto max-w-[100px] object-contain rounded border border-gray-200" />
                  )}
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50">
                    {logoUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {logoUploading ? 'Uploading…' : form.company.logo ? 'Change' : 'Upload Logo'}
                  </button>
                  {form.company.logo && (
                    <button type="button" onClick={() => setCompany('logo', '')}
                      className="text-xs text-red-500 hover:text-red-700 transition">× Remove</button>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden" onChange={handleLogoUpload} />
              </div>
              <textarea className="input text-sm resize-none" rows={2} placeholder="Address"
                value={form.company.address} onChange={(e) => setCompany('address', e.target.value)} />
            </div>
          </div>

          {/* ── Row 2: Dates + Settings ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Issue Date</label>
              <input type="date" className="input text-sm" value={form.issueDate}
                onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
              <input type="date" className="input text-sm" value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <select className="input text-sm" value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select className="input text-sm" value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {['draft','sent','paid','overdue','cancelled'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Line Items ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Line Items</h3>
              <button onClick={addItem}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-12 gap-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1" />
              </div>

              {form.items.map((item, idx) => (
                <div key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 items-center">
                    <div className="col-span-5">
                      <input className="w-full border-0 bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5"
                        placeholder="Description…" value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01"
                        className="w-full border-0 bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 text-center"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01"
                        className="w-full border-0 bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 text-right"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-gray-700">
                      {fmt(item.amount, form.currency)}
                    </div>
                    <div className="col-span-1 text-right">
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-500 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Mobile card */}
                  <div className="sm:hidden px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input className="flex-1 border-0 bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5"
                        placeholder="Description…" value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400 uppercase">Qty</label>
                        <input type="number" min="0" step="0.01"
                          className="w-full border border-gray-200 bg-white text-sm text-gray-800 rounded px-2 py-1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400 uppercase">Price</label>
                        <input type="number" min="0" step="0.01"
                          className="w-full border border-gray-200 bg-white text-sm text-gray-800 rounded px-2 py-1"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                      </div>
                      <div className="flex-1 text-right">
                        <label className="text-[10px] text-gray-400 uppercase">Amount</label>
                        <p className="text-sm font-semibold text-gray-700 py-1">{fmt(item.amount, form.currency)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Totals ── */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{fmt(subtotal, form.currency)}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-1">Tax (%)</label>
                <input type="number" min="0" max="100" step="0.1"
                  className="w-20 input text-sm text-right py-1"
                  value={form.taxRate}
                  onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))} />
                <span className="text-sm font-medium text-gray-700 w-24 text-right">{fmt(taxAmount, form.currency)}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-1">Discount ({form.currency})</label>
                <input type="number" min="0" step="0.01"
                  className="w-20 input text-sm text-right py-1"
                  value={form.discount}
                  onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
                <span className="text-sm font-medium text-red-600 w-24 text-right">
                  {form.discount > 0 ? `-${fmt(form.discount, form.currency)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-800">Total</span>
                <span className="text-indigo-600">{fmt(total, form.currency)}</span>
              </div>
            </div>
          </div>

          {/* ── Notes / Terms ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</label>
              <textarea className="input text-sm resize-none w-full" rows={3}
                placeholder="Thank you for your business…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Terms &amp; Conditions</label>
              <textarea className="input text-sm resize-none w-full" rows={3}
                placeholder="Payment due within 30 days…"
                value={form.terms}
                onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60">
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {invoice ? 'Save Changes' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Invoice Preview Modal ─────────────────────────────────────────────── */
function InvoicePreviewModal({ invoice, onClose, onEdit, onSend }) {
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState(invoice.client.email || '');
  const [showSendInput, setShowSendInput] = useState(false);
  const printRef = useRef(null);

  const handlePrint = () => {
    const cur = invoice.currency || 'USD';
    const f = (n) => new Intl.NumberFormat('en-US', { style:'currency', currency: cur, minimumFractionDigits:2 }).format(n ?? 0);
    const d = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';

    const logoUrl = invoice.company?.logo ? `${FILE_BASE}/uploads/${invoice.company.logo}` : '';

    const itemRows = (invoice.items || []).map(item => `
      <tr>
        <td style="padding:10px 20px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px;">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-size:13px;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;font-size:13px;">${f(item.unitPrice)}</td>
        <td style="padding:10px 20px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:600;font-size:13px;">${f(item.amount)}</td>
      </tr>`).join('');

    let totalsHtml = `<tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;color:#6b7280;font-size:13px;">Subtotal</td>
      <td style="padding:6px 20px;text-align:right;color:#374151;font-weight:600;font-size:13px;">${f(invoice.subtotal)}</td>
    </tr>`;
    if (invoice.taxRate > 0) totalsHtml += `<tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;color:#6b7280;font-size:13px;">Tax (${invoice.taxRate}%)</td>
      <td style="padding:6px 20px;text-align:right;color:#374151;font-weight:600;font-size:13px;">${f(invoice.taxAmount)}</td>
    </tr>`;
    if (invoice.discount > 0) totalsHtml += `<tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;color:#6b7280;font-size:13px;">Discount</td>
      <td style="padding:6px 20px;text-align:right;color:#ef4444;font-weight:600;font-size:13px;">-${f(invoice.discount)}</td>
    </tr>`;
    totalsHtml += `<tr style="background:#f9fafb;">
      <td colspan="3" style="padding:12px 12px;text-align:right;color:#111827;font-weight:700;font-size:15px;">Total</td>
      <td style="padding:12px 20px;text-align:right;color:#4f46e5;font-weight:800;font-size:20px;">${f(invoice.total)}</td>
    </tr>`;

    const notesTermsHtml = (invoice.notes || invoice.terms) ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e5e7eb;">
      <tr>
        ${invoice.notes ? `<td style="padding:20px;vertical-align:top;${invoice.terms ? 'border-right:1px solid #e5e7eb;width:50%;' : ''}">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Notes</p>
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">${invoice.notes}</p>
        </td>` : ''}
        ${invoice.terms ? `<td style="padding:20px;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Terms &amp; Conditions</p>
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">${invoice.terms}</p>
        </td>` : ''}
      </tr>
    </table>` : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoice.invoiceNumber}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#111827;}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{margin:0.4in;}}
    </style></head><body>
    <div style="max-width:700px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
          <td style="vertical-align:middle;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:48px;max-width:160px;margin-bottom:8px;border-radius:6px;" />` : ''}
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">INVOICE</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">${invoice.invoiceNumber}</p>
          </td>
          <td style="vertical-align:top;text-align:right;">
            <p style="margin:0;color:#fff;font-weight:700;font-size:15px;">${invoice.company?.name || 'Your Company'}</p>
            ${invoice.company?.email ? `<p style="margin:2px 0;color:rgba(255,255,255,0.8);font-size:12px;">${invoice.company.email}</p>` : ''}
            ${invoice.company?.phone ? `<p style="margin:2px 0;color:rgba(255,255,255,0.8);font-size:12px;">${invoice.company.phone}</p>` : ''}
            ${invoice.company?.website ? `<p style="margin:2px 0;color:rgba(255,255,255,0.8);font-size:12px;">${invoice.company.website}</p>` : ''}
            ${invoice.company?.address ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;line-height:1.4;">${invoice.company.address}</p>` : ''}
          </td>
        </tr></table>
      </div>

      <!-- Info -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-bottom:1px solid #e5e7eb;">
        <tr>
          <td style="width:50%;padding:20px 28px;vertical-align:top;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Billed To</p>
            <p style="margin:0;font-weight:700;color:#111827;font-size:14px;">${invoice.client.name}</p>
            ${invoice.client.company ? `<p style="margin:2px 0;color:#6b7280;font-size:12px;">${invoice.client.company}</p>` : ''}
            <p style="margin:2px 0;color:#6b7280;font-size:12px;">${invoice.client.email}</p>
            ${invoice.client.phone ? `<p style="margin:2px 0;color:#6b7280;font-size:12px;">${invoice.client.phone}</p>` : ''}
            ${invoice.client.address ? `<p style="margin:4px 0 0;color:#9ca3af;font-size:11px;line-height:1.4;">${invoice.client.address}</p>` : ''}
          </td>
          <td style="width:50%;padding:20px 28px;vertical-align:top;">
            <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding-bottom:10px;padding-right:20px;">
                  <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Issue Date</p>
                  <p style="margin:3px 0 0;color:#111827;font-weight:600;font-size:13px;">${d(invoice.issueDate)}</p>
                </td>
                <td style="padding-bottom:10px;">
                  <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Due Date</p>
                  <p style="margin:3px 0 0;color:#111827;font-weight:600;font-size:13px;">${d(invoice.dueDate)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding-right:20px;">
                  <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Status</p>
                  <span style="display:inline-block;margin-top:3px;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;background:#dbeafe;color:#1d4ed8;text-transform:capitalize;">${invoice.status}</span>
                </td>
                <td>
                  <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Currency</p>
                  <p style="margin:3px 0 0;color:#111827;font-weight:600;font-size:13px;">${invoice.currency}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Items -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
            <th style="text-align:left;padding:10px 20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Description</th>
            <th style="text-align:center;padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;width:60px;">Qty</th>
            <th style="text-align:right;padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;width:100px;">Unit Price</th>
            <th style="text-align:right;padding:10px 20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;width:100px;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>${totalsHtml}</tfoot>
      </table>

      ${notesTermsHtml}

      <!-- Footer -->
      <div style="background:#f9fafb;padding:14px 20px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">Thank you for your business!</p>
        ${invoice.sentAt ? `<p style="margin:3px 0 0;font-size:11px;color:#9ca3af;">Sent to ${invoice.sentTo} on ${d(invoice.sentAt)}</p>` : ''}
      </div>
    </div>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  const handleSend = async () => {
    if (!sendEmail.trim()) { toast.error('Enter recipient email'); return; }
    setSending(true);
    try {
      const res = await invoicesAPI.send(invoice._id, { email: sendEmail });
      toast.success(res.data.message || 'Invoice sent!');
      setShowSendInput(false);
      onSend();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const currency = invoice.currency || 'USD';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="w-full max-w-3xl my-auto">
        {/* Action bar */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <button onClick={onClose} className="p-2 bg-white rounded-lg text-gray-600 hover:bg-gray-100 shadow transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-semibold flex-1 text-sm sm:text-base truncate">{invoice.invoiceNumber}</span>
          <button onClick={onEdit}
            className="flex items-center gap-1.5 bg-white text-gray-700 text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white text-gray-700 text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
          <button onClick={() => setShowSendInput((p) => !p)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Send to Client</span>
          </button>
        </div>

        {/* Send email input */}
        {showSendInput && (
          <div className="flex gap-2 mb-4 items-center bg-white rounded-xl p-3 shadow">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <input type="email" className="flex-1 text-sm border-0 outline-none text-gray-800 placeholder-gray-400"
              placeholder="Recipient email…" value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
            <button onClick={handleSend} disabled={sending}
              className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 flex items-center gap-1.5">
              {sending ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}

        {/* Invoice preview (printable) */}
        <div ref={printRef} className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 sm:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex items-center gap-3">
                {invoice.company?.logo && (
                  <img src={`${FILE_BASE}/uploads/${invoice.company.logo}`} alt="Logo" className="h-10 sm:h-12 max-w-[120px] sm:max-w-[160px] object-contain rounded" />
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">INVOICE</h1>
                  <p className="text-indigo-200 text-sm mt-1 font-medium">{invoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-white font-bold text-base sm:text-lg">{invoice.company?.name || 'Your Company'}</p>
                {invoice.company?.email && <p className="text-indigo-200 text-xs sm:text-sm">{invoice.company.email}</p>}
                {invoice.company?.phone && <p className="text-indigo-200 text-xs sm:text-sm">{invoice.company.phone}</p>}
                {invoice.company?.website && <p className="text-indigo-200 text-xs sm:text-sm">{invoice.company.website}</p>}
                {invoice.company?.address && <p className="text-indigo-200 text-xs mt-1 max-w-[180px] sm:text-right leading-relaxed">{invoice.company.address}</p>}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-gray-100">
            <div className="px-4 sm:px-8 py-5 border-b sm:border-b-0 sm:border-r border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Billed To</p>
              <p className="font-bold text-gray-900 text-base">{invoice.client.name}</p>
              {invoice.client.company && <p className="text-gray-500 text-sm">{invoice.client.company}</p>}
              <p className="text-gray-500 text-sm">{invoice.client.email}</p>
              {invoice.client.phone && <p className="text-gray-500 text-sm">{invoice.client.phone}</p>}
              {invoice.client.address && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{invoice.client.address}</p>}
            </div>
            <div className="px-4 sm:px-8 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Issue Date</p>
                  <p className="text-gray-800 font-semibold text-sm mt-0.5">{fmtDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Due Date</p>
                  <p className="text-gray-800 font-semibold text-sm mt-0.5">{fmtDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status</p>
                  <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {invoice.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Currency</p>
                  <p className="text-gray-800 font-semibold text-sm mt-0.5">{invoice.currency}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line items - Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left px-4 sm:px-8 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-16 sm:w-20">Qty</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-24 sm:w-28">Unit Price</th>
                  <th className="text-right px-4 sm:px-8 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-24 sm:w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 sm:px-8 py-3 text-sm text-gray-700">{item.description}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-center">{item.quantity}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-right">{fmt(item.unitPrice, currency)}</td>
                    <td className="px-4 sm:px-8 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(item.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-4 sm:px-8 py-2 text-right text-sm text-gray-500">Subtotal</td>
                  <td className="px-4 sm:px-8 py-2 text-right text-sm font-semibold text-gray-700">{fmt(invoice.subtotal, currency)}</td>
                </tr>
                {invoice.taxRate > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 sm:px-8 py-2 text-right text-sm text-gray-500">Tax ({invoice.taxRate}%)</td>
                    <td className="px-4 sm:px-8 py-2 text-right text-sm font-semibold text-gray-700">{fmt(invoice.taxAmount, currency)}</td>
                  </tr>
                )}
                {invoice.discount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 sm:px-8 py-2 text-right text-sm text-gray-500">Discount</td>
                    <td className="px-4 sm:px-8 py-2 text-right text-sm font-semibold text-red-600">-{fmt(invoice.discount, currency)}</td>
                  </tr>
                )}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-4 sm:px-8 py-4 text-right font-bold text-gray-900 text-base">Total</td>
                  <td className="px-4 sm:px-8 py-4 text-right font-extrabold text-indigo-600 text-xl">{fmt(invoice.total, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Line items - Mobile cards */}
          <div className="sm:hidden">
            {(invoice.items || []).map((item, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">{item.description}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">{item.quantity} × {fmt(item.unitPrice, currency)}</span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(item.amount, currency)}</span>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 space-y-1.5 border-t-2 border-gray-200 bg-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-700">{fmt(invoice.subtotal, currency)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({invoice.taxRate}%)</span>
                  <span className="font-semibold text-gray-700">{fmt(invoice.taxAmount, currency)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-semibold text-red-600">-{fmt(invoice.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1.5 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-indigo-600">{fmt(invoice.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes / Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-gray-100">
              {invoice.notes && (
                <div className="px-4 sm:px-8 py-5 border-b sm:border-b-0 sm:border-r border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div className="px-4 sm:px-8 py-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Terms &amp; Conditions</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-50 px-4 sm:px-8 py-4 text-center border-t border-gray-100">
            <p className="text-xs text-gray-400">Thank you for your business!</p>
            {invoice.sentAt && (
              <p className="text-xs text-gray-400 mt-0.5">Sent to {invoice.sentTo} on {fmtDate(invoice.sentAt)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filterStatus) params.status = filterStatus;
      const res = await invoicesAPI.getAll(params);
      setInvoices(res.data.data ?? []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoicesAPI.remove(id);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleQuickSend = async (invoice) => {
    try {
      const res = await invoicesAPI.send(invoice._id, { email: invoice.client.email });
      toast.success(res.data.message || 'Invoice sent!');
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invoice');
    }
  };

  /* Summary stats */
  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    totalValue: invoices.reduce((s, i) => s + (i.total || 0), 0),
    paidValue: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
  };

  return (
    <>
      {/* Modals */}
      {showForm && (
        <InvoiceFormModal
          invoice={editInvoice}
          onClose={() => { setShowForm(false); setEditInvoice(null); }}
          onSaved={() => { setShowForm(false); setEditInvoice(null); fetchInvoices(); }}
        />
      )}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onEdit={() => { setEditInvoice(previewInvoice); setPreviewInvoice(null); setShowForm(true); }}
          onSend={() => { setPreviewInvoice(null); fetchInvoices(); }}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create, manage, and send invoices to clients</p>
          </div>
          <button
            onClick={() => { setEditInvoice(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-2 w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Draft', value: stats.draft, color: 'text-gray-600', bg: 'bg-gray-100' },
            { label: 'Sent', value: stats.sent, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Paid', value: stats.paid, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Total Value', value: fmt(stats.totalValue), color: 'text-indigo-700', bg: 'bg-indigo-50' },
            { label: 'Paid Value', value: fmt(stats.paidValue), color: 'text-green-700', bg: 'bg-green-50' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl px-4 py-3 ${s.bg}`}>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className={`text-lg font-bold ${s.color} mt-0.5`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, client name or email…"
              className="input pl-9 text-sm w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input text-sm w-full sm:w-44"
          >
            <option value="">All Statuses</option>
            {['draft','sent','paid','overdue','cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden !p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🧾</div>
              <p className="text-gray-500 font-medium">No invoices yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first invoice to get started</p>
              <button
                onClick={() => { setEditInvoice(null); setShowForm(true); }}
                className="btn-primary mt-4 text-sm"
              >
                Create Invoice
              </button>
            </div>
          ) : (
            <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Issue Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Due Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50/50 transition group">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <p className="text-xs text-gray-400">{inv.createdBy?.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-800">{inv.client?.name}</p>
                        <p className="text-xs text-gray-400">{inv.client?.company || inv.client?.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 hidden md:table-cell">{fmtDate(inv.issueDate)}</td>
                      <td className="px-4 py-3.5 text-sm hidden lg:table-cell">
                        {inv.dueDate ? (
                          <span className={new Date(inv.dueDate) < new Date() && inv.status !== 'paid' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {fmtDate(inv.dueDate)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{fmt(inv.total, inv.currency)}</span>
                        <p className="text-xs text-gray-400">{inv.currency}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${STATUS_STYLES[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition">
                          <button title="Preview" onClick={() => setPreviewInvoice(inv)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button title="Edit" onClick={() => { setEditInvoice(inv); setShowForm(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {inv.status === 'draft' && (
                            <button title={`Send to ${inv.client?.email}`} onClick={() => handleQuickSend(inv)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                          <button title="Delete" onClick={() => handleDelete(inv._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {invoices.map((inv) => (
                <div key={inv._id} className="p-4 space-y-2" onClick={() => setPreviewInvoice(inv)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-indigo-600">{inv.invoiceNumber}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{inv.client?.name}</p>
                      <p className="text-xs text-gray-400">{inv.client?.company || inv.client?.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{fmt(inv.total, inv.currency)}</span>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_STYLES[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">{fmtDate(inv.issueDate)}{inv.dueDate ? ` — Due ${fmtDate(inv.dueDate)}` : ''}</p>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button title="Edit" onClick={() => { setEditInvoice(inv); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {inv.status === 'draft' && (
                        <button title="Send" onClick={() => handleQuickSend(inv)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      <button title="Delete" onClick={() => handleDelete(inv._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
