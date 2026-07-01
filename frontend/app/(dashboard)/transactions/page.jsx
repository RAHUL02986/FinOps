"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { expensesAPI, incomeAPI, accountsAPI, teamsAPI, usersAPI, transactionsAPI } from "../../../lib/api";
import { FaArrowDown, FaArrowUp, FaExchangeAlt, FaCheckCircle, FaClock, FaTimesCircle, FaEllipsisV } from 'react-icons/fa';
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";

const STATUS_OPTIONS = ["All", "Approved", "Pending", "Rejected", "Draft"];

function TransactionRow({ txn, user, onAction, highlighted }) {
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  
  const typeIcon = txn.type === 'income' ? <FaArrowUp className="text-green-500 inline mr-1" />
    : txn.type === 'expense' ? <FaArrowDown className="text-red-500 inline mr-1" />
    : <FaExchangeAlt className="text-blue-500 inline mr-1" />;

  const statusIcon = txn.status === 'Approved' ? <FaCheckCircle className="inline mr-1 text-green-500" />
    : txn.status === 'Pending' ? <FaClock className="inline mr-1 text-yellow-500" />
    : <FaTimesCircle className="inline mr-1 text-gray-400" />;

  return (
    <tr id={highlighted ? 'highlighted-txn' : undefined} className={`even:bg-gray-50 hover:bg-indigo-50 transition-colors group ${highlighted ? 'animate-pulse ring-2 ring-indigo-300 bg-indigo-50' : ''}`}>
      <td className="py-3 px-4 whitespace-nowrap text-gray-700">{new Date(txn.date).toLocaleDateString()}</td>
      <td className="py-3 px-4 font-semibold">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${txn.type === "expense" ? "bg-red-50 text-red-600 border-red-200" : txn.type === 'income' ? "bg-green-50 text-green-600 border-green-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>{typeIcon}{txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}</span>
      </td>
      <td className="py-3 px-4 text-gray-700">{txn.account && txn.account.name ? txn.account.name : '-'}</td>
      <td className={`py-3 px-4 font-semibold ${txn.type === "expense" ? "text-red-600" : "text-green-600"}`}>{txn.type === "expense" ? "-" : "+"}₹{txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${txn.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : txn.status === 'Draft' ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{statusIcon}{txn.status}</span>
      </td>
      <td className="py-3 px-4 relative text-right">
        {isAdmin && (
          <div className="inline-block text-left">
            <button className="text-gray-400 hover:text-indigo-600 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400" onClick={() => setOpen((v) => !v)}>
              <FaEllipsisV />
            </button>
            {open && (
              <div className="absolute right-0 z-20 bg-white border rounded shadow w-40 mt-2 animate-fade-in">
                {(txn.status === 'Pending' || txn.status === 'Draft') && (
                  <>
                    <button className="block w-full text-left px-4 py-2 hover:bg-indigo-50" onClick={() => { setOpen(false); onAction('approve', txn); }}>✅ Approve</button>
                    <button className="block w-full text-left px-4 py-2 hover:bg-indigo-50" onClick={() => { setOpen(false); onAction('reject', txn); }}>❌ Reject</button>
                  </>
                )}
                <button className="block w-full text-left px-4 py-2 hover:bg-indigo-50" onClick={() => { setOpen(false); onAction('view', txn); }}>🔍 View Details</button>
                <button className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50" onClick={() => { setOpen(false); onAction('delete', txn); }}>🗑️ Delete</button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const highlightParam = searchParams?.get ? searchParams.get('highlight') : null;
  const [accounts, setAccounts] = useState([]);
  const [accountFilter, setAccountFilter] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [viewTxn, setViewTxn] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [highlightedId, setHighlightedId] = useState(null);
  const PAGE_SIZE = 10;

  async function fetchTransactions(pageNum = 1, status = statusFilter, account = accountFilter) {
    const params = { page: pageNum, limit: PAGE_SIZE };
    if (status !== 'All') params.status = status;
    if (account !== 'All') params.account = account;
    const res = await transactionsAPI.getAll(params);
    setTransactions(res.data.data);
    setTotalPages(res.data.pages || 1);
    setTotalCount(res.data.total || 0);
  }

  useEffect(() => {
    fetchTransactions(page, statusFilter, accountFilter);
  }, [page, statusFilter, accountFilter]);

  // Handle highlight param on initial load or when search params change
  useEffect(() => {
    if (!highlightParam) return;
    (async () => {
      try {
        const res = await transactionsAPI.getOne(highlightParam);
        const txn = res.data;
        if (!txn) return;

        // Ensure the highlighted transaction appears at the top
        setTransactions(prev => {
          const filtered = (prev || []).filter(t => t._id !== txn._id);
          return [txn, ...filtered];
        });
        setHighlightedId(txn._id);

        // Auto-scroll to highlighted row after DOM update
        setTimeout(() => {
          const el = document.getElementById('highlighted-txn');
          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);

        // Remove highlight after a short time
        setTimeout(() => setHighlightedId(null), 6000);
      } catch (err) {
        // ignore
      }
    })();
  }, [highlightParam]);

  useEffect(() => {
    async function fetchAccounts() {
      const res = await accountsAPI.getAll();
      setAccounts(res.data.data || []);
    }
    fetchAccounts();
  }, []);

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleAccountChange = (e) => {
    setAccountFilter(e.target.value);
    setPage(1);
  };

  async function handleAction(action, txn) {
    if (action === 'approve') {
      await transactionsAPI.update(txn._id, { status: 'Approved' });
      window.location.reload();
    } else if (action === 'reject') {
      await transactionsAPI.update(txn._id, { status: 'Rejected' });
      window.location.reload();
    } else if (action === 'delete') {
      setConfirmDelete(txn);
    } else if (action === 'view') {
      setViewTxn(txn);
    }
  }

  async function confirmDeleteTxn() {
    if (confirmDelete) {
      await transactionsAPI.remove(confirmDelete._id);
      setConfirmDelete(null);
      window.location.reload();
    }
  }

  return (
    <div className="p-0 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Transactions</h1>
      <p className="text-gray-500 mb-6">Manage and track all financial movements</p>
      
      {/* Filters Area with the clear button */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={statusFilter} onChange={handleStatusChange} className="border rounded px-3 py-2 text-sm bg-white">
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        
        <select value={accountFilter} onChange={handleAccountChange} className="border rounded px-3 py-2 text-sm bg-white">
          <option value="All">All Accounts</option>
          {accounts.map(acc => (
            <option key={acc._id} value={acc._id}>{acc.name}</option>
          ))}
        </select>

        {/* 👇 Clear Filter Button */}
        {(statusFilter !== "All" || accountFilter !== "All") && (
          <button
            onClick={() => {
              setStatusFilter("All");
              setAccountFilter("All");
              setPage(1);
            }}
            className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors px-2 py-1"
          >
            Clear Filters
          </button>
        )}

        <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold md:ml-auto" onClick={() => setShowModal(true)}>
          + Add Transaction
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-white border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Account</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Amount (INR)</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">No transactions found.</td>
              </tr>
            ) : (
              transactions.map(txn => <TransactionRow key={txn._id} txn={txn} user={user} onAction={handleAction} highlighted={highlightedId === txn._id} />)
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            className="btn-secondary px-3 py-1"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="btn-secondary px-3 py-1"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}

      {viewTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Transaction Details</h2>
              <button onClick={() => setViewTxn(null)} className="text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              <div><b>Date:</b> {viewTxn.date ? new Date(viewTxn.date).toLocaleDateString() : '-'}</div>
              <div><b>Type:</b> {viewTxn.type}</div>
              <div><b>Amount:</b> ₹{viewTxn.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div><b>Status:</b> {viewTxn.status}</div>
              <div><b>Account:</b> {viewTxn.account?.name || '-'}</div>
              <div><b>Team:</b> {viewTxn.team?.name || '-'}</div>
              <div><b>Employee:</b> {viewTxn.employee?.name || '-'}</div>
              <div><b>Category:</b> {viewTxn.category || '-'}</div>
              <div><b>Description:</b> {viewTxn.description || '-'}</div>
              <div><b>Added By:</b> {viewTxn.user?.name || '-'} ({viewTxn.user?.role || '-'})</div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8">
            <h2 className="text-xl font-semibold mb-4">Delete Transaction</h2>
            <p>Are you sure you want to delete this transaction?</p>
            <div className="flex gap-3 pt-4">
              <button className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={confirmDeleteTxn}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { categoriesAPI } from '../../../lib/api';

function TransactionModal({ onClose }) {
  const [type, setType] = useState("Expense");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(0);
  const [account, setAccount] = useState("");
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [balanceError, setBalanceError] = useState("");

  useEffect(() => {
    async function fetchDropdowns() {
      try {
        const [accRes, teamRes, empRes, catRes] = await Promise.all([
          accountsAPI.getAll({}),
          teamsAPI.getAll(),
          usersAPI.getAll({ page: 1, limit: 100 }),
          categoriesAPI.getAll()
        ]);
        setAccounts(accRes.data.data || []);
        setTeams(teamRes.data.data || []);
        setEmployees(empRes.data.data || []);
        setCategories(
          (catRes.data || []).filter(
            (c) => c.active && (type === 'Income' ? c.type === 'Income' : c.type === 'Expense')
          )
        );
      } catch (err) {
        setAccounts([]);
        setTeams([]);
        setEmployees([]);
        setCategories([]);
      }
    }
    fetchDropdowns();
  }, [type]);

  useEffect(() => {
    async function refreshEmployees() {
      try {
        const empRes = await usersAPI.getAll({});
        setEmployees(empRes.data.data || []);
      } catch {}
    }
    refreshEmployees();
  }, []);

  useEffect(() => {
    if (!team) return;
    (async () => {
      try {
        const empRes = await usersAPI.getAll({});
        setEmployees(empRes.data.data || []);
      } catch {}
    })();
  }, [team]);

  useEffect(() => {
    if (account && accounts.length > 0) {
      const acc = accounts.find(a => a._id === account);
      setSelectedAccount(acc || null);
    } else {
      setSelectedAccount(null);
    }
  }, [account, accounts]);

  useEffect(() => {
    if (type === 'Expense' && selectedAccount && amount > 0) {
      const minBalance = typeof selectedAccount.minimumBalance === 'number' ? selectedAccount.minimumBalance : 0;
      const newBalance = selectedAccount.currentBalance - amount;
      if (newBalance < minBalance) {
        setBalanceError(`Insufficient balance! Account balance (₹${selectedAccount.currentBalance.toLocaleString()}) cannot go below minimum balance (₹${minBalance.toLocaleString()})`);
      } else {
        setBalanceError("");
      }
    } else {
      setBalanceError("");
    }
  }, [type, amount, selectedAccount]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (balanceError) {
      alert(balanceError);
      return;
    }
    try {
      await transactionsAPI.create({
        type: type.toLowerCase(),
        date,
        amount,
        account: account || undefined,
        team: team || undefined,
        employee: employee || undefined,
        category: category || undefined,
        description,
      });
      onClose();
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create transaction');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">New Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-full" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input w-full">
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="input w-full" min="0" step="0.01" />
            {balanceError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {balanceError}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account</label>
            <select value={account} onChange={e => setAccount(e.target.value)} className="input w-full">
              <option value="">Select account</option>
              {accounts
                .filter(acc => acc.isActive !== false && (acc.type !== 'od_cc' || acc.includeInAvailableFunds))
                .map(acc => (
                  <option key={acc._id} value={acc._id}>{acc.name} - Bal: ₹{acc.currentBalance.toLocaleString()}</option>
                ))}
            </select>
            {selectedAccount && (
              <div className="mt-1 text-xs text-gray-600">
                Current Balance: ₹{selectedAccount.currentBalance.toLocaleString()} | Minimum Balance: ₹{(selectedAccount.minimumBalance || 0).toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Team (Optional)</label>
              <select value={team} onChange={e => setTeam(e.target.value)} className="input w-full">
                <option value="">None</option>
                {teams.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Employee (Optional)</label>
              <select value={employee} onChange={e => setEmployee(e.target.value)} className="input w-full">
                <option value="">None</option>
                {(team
                  ? (() => {
                      const selectedTeam = teams.find(t => t._id === team);
                      if (!selectedTeam) return [];
                      const normalize = (v) => (v || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
                      const teamNameNorm = normalize(selectedTeam.name);
                      const memberIds = (selectedTeam.members || [])
                        .map((m) => (typeof m === 'string' ? m : m?._id || m?.id))
                        .map((id) => id?.toString())
                        .filter(Boolean);

                      return employees.filter((emp) => {
                        const empIdStr = emp._id?.toString() || emp.id?.toString();
                        const matchesId = memberIds.includes(empIdStr);
                        const matchesDepartment = normalize(emp.department) === teamNameNorm;
                        return matchesId || matchesDepartment;
                      });
                    })()
                  : employees
                ).map(emp => {
                  const finalId = emp._id || emp.id;
                  return (
                    <option key={finalId} value={finalId}>{emp.name}</option>
                  );
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input w-full">
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input w-full" placeholder="What was this for?" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Transaction</button>
          </div>
        </form>
      </div>
    </div>
  );
}