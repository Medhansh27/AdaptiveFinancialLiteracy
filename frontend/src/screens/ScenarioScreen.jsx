import GlassCard from '../components/GlassCard';

export default function ScenarioScreen({ scenario, onSubmit, loading }) {
  if (!scenario) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="mx-auto loader"></div>
          <p className="mt-4 text-white/80">AI is generating your personalized scenario...</p>
        </div>
      </div>
    );
  }

  return (
    <GlassCard className="p-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{scenario.title}</h2>
        <span className="rounded-full bg-white/20 px-3 py-1 text-sm">{scenario.difficulty}</span>
      </div>
      <p className="mb-1 text-sm text-indigo-200">{scenario.topic}</p>
      <p className="mb-6 text-white/90">{scenario.situation}</p>
      <div className="grid gap-3">
        {scenario.options.map((option, i) => (
          <button key={option} onClick={() => onSubmit(i)} disabled={loading} className="rounded-xl border border-white/20 bg-white/10 p-4 text-left hover:bg-white/20">
            {option}
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
