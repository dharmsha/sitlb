"use client";

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {   // 👈 ReactNode hatao
  const [user, setUser] = useState(null);              // 👈 User | null hatao
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u && pathname !== '/login') {
        router.replace('/login');
      } else if (u && pathname === '/login') {
        router.replace('/');
      }
    });
    return () => unsub();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname === '/login') {
    return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
  }

  if (!user) return null;

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}