import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';

export default function ResultScreen({ result, onNext, loading }) {
  const projection = result.future_projection;

  return (
    <GlassCard className="p-8">
      <h2 className={`text-3xl font-bold ${result.correct ? 'text-emerald-300' : 'text-rose-300'}`}>
        {result.correct ? '✅ Correct Decision' : '❌ Wrong Decision'}
      </h2>
      <p className="mt-3 text-sm uppercase tracking-wide text-indigo-200">Money Impact</p>
      <motion.p className="mt-4 text-2xl font-semibold" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
        {result.money_change > 0 ? '+' : ''}₹{result.money_change}
      </motion.p>
      <p className="mt-3 text-sm uppercase tracking-wide text-indigo-200">XP Update</p>
      <p className="mt-1 text-lg font-medium text-white/90">
        XP Change: 
        <span style={{ color: result.xp_change > 0 ? 'green' : 'red' }}>
          {result.xp_change > 0 ? '+' : ''}{result.xp_change}
        </span>
        &nbsp;XP
      </p>
      <p className="mt-3 text-white/80">{result.explanation}</p>
      <div className="mt-5 rounded-xl bg-indigo-950/50 p-4">
        <p className="text-sm uppercase tracking-wide text-indigo-200">AI Insight</p>
        <p className="mt-2 text-white/90">{result.insight}</p>
      </div>
      <div className="mt-4 rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-4">
        <p className="text-sm uppercase tracking-wide text-fuchsia-200">Coaching Timeline</p>
        <p className="mt-2 text-white/90">Behavior Signal: {result.behavior_signal || (result.correct ? 'improving' : 'needs_attention')}</p>
        <p className="mt-1 text-white/80">Adaptive Summary: {result.correct ? 'Keep compounding disciplined actions.' : 'Recover with one concrete action before the next scenario.'}</p>
      </div>
      {result.weak_topic && (
        <div className="mt-4 rounded-xl border border-indigo-300/40 bg-indigo-500/10 p-4">
          <p className="text-sm uppercase tracking-wide text-indigo-200">🎯 Adaptive System Update</p>
          <p className="mt-2 text-white/90">You are struggling with: {result.weak_topic}</p>
          <p className="mt-1 text-white/80">Next scenarios will focus more on this topic.</p>
          <p className="mt-1 text-white/80">Difficulty adjusted: {result.difficulty}</p>
        </div>
      )}
      {projection && (
        <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4">
          <h3 className="text-lg font-semibold">📊 Financial Timeline Impact</h3>
          <p className="mt-2 text-white/90">Current: ₹{projection.current.toLocaleString()}</p>
          <p className="mt-1 text-white/90">Projected (3 Months): ₹{projection.future.toLocaleString()}</p>
          <p className="mt-1 text-white/90">
            Net Change: {projection.change > 0 ? '+' : ''}₹{projection.change.toLocaleString()}
          </p>
        </div>
      )}
      {result.profile && (
        <div className="mt-4 rounded-xl border border-cyan-300/40 bg-cyan-500/10 p-4">
          <h4 className="text-sm uppercase tracking-wide text-cyan-200">🧠 Financial Personality</h4>
          <p className="mt-2 text-white/90">{result.profile.type}</p>
          <p className="mt-1 text-white/80">
            Weak Areas: {result.profile.weak_topics.length ? result.profile.weak_topics.join(', ') : 'None'}
          </p>
        </div>
      )}
      <p className="mt-4 text-white/85">{result.consequence}</p>
      <button onClick={onNext} disabled={loading} className="mt-6 rounded-xl bg-indigo-500 px-5 py-3">
        {result.follow_up ? 'Continue' : 'Next Scenario'}
      </button>
    </GlassCard>
  );
}
