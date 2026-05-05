import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function LeaderboardScreen({ currentUserId, currentUserName, userXP }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadLeaderboard = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.leaderboard(currentUserId);
        if (!ignore) {
          setLeaders(data.users || []);
        }
      } catch {
        if (!ignore) {
          setError('Could not load leaderboard. Please check the backend server and try again.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      ignore = true;
    };
  }, [currentUserId, userXP]);

  const leaderboard = useMemo(() => {
    const withDynamicUser = leaders.map((user) =>
      user.id && currentUserId && user.id === currentUserId ? { ...user, xp: userXP, name: currentUserName || user.name } : user
    );
    return [...withDynamicUser].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }, [leaders, currentUserId, currentUserName, userXP]);

  return (
    <GlassCard className="p-8">
      <h2 className="mb-4 text-3xl font-bold">Leaderboard</h2>
      {loading && <p className="rounded-xl bg-white/10 p-4 text-white/80">Loading leaderboard...</p>}
      {error && <p className="rounded-xl border border-rose-400/40 bg-rose-500/20 p-4 text-rose-100">{error}</p>}
      <div className="space-y-2">
        {leaderboard.map((user, index) => {
          const isCurrentUser = user.id && currentUserId && user.id === currentUserId;

          return (
            <div key={user.id || user.name} className={`flex items-center justify-between rounded-xl p-4 ${isCurrentUser ? 'bg-indigo-500/40' : 'bg-white/10'}`}>
              <p>#{index + 1} {user.username || user.name}</p>
              <p>Rs {user.money} - {user.xp} XP</p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
