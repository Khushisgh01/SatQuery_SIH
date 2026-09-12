import { supabase } from './SupabaseClient';

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;

  // Keep auth metadata's full_name in sync so it stays correct as a
  // fallback anywhere the profile row hasn't loaded yet.
  if (fields.full_name) {
    await supabase.auth.updateUser({ data: { full_name: fields.full_name } });
  }

  return data;
}

// Overwrites any existing avatar at a fixed path per user, so storage
// doesn't accumulate old avatar files on every re-upload.
export async function uploadAvatar(userId, file) {
  const path = `${userId}/avatar-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust so the new avatar shows immediately instead of the
  // browser serving the previous file from cache at the same URL.
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

  await updateProfile(userId, { avatar_url: avatarUrl });
  return avatarUrl;
}