import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';

const STEPS = [
  { key: 'age', label: 'Age', type: 'number', placeholder: 'e.g. 24' },
  { key: 'occupation', label: 'Occupation', type: 'text', placeholder: 'e.g. Software Engineer' },
  { key: 'income_range', label: 'Income Range', type: 'select', options: ['Low', 'Mid', 'High', 'Stable Mid Income'] },
  { key: 'savings_habit', label: 'Savings Habit', type: 'select', options: ['Rarely Save', 'Sometimes Save', 'Consistent Saver'] },
  { key: 'debt_level', label: 'Debt Level', type: 'select', options: ['Low Debt', 'Moderate Debt', 'High Debt'] },
  { key: 'investment_knowledge', label: 'Investment Knowledge', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
  { key: 'risk_tolerance', label: 'Risk Tolerance', type: 'select', options: ['Low', 'Medium', 'High'] },
  { key: 'emergency_fund', label: 'Emergency Fund', type: 'select', options: ['None', '1-3 Months', '3-6 Months', '6+ Months'] },
  { key: 'financial_confidence', label: 'Financial Confidence', type: 'select', options: ['Low', 'Medium', 'High'] },
  { key: 'spending_behavior', label: 'Spending Behavior', type: 'select', options: ['Impulsive', 'Balanced', 'Planned'] }
];

export default function OnboardingScreen({ onSubmit, loading, stage = 'form' }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const active = STEPS[step];
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  if (stage === 'analyzing') {
    return (
      <GlassCard className="p-10 text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
        <h2 className="text-2xl font-bold">AI is analyzing your financial personality...</h2>
        <p className="mt-3 text-white/75">Building adaptive profile, strengths, weak areas and behavior scores.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-8">
      <p className="text-sm uppercase tracking-wider text-cyan-200">Financial Onboarding</p>
      <h2 className="mt-2 text-3xl font-bold">Let’s calibrate your simulator</h2>
      <div className="mt-5 h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-sm text-white/70">Step {step + 1} of {STEPS.length}</p>

      <motion.div key={active.key} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="mt-8">
        <p className="mb-2 text-lg text-white/90">{active.label}</p>
        {active.type === 'select' ? (
          <select
            value={values[active.key] || ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [active.key]: e.target.value }))}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none"
          >
            <option value="" className="bg-slate-900">Select an option</option>
            {active.options.map((option) => <option key={option} value={option} className="bg-slate-900">{option}</option>)}
          </select>
        ) : (
          <input
            type={active.type}
            placeholder={active.placeholder}
            value={values[active.key] || ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [active.key]: e.target.value }))}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45"
          />
        )}
      </motion.div>

      <div className="mt-8 flex justify-between">
        <button className="rounded-xl bg-white/10 px-4 py-2 disabled:opacity-40" disabled={step === 0 || loading} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
        {step < STEPS.length - 1 ? (
          <button
            className="rounded-xl bg-indigo-500 px-5 py-2 font-semibold disabled:opacity-40"
            disabled={!values[active.key] || loading}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Next
          </button>
        ) : (
          <button
            className="rounded-xl bg-cyan-500 px-5 py-2 font-semibold disabled:opacity-40"
            disabled={loading || !values[active.key]}
            onClick={() => onSubmit({ ...values, age: Number(values.age) || 0 })}
          >
            Finish Setup
          </button>
        )}
      </div>
    </GlassCard>
  );
}
