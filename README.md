# FinSim – Adaptive Financial Simulation Platform

A production-quality MVP that teaches financial literacy through interactive scenarios, adaptive difficulty, gamified progression, and AI coaching insights.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Framer Motion
- **Backend:** FastAPI (Python)
- **Data:** In-memory scenario + user state for demo readiness

## Folder Structure
```
AdaptiveFinancialLiteracy/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── scenarios.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── screens/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

## Backend APIs
- `GET /scenario/next`
- `POST /scenario/submit`
- `POST /ai/insight`
- `GET /leaderboard`
- `GET /user/profile`

## Features Implemented
- Scenario-based simulation (9 real-life scenarios)
- Virtual economy (₹10,000 start, reward/penalty effects)
- XP + level system with thresholds every 500 XP
- Leaderboard sorted by money then XP
- AI insight endpoint with OpenAI call + graceful fallback
- Behavior tracking (`weak_topics`, `accuracy_per_difficulty`)
- Adaptive difficulty and weak-topic scenario targeting
- Glassmorphism + gradients + animation-rich UI

## Run Instructions
### 1) Start backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Optional for real AI insights:
export OPENAI_API_KEY=your_key_here
uvicorn app.main:app --reload --port 8000
```

### 2) Start frontend
```bash
cd frontend
npm install
npm run dev
```

Optional frontend env:
```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
```

Open `http://localhost:5173`.

## Notes
- No authentication is included by design.
- State is in-memory (refreshing backend resets demo user).
