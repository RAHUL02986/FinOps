"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { dashboardAPI, teamsAPI, usersAPI } from '../../../lib/api';
import DashboardStats from '../../../components/DashboardStats';
import DashboardChart from '../../../components/DashboardChart';
import TransactionTable from '../../../components/TransactionTable';
import toast from 'react-hot-toast';

const PERIODS = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

const ELEVATED = ['superadmin', 'hr', 'manager'];

function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  // Redirect Data Entry users to /transactions and do not render dashboard
  useEffect(() => {
    if (user?.role === 'dataentry') {
      router.replace('/transactions');
    }
  }, [user, router]);
  if (user?.role === 'dataentry') return null;
  const elevated = ELEVATED.includes(user?.role);
  const [period, setPeriod ] = useState('month');
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Team assignment state (management only)
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null); // team id being edited
  const [teamMembers, setTeamMembers] = useState([]); // member ids for the team being edited
  const [memberSearch, setMemberSearch] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchData();
    return () => controller.abort();
  }, [period]);

  useEffect(() => {
    if (!elevated) return;
    fetchTeams();
    usersAPI.getAll({ limit: 200 }).then((r) => setAllUsers(r.data.data ?? [])).catch(() => {});
  }, [elevated]);

  const fetchTeams = async () => {
    try {
      const r = await teamsAPI.getAll();
      setTeams(r.data.data ?? []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData();
    return () => controller.abort();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, chartRes] = await Promise.all([
        dashboardAPI.getSummary({ period }),
        dashboardAPI.getChartData({ period }),
      ]);
      setSummary(summaryRes.data.data);
      setChartData(chartRes.data.data);
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError('Failed to load dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditTeam = (team) => {
    setEditingTeam(team._id);
    setTeamMembers(team.members?.map((m) => m._id ?? m) ?? []);
    setMemberSearch('');
  };

  const cancelEditTeam = () => {
    setEditingTeam(null);
    setTeamMembers([]);
    setMemberSearch('');
  };

  const toggleMember = (id) =>
    setTeamMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const saveTeamMembers = async () => {
    if (!editingTeam) return;
    setSavingTeam(true);
    try {
      const team = teams.find((t) => t._id === editingTeam);
      await teamsAPI.update(editingTeam, { name: team.name, color: team.color, members: teamMembers });
      toast.success('Team members updated');
      await fetchTeams();
      cancelEditTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update team');
    } finally {
      setSavingTeam(false);
    }
  };

  const filteredMemberUsers = allUsers.filter(
    (u) => u.name?.toLowerCase().includes(memberSearch.toLowerCase()) || u.email?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your financial overview</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-40"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          <DashboardStats summary={summary} role={user?.role} />

          {['superadmin', 'hr', 'manager'].includes(user?.role) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardChart
                type="bar"
                data={chartData?.monthly}
                title="Monthly Income vs Expenses (Last 6 Months)"
              />
              <DashboardChart
                type="pie"
                data={chartData?.categories}
                title="Expenses by Category"
              />
            </div>
          )}

          {/* Team Assignment Section (management only) */}
          {elevated && teams.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
                <p className="text-sm text-gray-400">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <div key={team._id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color || '#6366f1' }} />
                      <h3 className="text-sm font-semibold text-gray-800">{team.name}</h3>
                      <span className="text-xs text-gray-400 ml-auto">{team.members?.length ?? 0} members</span>
                    </div>

                    {editingTeam === team._id ? (
                      /* Inline member editor */
                      <div className="space-y-2">
                        {teamMembers.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {teamMembers.map((id) => {
                              const u = allUsers.find((x) => x._id === id);
                              return u ? (
                                <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: team.color || '#6366f1' }}>
                                  {u.name}
                                  <button type="button" onClick={() => toggleMember(id)} className="opacity-70 hover:opacity-100">&times;</button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                        <input
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search employees…"
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                          {filteredMemberUsers.map((u) => (
                            <label key={u._id} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50 text-xs">
                              <input type="checkbox" checked={teamMembers.includes(u._id)} onChange={() => toggleMember(u._id)} className="accent-indigo-600" />
                              <span className="font-medium text-gray-800">{u.name}</span>
                              {u.designation && <span className="text-indigo-500">{u.designation}</span>}
                              <span className="text-gray-400 capitalize">{u.role}</span>
                            </label>
                          ))}
                          {filteredMemberUsers.length === 0 && <p className="text-xs text-gray-400 text-center p-2">No users found</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={cancelEditTeam} className="flex-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white rounded-lg py-1.5">Cancel</button>
                          <button onClick={saveTeamMembers} disabled={savingTeam}
                            className="flex-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg py-1.5 font-semibold disabled:opacity-60">
                            {savingTeam ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Member avatars + edit button */
                      <>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {team.members?.length > 0 ? (
                            <>
                              {team.members.slice(0, 6).map((m) => (
                                <div key={m._id} title={m.name} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white text-white"
                                  style={{ backgroundColor: team.color || '#6366f1' }}>
                                  {m.name?.[0]?.toUpperCase() ?? '?'}
                                </div>
                              ))}
                              {team.members.length > 6 && (
                                <span className="text-xs text-gray-400 self-center pl-1">+{team.members.length - 6} more</span>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No members assigned</p>
                          )}
                        </div>
                        <button
                          onClick={() => startEditTeam(team)}
                          className="w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 border border-indigo-100 transition"
                        >
                          Assign Members
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <TransactionTable
            transactions={summary?.recentTransactions ?? []}
            title="Recent Transactions"
          />
        </>
      )}
    </div>
  );
}

export default DashboardPage;

