import { supabase } from '../supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8010' : 'https://adaptivefinancialliteracy.onrender.com');

async function request(path, options = {}) {
  const { userId, headers, ...fetchOptions } = options;
  if (!userId) {
    throw new Error('Missing authenticated user id');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Missing authenticated session');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-Id': userId,
      ...(headers || {})
    },
    ...fetchOptions
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export const api = {
  user: (userId) => request('/user', { userId }),
  profileMe: (userId) => request('/profile/me', { userId }),
  profileSetup: (userId, payload) => request('/profile/setup', { userId, method: 'POST', body: JSON.stringify(payload) }),
  profileInsights: (userId) => request('/profile/insights', { userId }),
  nextScenario: (userId) => request('/scenario/next', { userId }),
  generateScenario: (userId, payload) => request('/generate-scenario', { userId, method: 'POST', body: JSON.stringify(payload) }),
  submitScenario: (userId, payload) => request('/scenario/submit', { userId, method: 'POST', body: JSON.stringify({ ...payload, user_id: userId }) }),
  aiInsight: (userId, payload) => request('/ai/insight', { userId, method: 'POST', body: JSON.stringify(payload) }),
  aiScenario: (userId, payload) => request('/ai/scenario', { userId, method: 'POST', body: JSON.stringify(payload) }),
  leaderboard: (userId) => request('/leaderboard', { userId })
};
