import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../supabaseClient';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const signUp = async (emailValue, passwordValue, usernameValue) => {
    const { error: signUpError } = await supabase.auth.signUp({
      email: emailValue,
      password: passwordValue,
      options: {
        data: {
          username: usernameValue
        }
      }
    });

    if (signUpError) {
      console.error(signUpError);
      throw signUpError;
    }
  };

  const login = async (emailValue, passwordValue) => {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue
    });

    if (loginError) {
      console.error(loginError);
      throw loginError;
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        await signUp(email, password, username);
        setMessage('Account created. Check your email if confirmation is enabled, then log in.');
      } else {
        await login(email, password);
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-900 p-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-md place-items-center">
        <GlassCard className="w-full p-8">
          <h1 className="text-3xl font-bold">FinSim</h1>
          <p className="mt-2 text-white/75">{mode === 'signup' ? 'Create your account' : 'Log in to continue'}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-white/75">Email</span>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-indigo-300"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {mode === 'signup' && (
              <label className="block">
                <span className="text-sm text-white/75">Username</span>
                <input
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-indigo-300"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm text-white/75">Password</span>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-indigo-300"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            {error && <p className="rounded-lg bg-rose-500/20 px-4 py-3 text-sm text-rose-100">{error}</p>}
            {message && <p className="rounded-lg bg-emerald-500/20 px-4 py-3 text-sm text-emerald-100">{message}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-indigo-500 px-5 py-3 font-semibold hover:bg-indigo-400 disabled:opacity-60">
              {loading ? 'Please wait...' : mode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          </form>
          <button
            className="mt-5 w-full text-sm text-indigo-200 hover:text-white"
            onClick={() => {
              setMode((current) => (current === 'signup' ? 'login' : 'signup'));
              setError('');
              setMessage('');
            }}
          >
            {mode === 'signup' ? 'Already have an account? Log in' : 'Need an account? Sign up'}
          </button>
        </GlassCard>
      </div>
    </div>
  );
}
