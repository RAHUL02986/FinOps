'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';

function OtpPrompt({ email, onSubmit, error, loading }) {
  const [otp, setOtp] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(otp);
      }}
      className="space-y-5"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="otp">OTP</label>
        <input
          id="otp"
          name="otp"
          type="text"
          required
          value={otp}
          onChange={e => setOtp(e.target.value)}
          className="input"
          placeholder="Enter OTP sent to admin"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
        {loading ? 'Verifying…' : 'Verify OTP'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  // Remove email/password from URL if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      ['email', 'password'].forEach((param) => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          changed = true;
        }
      });
      if (changed) {
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, []);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.otpRequired) {
        setOtpStep(true);
        setOtpEmail(result.email);
        setError('');
      } else if (result.user) {
        router.push(result.user.role === 'superadmin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err, err.response?.data);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (otp) => {
    setError('');
    setLoading(true);
    try {
      const result = await login(otpEmail, undefined, otp);
      if (result.user) {
        router.push(result.user.role === 'superadmin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FinOps Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {otpStep ? (
          <OtpPrompt email={otpEmail} onSubmit={handleOtpSubmit} error={error} loading={loading} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between mb-2 animate-fade-in">
                <span>{error}</span>
                <button
                  type="button"
                  aria-label="Dismiss error"
                  className="ml-4 text-xl leading-none focus:outline-none"
                  onClick={() => setError('')}
                >
                  &times;
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
