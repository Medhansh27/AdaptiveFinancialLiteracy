export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl ${className}`}>
      {children}
    </div>
  );
}
