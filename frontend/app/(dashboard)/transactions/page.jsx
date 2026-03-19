"use client";

import { useState, useEffect } from "react";
import { expensesAPI, incomeAPI, accountsAPI, teamsAPI, usersAPI, transactionsAPI } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";

const STATUS_OPTIONS = ["All", "Approved", "Pending", "Rejected"];

function TransactionRow({ txn, user, onAction }) {
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === 'superadmin';
  return (
    <tr>
      <td>{new Date(txn.date).toLocaleDateString()}</td>
      <td>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${txn.type === "expense" ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>{txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}</span>
      </td>
      <td>{txn.account && txn.account.name ? txn.account.name : '-'}</td>
      <td className={txn.type === "expense" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
        {txn.type === "expense" ? "-" : "+"}
        ₹{txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>
      <td>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${txn.status === 'Approved' ? 'bg-green-100 text-green-700' : txn.status === 'Draft' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>{txn.status}</span>
      </td>
      <td className="relative">
        {isAdmin && (
          <>
            <button className="text-gray-400 hover:text-gray-700" onClick={() => setOpen((v) => !v)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h.01M12 12h.01M18 12h.01" />
              </svg>
            </button>
            {open && (
              <div className="absolute right-0 z-10 bg-white border rounded shadow w-36 mt-2">
                {(txn.status === 'Pending' || txn.status === 'Draft') && (
                  <>
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { setOpen(false); onAction('approve', txn); }}>Approve</button>
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { setOpen(false); onAction('reject', txn); }}>Reject</button>
                  </>
                )}
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { setOpen(false); onAction('view', txn); }}>View Details</button>
                <button className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100" onClick={() => { setOpen(false); onAction('delete', txn); }}>Delete</button>
              </div>
            )}
          </>
        )}
      </td>
    </tr>
  );
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [viewTxn, setViewTxn] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const res = await transactionsAPI.getAll({});
      setTransactions(res.data.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    }
    fetchData();
  }, []);

  const filteredTxns = statusFilter === "All" ? transactions : transactions.filter(t => t.status === statusFilter);

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
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Transactions</h1>
      <p className="text-gray-500 mb-6">Manage and track all financial movements</p>
      <div className="flex items-center gap-3 mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" onClick={() => setShowModal(true)}>+ Add Transaction</button>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">DATE</th>
              <th className="text-left">TYPE</th>
              <th className="text-left">ACCOUNT</th>
              <th className="text-left">AMOUNT (INR)</th>
              <th className="text-left">STATUS</th>
              <th className="text-left">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTxns.map(txn => <TransactionRow key={txn._id} txn={txn} user={user} onAction={handleAction} />)}
          </tbody>
        </table>
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
              <div><b>Date:</b> {new Date(viewTxn.date).toLocaleString()}</div>
              <div><b>Type:</b> {viewTxn.type}</div>
              <div><b>Amount:</b> ₹{viewTxn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div><b>Status:</b> {viewTxn.status}</div>
              <div><b>Account:</b> {viewTxn.account?.name || '-'}</div>
              <div><b>Team:</b> {viewTxn.team?.name || '-'}</div>
              <div><b>Employee:</b> {viewTxn.employee?.name || '-'}</div>
              <div><b>Category:</b> {viewTxn.category || '-'}</div>
              <div><b>Description:</b> {viewTxn.description || '-'}</div>
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
  const [categories, setCategories] = useState(["General", "Office", "Travel", "Supplies", "Other","rent","utilities","salaries","marketing","software","maintenance"]);

  useEffect(() => {
    async function fetchDropdowns() {
      try {
        const [accRes, teamRes, empRes] = await Promise.all([
          accountsAPI.getAll({}),
          teamsAPI.getAll(),
          usersAPI.getAll({})
        ]);
        setAccounts(accRes.data.data || []);
        setTeams(teamRes.data.data || []);
        setEmployees(empRes.data.data || []);
      } catch (err) {
        // Show error or fallback
        setAccounts([]);
        setTeams([]);
        setEmployees([]);
        // Optionally: alert('Failed to load dropdowns');
      }
    }
    fetchDropdowns();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
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
      window.location.reload(); // quick refresh for now
    } catch (err) {
      alert('Failed to create transaction');
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
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account</label>
            <select value={account} onChange={e => setAccount(e.target.value)} className="input w-full">
              <option value="">Select account</option>
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>{acc.name} ({acc.bankName})</option>
                ))}
            </select>
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
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input w-full">
              <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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
