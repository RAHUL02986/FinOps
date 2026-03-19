'use client';
import { useState, useEffect } from 'react';
import { payrollAPI } from '../../../lib/api';
import toast from 'react-hot-toast';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_COLORS = { draft: 'bg-gray-100 text-gray-700', processing: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700', sent: 'bg-blue-100 text-blue-700' };

export default function PayrollPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), defaultBasicSalary: 50000 });
  const [expandedRun, setExpandedRun] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); try { const r = await payrollAPI.getRuns(); setRuns(r.data); } catch { toast.error('Failed to load'); } setLoading(false); };

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await payrollAPI.createRun(form); toast.success('Payroll run created'); setShowForm(false); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleComplete = async (id) => {
    try { await payrollAPI.completeRun(id); toast.success('Payroll run completed'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleEmailSlips = async (id) => {
    try { const r = await payrollAPI.emailSlips(id); toast.success(r.data.message); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payroll run and all associated slips?')) return;
    try { await payrollAPI.deleteRun(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Payroll</h1><p className="text-gray-500 text-sm mt-1">Process payroll runs and manage salary slips</p></div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Payroll Run</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">New Payroll Run</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Month</label><select value={form.month} onChange={e => setForm({ ...form, month: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm">{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Year</label><input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Default Basic Salary</label><input type="number" value={form.defaultBasicSalary} onChange={e => setForm({ ...form, defaultBasicSalary: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Generate Payroll</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border"><div className="text-5xl mb-4">💰</div><h3 className="text-lg font-semibold text-gray-700">No payroll runs</h3><p className="text-gray-500 mt-1">Create a payroll run to generate salary slips</p></div>
      ) : (
        <div className="space-y-4">
          {runs.map(run => (
            <div key={run._id} className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-4 flex flex-col sm:flex-row justify-between items-start gap-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedRun(expandedRun === run._id ? null : run._id)}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{MONTHS[run.month - 1]} {run.year}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[run.status]}`}>{run.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{run.employeeCount} employees • Total: ₹{(run.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {run.status === 'draft' && <button onClick={() => handleComplete(run._id)} className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg">Complete</button>}
                  {run.status === 'completed' && <button onClick={() => handleEmailSlips(run._id)} className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Email Slips</button>}
                  <button onClick={() => handleDelete(run._id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">Delete</button>
                </div>
              </div>
              {expandedRun === run._id && run.slips && (
                <div className="border-t">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Employee</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Basic</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">HRA</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Deductions</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Net Salary</th>
                        <th className="px-4 py-2 text-center font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.slips.map(slip => (
                        <tr key={slip._id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3"><p className="font-medium">{slip.employeeName}</p><p className="text-xs text-gray-400">{slip.employeeEmail}</p></td>
                          <td className="px-4 py-3 text-right">₹{slip.basicSalary?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">₹{slip.hra?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-red-500">-₹{((slip.deductions || 0) + (slip.tax || 0)).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold">₹{slip.netSalary?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[slip.status]}`}>{slip.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
