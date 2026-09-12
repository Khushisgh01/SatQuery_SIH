import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar } from '../lib/profileAPI';

const CENTRES = [
  'ISRO Headquarters, Bengaluru',
  'NRSC, Hyderabad',
  'SAC, Ahmedabad',
  'ISTRAC, Bengaluru',
  'VSSC, Thiruvananthapuram',
  'URSC (ISAC), Bengaluru',
  'LPSC, Thiruvananthapuram',
  'SDSC SHAR, Sriharikota',
  'IIRS, Dehradun',
  'NESAC, Shillong',
  'DECU, Ahmedabad',
];

const DESIGNATIONS = [
  'Scientist/Engineer SC',
  'Scientist/Engineer SD',
  'Scientist/Engineer SE',
  'Scientist/Engineer SF',
  'Scientist/Engineer SG',
  'Group Director',
  'Deputy Director',
  'Project Scientist',
  'Research Fellow',
  'Junior Research Fellow',
];

const SPECIALIZATIONS = [
  'Optical remote sensing',
  'SAR imagery analysis',
  'Change detection',
  'GIS and spatial analysis',
  'Photogrammetry',
  'Disaster management support',
  'Geospatial data engineering',
];

function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#F2EDE6]/50 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-[#0A0A0F] border border-[rgba(212,168,67,0.2)] rounded-[4px] px-3 py-2.5 text-sm text-[#F2EDE6] placeholder-[#F2EDE6]/25 focus:outline-none focus:border-[rgba(212,168,67,0.6)] disabled:opacity-50 disabled:cursor-not-allowed";

export default function ProfilePage({ onBack }) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  
  const [form, setForm] = useState({
    full_name: '',
    employee_id: '',
    designation: '',
    centre: '',
    department: '',
    specialization: '',
    phone: '',
  });

  // Keep form updated when profile data finishes fetching
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        employee_id: profile.employee_id || '',
        designation: profile.designation || '',
        centre: profile.centre || '',
        department: profile.department || '',
        specialization: profile.specialization || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isEditing) return; // Guard clause to prevent accidental submissions

    setError('');
    setSaving(true);
    try {
      await updateProfile(user.id, form);
      await refreshProfile();
      setNotice('Profile updated.');
      setIsEditing(false);
      setTimeout(() => setNotice(''), 2600);
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      await uploadAvatar(user.id, file);
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'Could not upload avatar.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F2EDE6]">
      <header className="h-14 border-b border-[rgba(212,168,67,0.15)] px-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-7 h-7 flex items-center justify-center text-[#F2EDE6]/50 hover:text-[#D4A843] transition-colors -ml-1"
          aria-label="Back to chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="font-['Space_Mono'] text-[13px] tracking-wider">PROFILE</span>
      </header>

      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-16 h-16 rounded-full object-cover border border-[rgba(212,168,67,0.3)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[rgba(212,168,67,0.12)] border border-[rgba(212,168,67,0.3)] flex items-center justify-center font-['Space_Mono'] text-lg text-[#D4A843]">
                {initialsOf(profile?.full_name)}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D4A843] flex items-center justify-center cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="text-base font-medium">{profile?.full_name || '\u2014'}</p>
            <p className="text-sm text-[#F2EDE6]/50">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Full name">
            <input
              type="text"
              value={form.full_name}
              onChange={set('full_name')}
              disabled={!isEditing}
              className={inputClass}
            />
          </Field>

          <Field label="Employee ID">
            <input
              type="text"
              value={form.employee_id}
              onChange={set('employee_id')}
              disabled={!isEditing}
              placeholder="e.g. ISRO-2019-4471"
              className={inputClass}
            />
          </Field>

          <Field label="Designation">
            <input
              list="designation-options"
              value={form.designation}
              onChange={set('designation')}
              disabled={!isEditing}
              placeholder="e.g. Scientist/Engineer SD"
              className={inputClass}
            />
            <datalist id="designation-options">
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>

          <Field label="Centre">
            <input
              list="centre-options"
              value={form.centre}
              onChange={set('centre')}
              disabled={!isEditing}
              placeholder="e.g. NRSC, Hyderabad"
              className={inputClass}
            />
            <datalist id="centre-options">
              {CENTRES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Department / division">
            <input
              type="text"
              value={form.department}
              onChange={set('department')}
              disabled={!isEditing}
              placeholder="e.g. Disaster Management Support Programme"
              className={inputClass}
            />
          </Field>

          <Field label="Specialization">
            <input
              list="specialization-options"
              value={form.specialization}
              onChange={set('specialization')}
              disabled={!isEditing}
              placeholder="e.g. SAR imagery analysis"
              className={inputClass}
            />
            <datalist id="specialization-options">
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>

          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              disabled={!isEditing}
              placeholder="Official contact number"
              className={inputClass}
            />
          </Field>

          {error && <p className="text-[12px] text-[#F47216] font-['Space_Mono']">{error}</p>}
          {notice && <p className="text-[12px] text-[#D4A843] font-['Space_Mono']">{notice}</p>}

          <div className="flex gap-3 pt-2">
            {isEditing ? (
              <>
                <button
                  type="submit"
                  disabled={saving}
                  className="font-['Space_Mono'] text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-[4px] bg-[#D4A843] text-[#0A0A0F] font-bold hover:bg-[#e0b955] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving\u2026' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setForm({
                      full_name: profile?.full_name || '',
                      employee_id: profile?.employee_id || '',
                      designation: profile?.designation || '',
                      centre: profile?.centre || '',
                      department: profile?.department || '',
                      specialization: profile?.specialization || '',
                      phone: profile?.phone || '',
                    });
                  }}
                  className="font-['Space_Mono'] text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-[4px] border border-[rgba(212,168,67,0.3)] text-[#F2EDE6]/60 hover:text-[#F2EDE6] transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="font-['Space_Mono'] text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-[4px] border border-[rgba(212,168,67,0.4)] text-[#D4A843] hover:bg-[rgba(212,168,67,0.08)] transition-colors"
              >
                Edit profile
              </button>
            )}
          </div>
        </form>

        <div className="mt-10 pt-6 border-t border-[rgba(212,168,67,0.15)]">
          <button
            type="button"
            onClick={signOut}
            className="font-['Space_Mono'] text-[11px] uppercase tracking-wider text-[#F2EDE6]/40 hover:text-[#F47216] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}