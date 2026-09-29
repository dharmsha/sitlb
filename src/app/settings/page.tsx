"use client";

import { useState, FormEvent } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: FormEvent) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (newPass.length < 6) {
      setMsg({ type: 'error', text: '❌ Naya password kam se kam 6 characters ka hona chahiye!' });
      return;
    }
    if (newPass !== confirmPass) {
      setMsg({ type: 'error', text: '❌ Naya password aur confirm password match nahi kar rahe!' });
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('User not logged in');
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      setMsg({ type: 'success', text: '✅ Password successfully change ho gaya!' });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setMsg({ type: 'error', text: '❌ Current password galat hai!' });
      } else {
        setMsg({ type: 'error', text: '❌ ' + err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-xl">
        <h1 className="text-xl font-black text-slate-800 mb-4 text-center">🔑 Change Password</h1>

        {msg.text && (
          <div className={`mb-3 text-xs font-bold px-3 py-2 rounded-xl border-2 ${
            msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleChange} className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Password</label>
            <input type="password" required value={currentPass} onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">New Password</label>
            <input type="password" required value={newPass} onChange={(e) => setNewPass(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confirm New Password</label>
            <input type="password" required value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 disabled:opacity-50 text-sm">
            {loading ? '⏳ Updating...' : '💾 Change Password'}
          </button>
          <button type="button" onClick={() => router.push('/')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm">
            ← Back to Billing
          </button>
        </form>
      </div>
    </div>
  );
}