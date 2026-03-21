import { useState, useEffect } from "react";
import { payrollAPI } from "../lib/api";
import toast from "react-hot-toast";

export default function SalaryForm({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: "Joining",
    employeeId: '',
    department: '',
    workLocation: '',
    monthName: '',
    companyName: 'CodexMatrix Pvt. Ltd.',
    companyAddress: 'Dharamshala, Himachal Pradesh, India',
    companyEmail: 'hr@codexmatrix.com',
    companyWebsite: 'www.codexmatrix.com',
    earnings: [ { component: '', amount: '', remarks: '' } ],
    facilities: [ { head: '', cost: '', remarks: '' } ],
    totalValue: [ { component: '', amount: '', remarks: '' } ],
    paymentDetails: '',
    authorizedBy: '',
    notes1: '',
    notes2: '',
    basicSalary: 0,
    hra: 0,
    allowances: 0,
    bonus: 0,
    deductions: 0,
    notes: "",
  });

  // Auto-fill with latest salary slip if available
  useEffect(() => {
    async function fetchLatestSlip() {
      if (!employee?._id) return;
      try {
        const res = await payrollAPI.getSlips({ employee: employee._id });
        const slips = res.data;
        if (Array.isArray(slips) && slips.length > 0) {
          // Find the latest slip by year/month
          const latest = slips.reduce((a, b) => {
            if (a.year > b.year) return a;
            if (a.year < b.year) return b;
            return a.month >= b.month ? a : b;
          });
          setForm(f => ({
            ...f,
            basicSalary: latest.basicSalary || 0,
            hra: latest.hra || 0,
            allowances: latest.allowances || 0,
            bonus: latest.bonus || 0,
            deductions: latest.deductions || 0,
            notes: latest.notes || "",
            reason: latest.reason || "Joining",
            effectiveFrom: latest.effectiveFrom ? latest.effectiveFrom.slice(0, 10) : f.effectiveFrom,
          }));
        }
      } catch (err) {
        // ignore error, use default
      }
    }
    fetchLatestSlip();
    // Only run on mount or when employee changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?._id]);
  const [loading, setLoading] = useState(false);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Dynamic array handlers
  const handleArrayChange = (arrName, idx, field, value) => {
    setForm(f => ({
      ...f,
      [arrName]: f[arrName].map((row, i) => i === idx ? { ...row, [field]: value } : row)
    }));
  };
  const handleAddRow = (arrName, emptyRow) => {
    setForm(f => ({ ...f, [arrName]: [...f[arrName], emptyRow] }));
  };
  const handleRemoveRow = (arrName, idx) => {
    setForm(f => ({ ...f, [arrName]: f[arrName].filter((_, i) => i !== idx) }));
  };

  const gross = Number(form.basicSalary) + Number(form.hra) + Number(form.allowances) + Number(form.bonus);
  const net = gross - Number(form.deductions);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Extract month and year from effectiveFrom
      const date = new Date(form.effectiveFrom);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      await payrollAPI.createSlip({
        employee: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeId: form.employeeId,
        designation: employee.designation || '',
        department: form.department,
        workLocation: form.workLocation,
        month,
        monthName: form.monthName,
        year,
        companyName: form.companyName,
        companyAddress: form.companyAddress,
        companyEmail: form.companyEmail,
        companyWebsite: form.companyWebsite,
        earnings: form.earnings,
        facilities: form.facilities,
        totalValue: form.totalValue,
        paymentDetails: form.paymentDetails,
        authorizedBy: form.authorizedBy,
        notes1: form.notes1,
        notes2: form.notes2,
        basicSalary: Number(form.basicSalary),
        hra: Number(form.hra),
        allowances: Number(form.allowances),
        deductions: Number(form.deductions),
        tax: 0,
        netSalary: net,
        bonus: Number(form.bonus),
        reason: form.reason,
        effectiveFrom: form.effectiveFrom,
        notes: form.notes,
      });
      toast.success("Salary saved");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save salary");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto p-2">
      {/* Employee & Company Info */}
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Employee ID</label>
        <input name="employeeId" value={form.employeeId} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Department</label>
        <input name="department" value={form.department} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Work Location</label>
        <input name="workLocation" value={form.workLocation} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Month Name</label>
        <input name="monthName" value={form.monthName} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Company Name</label>
        <input name="companyName" value={form.companyName} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Company Address</label>
        <input name="companyAddress" value={form.companyAddress} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Company Email</label>
        <input name="companyEmail" value={form.companyEmail} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Company Website</label>
        <input name="companyWebsite" value={form.companyWebsite} onChange={handleChange} className="input w-full" />
      </div>

      {/* Reason & Effective From */}
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Effective From</label>
        <input name="effectiveFrom" value={form.effectiveFrom} onChange={handleChange} type="date" className="input w-full" required />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Reason</label>
        <select name="reason" value={form.reason} onChange={handleChange} className="input w-full">
          <option value="Joining">Joining</option>
          <option value="Increment">Increment</option>
          <option value="Promotion">Promotion</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Dynamic Earnings Table */}
      <div className="col-span-2 border-t pt-2 mt-2">
        <div className="font-bold mb-1">Earnings</div>
        {form.earnings.map((row, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 mb-1">
            <input placeholder="Component" value={row.component} onChange={e => handleArrayChange('earnings', idx, 'component', e.target.value)} className="input" />
            <input placeholder="Amount" value={row.amount} onChange={e => handleArrayChange('earnings', idx, 'amount', e.target.value)} className="input" />
            <input placeholder="Remarks" value={row.remarks} onChange={e => handleArrayChange('earnings', idx, 'remarks', e.target.value)} className="input" />
            <button type="button" onClick={() => handleRemoveRow('earnings', idx)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => handleAddRow('earnings', { component: '', amount: '', remarks: '' })} className="btn-secondary mt-1">Add Earning</button>
      </div>

      {/* Dynamic Facilities Table */}
      <div className="col-span-2 border-t pt-2 mt-2">
        <div className="font-bold mb-1">Facilities / Expenses</div>
        {form.facilities.map((row, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 mb-1">
            <input placeholder="Head" value={row.head} onChange={e => handleArrayChange('facilities', idx, 'head', e.target.value)} className="input" />
            <input placeholder="Cost" value={row.cost} onChange={e => handleArrayChange('facilities', idx, 'cost', e.target.value)} className="input" />
            <input placeholder="Remarks" value={row.remarks} onChange={e => handleArrayChange('facilities', idx, 'remarks', e.target.value)} className="input" />
            <button type="button" onClick={() => handleRemoveRow('facilities', idx)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => handleAddRow('facilities', { head: '', cost: '', remarks: '' })} className="btn-secondary mt-1">Add Facility/Expense</button>
      </div>

      {/* Dynamic Total Value Table */}
      <div className="col-span-2 border-t pt-2 mt-2">
        <div className="font-bold mb-1">Total Value to Employee</div>
        {form.totalValue.map((row, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 mb-1">
            <input placeholder="Component" value={row.component} onChange={e => handleArrayChange('totalValue', idx, 'component', e.target.value)} className="input" />
            <input placeholder="Amount" value={row.amount} onChange={e => handleArrayChange('totalValue', idx, 'amount', e.target.value)} className="input" />
            <input placeholder="Remarks" value={row.remarks} onChange={e => handleArrayChange('totalValue', idx, 'remarks', e.target.value)} className="input" />
            <button type="button" onClick={() => handleRemoveRow('totalValue', idx)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => handleAddRow('totalValue', { component: '', amount: '', remarks: '' })} className="btn-secondary mt-1">Add Total Value Row</button>
      </div>

      {/* Payment Details, Authorized By, Notes */}
      <div className="col-span-2 border-t pt-2 mt-2">
        <label className="block text-sm font-medium mb-1">Payment Details</label>
        <textarea name="paymentDetails" value={form.paymentDetails} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Authorized By</label>
        <textarea name="authorizedBy" value={form.authorizedBy} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Notes 1</label>
        <textarea name="notes1" value={form.notes1} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Notes 2</label>
        <textarea name="notes2" value={form.notes2} onChange={handleChange} className="input w-full" />
      </div>

      {/* Legacy fields for compatibility */}
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Basic Salary</label>
        <input name="basicSalary" value={form.basicSalary} onChange={handleChange} className="input w-full" type="number" min="0" required />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">HRA</label>
        <input name="hra" value={form.hra} onChange={handleChange} className="input w-full" type="number" min="0" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Allowances</label>
        <input name="allowances" value={form.allowances} onChange={handleChange} className="input w-full" type="number" min="0" />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Bonus</label>
        <input name="bonus" value={form.bonus} onChange={handleChange} className="input w-full" type="number" min="0" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Deductions</label>
        <input name="deductions" value={form.deductions} onChange={handleChange} className="input w-full" type="number" min="0" />
      </div>
      <div className="col-span-2 text-sm text-gray-600">
        <div>Gross: <span className="font-bold">{gross.toFixed(2)}</span></div>
        <div>Net: <span className="font-bold">{net.toFixed(2)}</span></div>
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Notes (optional)</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-2 flex justify-end gap-2 mt-4">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Salary"}</button>
      </div>
    </form>
  );
}
