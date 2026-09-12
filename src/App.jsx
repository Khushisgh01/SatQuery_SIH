import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SatQueryLandingPage from './components/hero';
import AuthScreen from './components/authScreen';
import SatQueryChat from './components/chat';
import ProfilePage from './components/ProfilePage';

function AppInner() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('landing'); // 'landing' | 'chat' | 'profile'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <span className="font-['Space_Mono'] text-[12px] text-[#F2EDE6]/40 tracking-wider">
          LOADING…
        </span>
      </div>
    );
  }

  if (view === 'landing') {
    return <SatQueryLandingPage onLaunchDemo={() => setView('chat')} />;
  }

  if (!user) {
    return <AuthScreen onBack={() => setView('landing')} />;
  }

  if (view === 'profile') {
    return <ProfilePage onBack={() => setView('chat')} />;
  }

  return <SatQueryChat onOpenProfile={() => setView('profile')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}