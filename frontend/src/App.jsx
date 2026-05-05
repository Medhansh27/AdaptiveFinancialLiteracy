import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './lib/api';
import { supabase } from './supabaseClient';
import AuthScreen from './screens/AuthScreen';
import Dashboard from './screens/Dashboard';
import ScenarioScreen from './screens/ScenarioScreen';
import ResultScreen from './screens/ResultScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import Landing from './screens/Landing';

const STATIC_SCENARIO_LIMIT = 12;

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [result, setResult] = useState(null);
  const [queuedScenario, setQueuedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetSimulationState = () => {
    setProfile(null);
    setScenario(null);
    setResult(null);
    setQueuedScenario(null);
    setScreen('dashboard');
    setError('');
  };

  useEffect(() => {
    let ignore = false;

    const loadSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!ignore) {
        setAuthUser(data.user);
        setAuthLoading(false);
      }
    };

    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      resetSimulationState();
      setAuthLoading(false);
    });

    return () => {
      ignore = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser?.id) return;
    setLoading(true);
    setError('');
    api.user(authUser.id)
      .then((data) => setProfile(data))
      .catch(() => setError('Could not load your saved profile. Please check the backend server.'))
      .finally(() => setLoading(false));
  }, [authUser?.id]);

  const start = async () => {
    if (!authUser?.id) return;
    setLoading(true);
    setScenario(null);
    setScreen('scenario');
    setError('');
    try {
      const next = await api.nextScenario(authUser.id);
      setScenario(next);
    } catch {
      setError('Could not load next scenario. Please check backend server on 127.0.0.1:8010.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (optionIndex) => {
    if (!authUser?.id) return;
    setLoading(true);
    setError('');
    try {
      const moneyBefore = profile?.money ?? 0;
      const submission = await api.submitScenario(authUser.id, { scenario_id: scenario.id, selected_option: optionIndex });
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          money: submission.balance,
          xp: submission.xp,
          level: submission.level,
          scenarios_completed: prev.scenarios_completed + 1
        };
      });
      setResult({ ...submission, money_before: moneyBefore, insight: 'Generating AI insight...' });
      setQueuedScenario(submission.next_scenario ?? null);
      if (submission.saved_to_database === false) {
        setError('Progress updated in the app, but the database save failed. Check the Supabase service role key and RLS policies.');
      }
      setScreen('result');
      setLoading(false);

      try {
        const insight = await api.aiInsight(authUser.id, {
          scenario_title: scenario.title,
          topic: scenario.topic,
          selected_option: scenario.options[optionIndex],
          is_correct: submission.correct,
          explanation: submission.explanation,
          money_change: submission.money_change
        });
        setResult((prev) => (prev ? { ...prev, insight: insight.insight } : prev));
      } catch {
        setResult((prev) => (prev ? { ...prev, insight: 'AI insight is unavailable right now.' } : prev));
      }
    } catch {
      setError('Could not submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    if (!authUser?.id) return;
    setLoading(true);
    setScenario(null);
    setScreen('scenario');
    setError('');
    try {
      let nextScenario;
      if (result?.follow_up) {
        setScenario(result.follow_up);
        setQueuedScenario(null);
        return;
      }

      const shouldUseAI = (profile?.scenarios_completed ?? 0) >= STATIC_SCENARIO_LIMIT;
      if (shouldUseAI) {
        const aiGenerated = await api.aiScenario(authUser.id, {
          type: result?.profile?.type ?? 'Unstable Decision Maker',
          weak_topics: result?.profile?.weak_topics ?? [],
          money: profile?.money
        });
        if (aiGenerated.title === scenario?.title) {
          nextScenario = await api.aiScenario(authUser.id, {
            type: result?.profile?.type ?? 'Unstable Decision Maker',
            weak_topics: result?.profile?.weak_topics ?? [],
            money: profile?.money
          });
        } else {
          nextScenario = aiGenerated;
        }
      } else {
        nextScenario = queuedScenario;
        if (!nextScenario) {
          nextScenario = await api.nextScenario(authUser.id);
        }
      }
      setScenario(nextScenario);
      setQueuedScenario(null);
    } catch {
      setError('Could not load next scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) return <div className="flex justify-center items-center h-screen bg-slate-950"><div className="loader"></div></div>;
  if (!authUser) {
    if (window.location.pathname === '/login') return <AuthScreen />;
    return <Landing />;
  }
  if (!profile) return <div className="flex justify-center items-center h-screen bg-slate-950"><div className="loader"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-900 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <p className="mr-auto self-center text-sm text-white/70">👤 {authUser.user_metadata?.username || authUser.email}</p>
          <button className="rounded-lg bg-white/20 px-4 py-2" onClick={() => setScreen('dashboard')}>Dashboard</button>
          <button className="rounded-lg bg-white/20 px-4 py-2" onClick={() => setScreen('leaderboard')}>Leaderboard</button>
          <button className="rounded-lg bg-white/20 px-4 py-2" onClick={logout}>Log Out</button>
        </div>
        {profile.money < 3000 && (
          <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-rose-200">
            You are entering a financial crisis zone
          </p>
        )}
        {error && <p className="mb-4 rounded-lg bg-rose-500/20 px-4 py-2 text-rose-200">{error}</p>}
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {screen === 'dashboard' && <Dashboard profile={profile} onStart={start} loading={loading} />}
            {screen === 'scenario' && <ScenarioScreen scenario={scenario} onSubmit={submit} loading={loading} />}
            {screen === 'result' && result && <ResultScreen result={result} onNext={next} loading={loading} />}
            {screen === 'leaderboard' && <LeaderboardScreen currentUserId={profile.id} currentUserName={profile.name} userXP={profile.xp} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
