import { useState, useEffect } from "react";
import { teamsAPI, usersAPI } from "../lib/api";
import toast from "react-hot-toast";

export default function EmployeeForm({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    employeeId: employee?.employeeId || "",
    name: employee?.name || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    designation: employee?.designation || "",
    fatherName: employee?.fatherName || "",
    motherName: employee?.motherName || "",
    alternateMobile: employee?.alternateMobile || "",
    aadhaar: employee?.aadhaar || "",
    department: employee?.department || "",
    joiningDate: employee?.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : "",
    status: employee?.isActive === false ? "Terminated" : "Active",
  });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    teamsAPI.getAll().then((r) => setTeams(r.data.data || []));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        designation: form.designation,
        fatherName: form.fatherName,
        motherName: form.motherName,
        alternateMobile: form.alternateMobile,
        aadhaar: form.aadhaar,
        department: form.department,
        joiningDate: form.joiningDate,
        isActive: form.status === "Active",
      };
      if (employee) {
        await usersAPI.update(employee._id, payload);
        toast.success("Employee updated");
      } else {
        await usersAPI.create({ ...payload, password: "changeme123" }); // Default password, should be changed by user
        toast.success("Employee created");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save employee");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <input
        name="employeeId"
        value={form.employeeId}
        onChange={handleChange}
        placeholder="Employee ID"
        className="input col-span-1"
        required
      />
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Full Name"
        className="input col-span-1"
        required
      />
      <input
        name="fatherName"
        value={form.fatherName}
        onChange={handleChange}
        placeholder="Father's Name"
        className="input col-span-1"
      />
      <input
        name="motherName"
        value={form.motherName}
        onChange={handleChange}
        placeholder="Mother's Name"
        className="input col-span-1"
      />
      <input
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Email"
        className="input col-span-2"
        required
        type="email"
      />
      <input
        name="phone"
        value={form.phone}
        onChange={handleChange}
        placeholder="Phone"
        className="input col-span-1"
        type="tel"
      />
      <input
        name="alternateMobile"
        value={form.alternateMobile}
        onChange={handleChange}
        placeholder="Alternate Mobile Number"
        className="input col-span-1"
        type="tel"
      />
      <input
        name="aadhaar"
        value={form.aadhaar}
        onChange={handleChange}
        placeholder="Aadhaar Card Number"
        className="input col-span-2"
      />
      
      <select
        name="department"
        value={form.department}
        onChange={handleChange}
        className="input col-span-2"
      >
        <option value="">Select team</option>
        {teams.map((t) => (
          <option key={t._id} value={t.name}>{t.name}</option>
        ))}
      </select>
      <input
        name="designation"
        value={form.designation}
        onChange={handleChange}
        placeholder="Designation"
        className="input col-span-2"
      />
      <input
        name="joiningDate"
        value={form.joiningDate}
        onChange={handleChange}
        placeholder="Joining Date"
        className="input col-span-1"
        type="date"
      />
      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className="input col-span-1"
      >
        <option value="Active">Active</option>
        <option value="Terminated">Terminated</option>
      </select>
      <div className="col-span-2 flex justify-end gap-2 mt-4">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : employee ? "Update" : "Create"}</button>
      </div>
    </form>
  );
}
