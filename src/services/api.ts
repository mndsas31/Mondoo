export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mondoflix_token');
  
  let guestId = localStorage.getItem('mondoflix_guest_id');
  if (!guestId) {
    guestId = `guest-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('mondoflix_guest_id', guestId);
  }

  let guestName = localStorage.getItem('mondoflix_guest_name');
  if (!guestName) {
    guestName = `Guest ${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem('mondoflix_guest_name', guestName);
  }

  let effectiveUserId = guestId;
  const storedUser = localStorage.getItem('mondoflix_user');
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u.id || u.email) {
        effectiveUserId = String(u.id || u.email);
        if (u.username) guestName = u.username;
      }
    } catch {}
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Guest-Id': guestId,
    'X-User-Id': effectiveUserId,
    'X-Guest-Name': encodeURIComponent(guestName),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return null as any;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `HTTP Error ${res.status}`);
  }

  return data;
}


