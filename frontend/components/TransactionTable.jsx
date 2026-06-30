'use client';


import { useState } from 'react';
import Link from 'next/link';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function TransactionTable({ transactions = [], title = 'Recent Transactions', showAll = false }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const pageCount = Math.ceil(transactions.length / pageSize);
  const paginated = transactions.slice((page - 1) * pageSize, page * pageSize);
  if (!transactions.length) {
    return (
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="text-center py-10 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          No transactions yet
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category / Source</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((txn) => (
              <tr key={txn._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">{formatDate(txn.date)}</td>
                <td className="px-6 py-3.5">
                  <span className={`badge ${txn.type === 'income'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {txn.type}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-gray-700">
                  {txn.category || txn.source || '—'}
                </td>
                <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">
                  {txn.description || '—'}
                </td>
                <td className={`px-6 py-3.5 text-right font-semibold whitespace-nowrap ${
                  txn.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {pageCount > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
