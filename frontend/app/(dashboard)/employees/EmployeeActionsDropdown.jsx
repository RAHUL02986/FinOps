import { useState, useRef, useEffect } from "react";

export default function EmployeeActionsDropdown({ employee, onEdit, onSalary, onHistory, onToggleActive, onSoftDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);
  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        title="Actions"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onEdit(); }}>Edit</button>
          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onSalary(); }}>Salary</button>
          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onHistory(); }}>History</button>
          <button
            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${employee.isActive !== false ? 'text-red-600' : 'text-green-600'}`}
            onClick={() => { setOpen(false); onToggleActive(); }}
          >
            {employee.isActive !== false ? 'Terminate' : 'Reactivate'}
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-orange-600"
            onClick={() => { setOpen(false); onSoftDelete(); }}
          >
            Soft Delete
          </button>
        </div>
      )}
    </div>
  );
}