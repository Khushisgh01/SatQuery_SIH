
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/SupabaseClient';
import { fetchProfile } from '../lib/profileAPI';

/* ------------------------------------------------------------------ */
/* AuthContext — wraps Supabase auth AND the profiles row so any        */
/* component can read who's logged in via useAuth(). The profiles row  */
/* (fields like designation, centre, department) is fetched once per   */
/* login and kept in sync via refreshProfile() after edits.            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Remembers the currently signed-in user's id so we can tell a real
  // sign-in/sign-out apart from Supabase's routine token-refresh events
  // (which also fire onAuthStateChange, e.g. whenever the tab regains
  // focus) — see the comment below for why that distinction matters.
  const lastUserIdRef = useRef(undefined);

  const loadProfile = useCallback(async (u) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      const p = await fetchProfile(u.id);
      setProfile(p);
    } catch (e) {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const initialUser = session?.user ?? null;
      lastUserIdRef.current = initialUser?.id ?? null;
      setUser(initialUser);
      await loadProfile(initialUser);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      const nextId = nextUser?.id ?? null;

      // Supabase re-validates/refreshes the session (and re-fires this
      // callback) far more often than the signed-in user actually
      // changes — most notably every time the tab regains focus. If we
      // blindly called setUser here on every event, we'd hand out a
      // brand-new `user` object each time even though it's still the
      // same person, and anything elsewhere keyed on that reference
      // (like the chat view's "load my sessions" effect) would treat
      // it as a fresh login and reset itself — which is exactly what
      // was making the chat go blank on every tab switch. So: only
      // touch state when the identity itself has actually changed.
      if (nextId === lastUserIdRef.current) return;

      lastUserIdRef.current = nextId;
      setUser(nextUser);
      loadProfile(nextUser);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = () => loadProfile(user);

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    // Profile row is the source of truth once it's loaded; auth metadata
    // and email are fallbacks for the brief window before it loads.
    displayName: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    avatarUrl: profile?.avatar_url || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
