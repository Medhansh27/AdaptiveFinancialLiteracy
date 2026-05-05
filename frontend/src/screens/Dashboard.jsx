import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';

export default function Dashboard({ profile, onStart, loading }) {
  const progress = (profile.xp % 500) / 5;
  return (
    <GlassCard className="p-8">
      <h1 className="text-4xl font-bold">FinSim</h1>
      <p className="mt-2 text-white/80">Adaptive Financial Simulation Platform</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Money" value={`₹${profile.money.toLocaleString()}`} />
        <Stat label="Level" value={profile.level} />
        <Stat label="Completed" value={profile.scenarios_completed} />
      </div>
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">Level {profile.level} • {profile.xp % 500}/500 XP</p>
        <div className="h-3 rounded-full bg-white/20 overflow-hidden progress-bar">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 progress"
            style={{
              width: `${(profile.xp % 500) / 5}%`,
              transition: "width 0.6s ease"
            }}
          />
        </div>
      </div>
      <button onClick={onStart} disabled={loading} className="mt-8 rounded-xl bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400">
        {loading ? 'Loading…' : 'Start Simulation'}
      </button>
    </GlassCard>
  );
}

function Stat({ label, value }) {
  return <div className="rounded-xl bg-white/10 p-4"><p className="text-sm text-white/70">{label}</p><p className="text-2xl font-bold">{value}</p></div>;
}
