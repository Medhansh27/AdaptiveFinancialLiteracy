create table if not exists financial_profiles (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  age int,
  occupation text,
  income_range text,
  savings_habit text,
  debt_level text,
  investment_knowledge text,
  risk_tolerance text,
  emergency_fund text,
  financial_confidence text,
  spending_behavior text,
  personality_type text,
  weak_areas jsonb default '[]'::jsonb,
  strengths jsonb default '[]'::jsonb,
  risk_score int default 0,
  discipline_score int default 0,
  panic_score int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_financial_profiles_user_id on financial_profiles(user_id);

create table if not exists behavior_tracking (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  category text not null,
  behavior_type text not null,
  severity int default 1,
  timestamp timestamptz default now()
);

create index if not exists idx_behavior_tracking_user_id on behavior_tracking(user_id);
