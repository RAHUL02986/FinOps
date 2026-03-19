import { useState, useEffect } from "react";
import { payrollAPI } from "../lib/api";
import toast from "react-hot-toast";

export default function SalaryForm({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: "Joining",
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
        designation: employee.designation || '',
        basicSalary: Number(form.basicSalary),
        hra: Number(form.hra),
        allowances: Number(form.allowances),
        deductions: Number(form.deductions),
        tax: 0,
        netSalary: net,
        bonus: Number(form.bonus),
        month,
        year,
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
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Effective From</label>
        <input
          name="effectiveFrom"
          value={form.effectiveFrom}
          onChange={handleChange}
          type="date"
          className="input w-full"
          required
        />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Reason</label>
        <select
          name="reason"
          value={form.reason}
          onChange={handleChange}
          className="input w-full"
        >
          <option value="Joining">Joining</option>
          <option value="Increment">Increment</option>
          <option value="Promotion">Promotion</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Basic Salary</label>
        <input
          name="basicSalary"
          value={form.basicSalary}
          onChange={handleChange}
          className="input w-full"
          type="number"
          min="0"
          required
        />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">HRA</label>
        <input
          name="hra"
          value={form.hra}
          onChange={handleChange}
          className="input w-full"
          type="number"
          min="0"
        />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Allowances</label>
        <input
          name="allowances"
          value={form.allowances}
          onChange={handleChange}
          className="input w-full"
          type="number"
          min="0"
        />
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">Bonus</label>
        <input
          name="bonus"
          value={form.bonus}
          onChange={handleChange}
          className="input w-full"
          type="number"
          min="0"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Deductions</label>
        <input
          name="deductions"
          value={form.deductions}
          onChange={handleChange}
          className="input w-full"
          type="number"
          min="0"
        />
      </div>
      <div className="col-span-2 text-sm text-gray-600">
        <div>Gross: <span className="font-bold">{gross.toFixed(2)}</span></div>
        <div>Net: <span className="font-bold">{net.toFixed(2)}</span></div>
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Notes (optional)</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          className="input w-full"
        />
      </div>
      <div className="col-span-2 flex justify-end gap-2 mt-4">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Salary"}</button>
      </div>
    </form>
  );
}
