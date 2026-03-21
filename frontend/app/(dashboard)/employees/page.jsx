"use client";
import { useState, useEffect } from "react";
import { usersAPI, teamsAPI, payrollAPI } from "../../../lib/api";
import toast from "react-hot-toast";

import EmployeeForm from "../../../components/EmployeeForm";
import TeamForm from "../../../components/TeamForm";
import SalaryForm from "../../../components/SalaryForm";
import SalaryHistory from "../../../components/SalaryHistory";

export default function EmployeesPage() {
  const [tab, setTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryEmployee, setSalaryEmployee] = useState(null);
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);
  const [salaryHistoryEmployee, setSalaryHistoryEmployee] = useState(null);

  useEffect(() => {
    load();
  }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === "employees") {
        const res = await usersAPI.getAll({ limit: 100 });
        setEmployees(res.data.data || []);
      } else {
        const res = await teamsAPI.getAll();
        setTeams(res.data.data || []);
      }
    } catch {
      toast.error("Failed to load data");
    }
    setLoading(false);
  };

  // --- TEAM HANDLERS ---
  const handleEditTeam = (team) => {
    setEditTeam(team);
    setShowTeamForm(true);
  };
  const handleDeleteTeam = async (team) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      await teamsAPI.remove(team._id);
      toast.success('Team deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };
  const handleToggleStatus = async (team) => {
    try {
      await teamsAPI.update(team._id, { ...team, isActive: !team.isActive });
      load();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-0 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Employee Management</h1>
      <p className="text-gray-500 mb-6">Manage teams, employees, and salary records.</p>
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === "employees" ? "bg-indigo-50 border-indigo-600 text-indigo-700" : "bg-white border-gray-200 text-gray-600"}`}
          onClick={() => setTab("employees")}
        >
          <span className="mr-1">👥</span> Employees
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === "teams" ? "bg-indigo-50 border-indigo-600 text-indigo-700" : "bg-white border-gray-200 text-gray-600"}`}
          onClick={() => setTab("teams")}
        >
          <span className="mr-1">👨‍👩‍👧‍👦</span> Teams
        </button>
      </div>

      {tab === "employees" && (
        // ...existing code for employees table and modals...
        <>
          <div className="bg-white rounded-xl border p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Employees</h2>
                <p className="text-gray-400 text-sm">Manage employee records and employment status.</p>
              </div>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                onClick={() => { setEditEmployee(null); setShowEmployeeForm(true); }}
              >
                + Add Employee
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Emp ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Designation</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Joined</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr>
                  ) : employees.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No employees found</td></tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp._id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3">{emp.employeeId || emp._id}</td>
                        <td className="px-4 py-3">{emp.designation}</td>
                        <td className="px-4 py-3">{emp.email}</td>
                        <td className="px-4 py-3">{emp.phone || '-'}</td>
                        <td className="px-4 py-3">{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          {emp.isActive !== false ? (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Active</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Terminated</span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button className="btn-action" title="Edit" onClick={() => { setEditEmployee(emp); setShowEmployeeForm(true); }}>Edit</button>
                          <button className="btn-action" title="Salary" onClick={() => { setSalaryEmployee(emp); setShowSalaryModal(true); }}>Salary</button>
                          <button className="btn-action" title="History" onClick={() => { setSalaryHistoryEmployee(emp); setShowSalaryHistory(true); }}>History</button>
                          <button className="btn-action text-red-500 border-red-200" title="Delete" onClick={() => {/* TODO: handle delete */}}>🧑‍💼</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modals (to be implemented) */}
          {showEmployeeForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{editEmployee ? "Edit Employee" : "Add New Employee"}</h2>
                  <button onClick={() => setShowEmployeeForm(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                </div>
                <EmployeeForm
                  employee={editEmployee}
                  onClose={() => setShowEmployeeForm(false)}
                  onSaved={load}
                />
              </div>
            </div>
          )}
          {showSalaryModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Set Salary - {salaryEmployee?.name}</h2>
                  <button onClick={() => setShowSalaryModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                </div>
                <SalaryForm
                  employee={salaryEmployee}
                  onClose={() => setShowSalaryModal(false)}
                  onSaved={load}
                />
              </div>
            </div>
          )}
          {showSalaryHistory && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Salary History - {salaryHistoryEmployee?.name}</h2>
                  <button onClick={() => setShowSalaryHistory(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                </div>
                <SalaryHistory
                  employee={salaryHistoryEmployee}
                  onClose={() => setShowSalaryHistory(false)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {tab === "teams" && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Teams</h2>
              <p className="text-gray-400 text-sm">Manage teams for employee organization.</p>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              onClick={() => { setEditTeam(null); setShowTeamForm(true); }}
            >
              + Add Team
            </button>
          </div>
          <div>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No teams found</div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team._id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
                    <div>
                      <div className="font-semibold text-base">{team.name}</div>
                      {team.description && <div className="text-xs text-gray-400">{team.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${team.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{team.isActive ? 'Active' : 'Inactive'}</span>
                      <button className="btn-action" title="Edit" onClick={() => handleEditTeam(team)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" /></svg>
                      </button>
                      <button className="btn-action" title="Delete" onClick={() => handleDeleteTeam(team)}>
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <button className="btn-action" title="Toggle Status" onClick={() => handleToggleStatus(team)}>
                        {team.isActive ? (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showTeamForm && (
        <TeamForm
          team={editTeam}
          onClose={() => setShowTeamForm(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
