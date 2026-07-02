"use client";
import { useState, useEffect } from "react";
import { payrollAPI, usersAPI } from "../lib/api";
import toast from "react-hot-toast";

export default function SalaryForm({ employee, slip, onClose, onSaved }) {
    const [hrName, setHrName] = useState("");
  const [form, setForm] = useState({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: "Joining",
    employeeId: '',
    employeeName: '',
    department: '',
    designation: '', // fetched, not editable
    workLocation: 'Dharamshala', // fetched, not editable
    fatherName: '',
    motherName: '',
    earnings: [ { component: '', amount: '', remarks: '' } ],
    extraDeductions: [ { component: '', amount: '', remarks: '' } ],
    facilities: [ { head: '', cost: '', remarks: '' } ],
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

  // Auto-fill with latest salary slip if available and fetch employee details
  useEffect(() => {
    // Fetch HR users and set the first HR name
    async function fetchHR() {
      try {
        const res = await usersAPI.getAll({ role: 'hr' });
        const hrList = res.data.data || [];
        if (hrList.length > 0) {
          setHrName(hrList[0].name);
          setForm(f => ({ ...f, authorizedBy: hrList[0].name }));
        }
      } catch (err) {
        // ignore error
      }
    }
    fetchHR();

    async function fetchData() {
      if (!employee && !slip) return;
      const userId = employee?._id || employee?.id || (slip?.employee?._id || slip?.employee);
      if (!userId) return;

      setForm(f => ({
        ...f,
        employeeId: slip?.employeeId || employee?.employeeId || userId || '',
        employeeName: slip?.employeeName || employee?.name || employee?.employeeName || (typeof slip?.employee === 'object' ? slip.employee.name : '') || '',
        department: slip?.department || employee?.department || '',
        designation: slip?.designation || employee?.designation || '',
        fatherName: slip?.fatherName || employee?.fatherName || '',
        motherName: slip?.motherName || employee?.motherName || '',
      }));

      try {
        const empRes = await usersAPI.getById(userId);
        const empData = empRes.data.data || {};
        const companyRes = await fetch('/api/company');
        const company = companyRes.ok ? await companyRes.json() : {};

        setForm(f => ({
          ...f,
          employeeId: empData.employeeId || slip?.employeeId || userId || '',
          employeeName: empData.name || slip?.employeeName || employee?.name || employee?.employeeName || '',
          department: empData.department || slip?.department || employee?.department || '',
          designation: empData.designation || slip?.designation || employee?.designation || '',
          workLocation: company.workLocation || slip?.workLocation || employee?.workLocation || '',
          fatherName: empData.fatherName || slip?.fatherName || employee?.fatherName || '',
          motherName: empData.motherName || slip?.motherName || employee?.motherName || '',
          facilities: Array.isArray(empData.facilities) && empData.facilities.length > 0 ? empData.facilities : (Array.isArray(slip?.facilities) && slip.facilities.length > 0 ? slip.facilities : [{ head: '', cost: '', remarks: '' }]),
          earnings: Array.isArray(empData.earnings) && empData.earnings.length > 0 ? empData.earnings : (Array.isArray(slip?.earnings) && slip.earnings.length > 0 ? slip.earnings : [{ component: '', amount: '', remarks: '' }]),
          extraDeductions: Array.isArray(empData.extraDeductions) && empData.extraDeductions.length > 0 ? empData.extraDeductions : (Array.isArray(slip?.extraDeductions) && slip.extraDeductions.length > 0 ? slip.extraDeductions : [{ component: '', amount: '', remarks: '' }]),
        }));
      } catch (err) {
        // ignore error, preserve passed employee values
      }

      if (slip) {
        setForm(f => ({
          ...f,
          employeeId: slip.employeeId || f.employeeId,
          employeeName: slip.employeeName || f.employeeName,
          department: slip.department || f.department,
          designation: slip.designation || f.designation,
          workLocation: slip.workLocation || f.workLocation,
          fatherName: slip.fatherName || f.fatherName,
          motherName: slip.motherName || f.motherName,
          earnings: Array.isArray(slip.earnings) && slip.earnings.length > 0 ? slip.earnings : f.earnings,
          extraDeductions: Array.isArray(slip.extraDeductions) && slip.extraDeductions.length > 0 ? slip.extraDeductions : f.extraDeductions,
          facilities: Array.isArray(slip.facilities) && slip.facilities.length > 0 ? slip.facilities : f.facilities,
          paymentDetails: slip.paymentDetails || f.paymentDetails,
          authorizedBy: slip.authorizedBy || f.authorizedBy,
          notes1: slip.notes1 || f.notes1,
          notes2: slip.notes2 || f.notes2,
          basicSalary: slip.basicSalary || 0,
          hra: slip.hra || 0,
          allowances: slip.allowances || 0,
          bonus: slip.bonus || 0,
          notes: slip.notes || f.notes,
          reason: slip.reason || f.reason,
          effectiveFrom: slip.effectiveFrom ? slip.effectiveFrom.slice(0, 10) : f.effectiveFrom,
        }));
      } else {
        // Fetch latest salary slip for other fields when creating a new slip
        try {
          const res = await payrollAPI.getSlips({ employee: userId });
          const slips = res.data;
          if (Array.isArray(slips) && slips.length > 0) {
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
              notes: latest.notes || "",
              reason: latest.reason || "Joining",
              effectiveFrom: latest.effectiveFrom ? latest.effectiveFrom.slice(0, 10) : f.effectiveFrom,
            }));
          }
        } catch (err) {
          // ignore error, use default
        }
      }
    }
    fetchData();
  }, [employee, slip]);
  const [loading, setLoading] = useState(false);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleResetBasicSalary = () => {
    const resetValue = slip?.basicSalary ?? 0;
    setForm((f) => ({ ...f, basicSalary: resetValue }));
    toast.success('Basic salary reset to current slip value');
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

  // Calculate total earnings (sum of all earnings amounts)
  const earningsTotal = form.earnings.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  // Calculate total extra deductions (sum of all extra deduction amounts)
  const extraDeductionsTotal = form.extraDeductions.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  // Calculate total facilities/expenses (sum of all facilities costs)
  const facilitiesTotal = form.facilities.reduce((sum, row) => sum + (parseFloat(row.cost) || 0), 0);

  // Deductions = Facilities/Expenses + Extra Deduction
  const deductions = facilitiesTotal + extraDeductionsTotal;
  // Gross = basic salary + HRA + Allowances + Bonus + Earnings
  const gross = Number(form.basicSalary) + Number(form.hra) + Number(form.allowances) + Number(form.bonus) + earningsTotal;
  // Net = Gross - Deductions
  const net = gross - deductions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Extract month and year from effectiveFrom
      const date = new Date(form.effectiveFrom);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const resolvedEmployeeId = employee?._id || employee?.id || (slip?.employee?._id || slip?.employee);
      const resolvedEmployeeEmail = employee?.email || slip?.employeeEmail || (typeof slip?.employee === 'object' ? slip.employee.email : '');

      const payload = {
        employee: resolvedEmployeeId,
        employeeName: form.employeeName,
        employeeEmail: resolvedEmployeeEmail,
        employeeId: form.employeeId,
        department: form.department,
        designation: form.designation,
        workLocation: form.workLocation,
        fatherName: form.fatherName,
        motherName: form.motherName,
        month,
        year,
        earnings: form.earnings,
        extraDeductions: form.extraDeductions,
        facilities: form.facilities,
        paymentDetails: form.paymentDetails,
        authorizedBy: form.authorizedBy,
        notes1: form.notes1,
        notes2: form.notes2,
        basicSalary: Number(form.basicSalary),
        hra: Number(form.hra),
        allowances: Number(form.allowances),
        deductions: deductions,
        tax: 0,
        netSalary: net,
        bonus: Number(form.bonus),
        reason: form.reason,
        effectiveFrom: form.effectiveFrom,
        notes: form.notes,
      };
      if (slip?._id) {
        await payrollAPI.updateSlip(slip._id, payload);
        toast.success("Salary updated");
      } else {
        await payrollAPI.createSlip(payload);
        toast.success("Salary saved");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save salary");
    }
    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto p-2">

      {/* Employee Info (read-only) */}
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Employee ID</label>
        <input name="employeeId" value={form.employeeId} className="input w-full bg-gray-100" readOnly />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Employee Name</label>
        <input name="employeeName" value={form.employeeName} className="input w-full bg-gray-100" readOnly />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Department</label>
        <input name="department" value={form.department} className="input w-full bg-gray-100" readOnly />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Designation</label>
        <input
          name="designation"
          value={form.designation}
          onChange={handleChange}
          className="input w-full bg-gray-100"
          readOnly
        />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Work Location</label>
        <input name="workLocation" value={form.workLocation} className="input w-full bg-gray-100" readOnly />
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

      {/* Dynamic Extra Deduction Table */}
      <div className="col-span-2 border-t pt-2 mt-2">
        <div className="font-bold mb-1">Extra Deduction</div>
        {form.extraDeductions.map((row, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 mb-1">
            <input placeholder="Component" value={row.component} onChange={e => handleArrayChange('extraDeductions', idx, 'component', e.target.value)} className="input" />
            <input placeholder="Amount" value={row.amount} onChange={e => handleArrayChange('extraDeductions', idx, 'amount', e.target.value)} className="input" />
            <input placeholder="Remarks" value={row.remarks} onChange={e => handleArrayChange('extraDeductions', idx, 'remarks', e.target.value)} className="input" />
            <button type="button" onClick={() => handleRemoveRow('extraDeductions', idx)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => handleAddRow('extraDeductions', { component: '', amount: '', remarks: '' })} className="btn-secondary mt-1">Add Extra Deduction</button>
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


      {/* Payment Details, Authorized By, Notes */}
      <div className="col-span-2 border-t pt-2 mt-2">
        <label className="block text-sm font-medium mb-1">Payment Details</label>
        <textarea name="paymentDetails" value={form.paymentDetails} onChange={handleChange} className="input w-full" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Authorized By</label>
        <input name="authorizedBy" value={form.authorizedBy} className="input w-full bg-gray-100" readOnly />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Notes 1</label>
        <textarea name="notes1" value={form.notes1} onChange={handleChange} className="input w-full" />
      </div>

      {/* Legacy fields for compatibility */}
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Basic Salary</label>
        <div className="flex gap-2 items-center">
          <input name="basicSalary" value={form.basicSalary} onChange={handleChange} className="input w-full" type="number" min="0" required />
          <button type="button" onClick={handleResetBasicSalary} className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200">Revert</button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Click Revert to restore the currently saved salary before saving changes.</p>
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
        <label className="block text-sm font-medium mb-1">Deductions (Facilities/Expenses + Extra Deduction)</label>
        <input name="deductions" value={deductions} className="input w-full bg-gray-100" type="number" min="0" readOnly />
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
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? (slip?._id ? "Updating..." : "Saving...") : (slip?._id ? "Update Salary" : "Save Salary")}</button>
      </div>
    </form>
    </>
  );
}
