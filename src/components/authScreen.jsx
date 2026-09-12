import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Starfield from './Starfield';

/* ------------------------------------------------------------------ */
/* AuthScreen — single screen that toggles between Login and Signup.  */
/* Signup collects a full name, which Supabase stores in               */
/* user_metadata.full_name — that's what shows up on generated PDFs.  */
/* ------------------------------------------------------------------ */

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your name — it appears on generated reports.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email, password, fullName.trim());
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setNotice('Account created. Check your email to confirm, then log in.');
          setMode('login');
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) setError(signInError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4 relative isolate overflow-hidden">
      <Starfield />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-6 h-6 rounded-full border border-[#D4A843] relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-[1px] bg-[#D4A843]" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-3 bg-[#D4A843]" />
          </div>
          <span className="font-['Space_Mono'] text-sm tracking-wider text-[#F2EDE6]">
            SATQUERY AI
          </span>
        </div>

        <div className="bg-[#141418] border border-[rgba(212,168,67,0.15)] rounded-[6px] p-6">
          <div className="flex mb-6 border border-[rgba(212,168,67,0.2)] rounded-[4px] overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setNotice('');
              }}
              className={`flex-1 py-2 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors ${
                mode === 'login'
                  ? 'bg-[rgba(212,168,67,0.12)] text-[#D4A843]'
                  : 'text-[#F2EDE6]/50 hover:text-[#F2EDE6]/80'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
                setNotice('');
              }}
              className={`flex-1 py-2 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors ${
                mode === 'signup'
                  ? 'bg-[rgba(212,168,67,0.12)] text-[#D4A843]'
                  : 'text-[#F2EDE6]/50 hover:text-[#F2EDE6]/80'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#F2EDE6]/50 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ananya Sharma"
                  className="w-full bg-[#0A0A0F] border border-[rgba(212,168,67,0.2)] rounded-[4px] px-3 py-2.5 text-sm text-[#F2EDE6] placeholder-[#F2EDE6]/25 focus:outline-none focus:border-[rgba(212,168,67,0.6)]"
                />
              </div>
            )}

            <div>
              <label className="block font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#F2EDE6]/50 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#0A0A0F] border border-[rgba(212,168,67,0.2)] rounded-[4px] px-3 py-2.5 text-sm text-[#F2EDE6] placeholder-[#F2EDE6]/25 focus:outline-none focus:border-[rgba(212,168,67,0.6)]"
              />
            </div>

            <div>
              <label className="block font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#F2EDE6]/50 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[#0A0A0F] border border-[rgba(212,168,67,0.2)] rounded-[4px] px-3 py-2.5 text-sm text-[#F2EDE6] placeholder-[#F2EDE6]/25 focus:outline-none focus:border-[rgba(212,168,67,0.6)]"
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#F47216] font-['Space_Mono']">{error}</p>
            )}
            {notice && (
              <p className="text-[12px] text-[#D4A843] font-['Space_Mono']">{notice}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full font-['Space_Mono'] text-[11px] uppercase tracking-wider py-2.5 rounded-[4px] bg-[#D4A843] text-[#0A0A0F] font-bold hover:bg-[#e0b955] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}