"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push('/');
    } catch (err) {
      console.error(err);
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(err.code)) {
        setError('❌ Galat email ya password!');
      } else if (err.code === 'auth/invalid-email') {
        setError('❌ Email sahi nahi hai!');
      } else {
        setError('❌ Login fail: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200 mx-auto mb-3">
            <span className="text-3xl">🛍️</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">
            Ghanshyam <span className="text-red-600">Enterprises</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Billing System — Secure Login</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-xl">
          <h2 className="text-lg font-black text-slate-800 mb-4 text-center">🔐 Admin Login</h2>

          {error && (
            <div className="mb-3 bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold px-3 py-2 rounded-xl">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              placeholder="enterpriseghanshyam8@gmail.com"
              className="w-full mt-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm font-medium text-slate-700 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="mb-4">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Password</label>
            <div className="relative mt-1">
              <input
                type={showPass ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm font-medium text-slate-700 transition-all pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-red-600 px-2 py-1"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? '⏳ Logging in...' : '🔓 Login'}
          </button>

          <p className="text-[10px] text-slate-400 text-center mt-3">
            Default: enterpriseghanshyam8@gmail.com
          </p>
        </form>

        <p className="text-[10px] text-slate-400 text-center mt-4">
          © 2026 Ghanshyam Enterprises — All rights reserved
        </p>
      </div>
    </div>
  );
}