import json
import logging
import os
import random
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import openai
from pydantic import BaseModel, Field

from .scenarios import SCENARIOS
try:
    from jose import jwt
except Exception:
    jwt = None
try:
    from supabase import create_client
except Exception:
    create_client = None

dotenv_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='FinSim API')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

openai_api_key = os.getenv('OPENAI_API_KEY')
if openai_api_key:
    openai.api_key = openai_api_key
client = openai if openai_api_key else None

user = {
    'name': 'You', 'money': 10000, 'debt': 0, 'xp': 0, 'level': 1, 'scenarios_completed': 0,
    'weak_topics': defaultdict(int),
    'accuracy_per_difficulty': {'easy': {'correct': 0, 'total': 0}, 'medium': {'correct': 0, 'total': 0}, 'hard': {'correct': 0, 'total': 0}},
    'last_difficulty': 'easy'
}

mock_users = [
    {'id': 'mock-1', 'name': 'Aarav', 'money': 15200, 'xp': 900},
    {'id': 'mock-2', 'name': 'Maya', 'money': 14000, 'xp': 850},
    {'id': 'mock-3', 'name': 'Vihaan', 'money': 12500, 'xp': 780}
]
user_history = []
user_profile = {
    'correct': 0,
    'wrong': 0,
    'topics': {},
    'risk_score': 0
}

XP_PER_LEVEL = 500
CRISIS_THRESHOLD = 3000
USER_ID = '11111111-1111-1111-1111-111111111111'
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if create_client and SUPABASE_URL and SUPABASE_KEY else None
if supabase:
    logger.info('Supabase client initialized')
    if SUPABASE_KEY.startswith('sb_publishable'):
        logger.warning('Supabase key is publishable/anon-style. Database writes may fail if RLS is enabled; use a service role secret on the backend.')
else:
    logger.warning('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_KEY.')


def verify_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing auth token')

    token = authorization.split(' ', 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail='Missing auth token')

    if SUPABASE_JWT_SECRET and jwt:
        try:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=['HS256'], options={'verify_aud': False})
            user_id = payload.get('sub')
            if user_id:
                return user_id
        except Exception:
            logger.exception('JWT verification failed')

    if supabase:
        try:
            result = supabase.auth.get_user(token)
            auth_user = getattr(result, 'user', None)
            user_id = getattr(auth_user, 'id', None)
            if user_id:
                return user_id
        except Exception:
            logger.exception('Supabase token verification failed')

    raise HTTPException(status_code=401, detail='Invalid token')

class SubmitBody(BaseModel):
    scenario_id: int
    selected_option: int
    user_id: str | None = None

class InsightBody(BaseModel):
    scenario_title: str
    topic: str
    selected_option: str
    is_correct: bool
    explanation: str
    money_change: int


class AIScenarioBody(BaseModel):
    type: str = 'Unstable Decision Maker'
    weak_topics: list[str] = Field(default_factory=list)
    money: int | None = None

def default_user_state(user_id: str):
    return {
        'id': user_id,
        'name': 'You',
        'money': 10000,
        'debt': 0,
        'xp': 0,
        'level': 1,
        'scenarios_completed': 0,
        'weak_topics': {},
        'accuracy_per_difficulty': {
            'easy': {'correct': 0, 'total': 0},
            'medium': {'correct': 0, 'total': 0},
            'hard': {'correct': 0, 'total': 0}
        },
        'last_difficulty': 'easy',
        'correct': 0,
        'wrong': 0,
        'risk_score': 0,
        'topics': {},
        'seen_scenarios': []
    }


def choose_difficulty(state: dict):
    accuracy = state.get('correct', 0) / (state.get('correct', 0) + state.get('wrong', 0) + 1)
    if accuracy > 0.7:
        state['last_difficulty'] = 'hard'
    elif accuracy > 0.4:
        state['last_difficulty'] = 'medium'
    else:
        state['last_difficulty'] = 'easy'
    return state['last_difficulty']


def get_next_scenario(current_difficulty, seen_scenarios=None):
    seen = set(seen_scenarios or [])
    filtered = [s for s in SCENARIOS if s['difficulty'] == current_difficulty and s['id'] not in seen]
    if not filtered:
        filtered = [s for s in SCENARIOS if s['id'] not in seen]
    if not filtered:
        filtered = SCENARIOS
    return random.choice(filtered)


def serialize_scenario(scenario: dict | None):
    if not scenario:
        return None
    return {k: v for k, v in scenario.items() if k not in {'correct_option', 'follow_up'}}


def find_scenario(scenario_id: int):
    for scenario in SCENARIOS:
        if scenario['id'] == scenario_id:
            return scenario
        follow_up = scenario.get('follow_up', {}).get('wrong')
        if follow_up and follow_up.get('id') == scenario_id:
            return follow_up
    return None


def user_state_payload(state: dict, minimal: bool = False):
    payload = {
        'id': state['id'],
        'money': state['money'],
        'xp': state['xp'],
        'level': state['level']
    }
    if minimal:
        return payload
    payload.update({
        'name': state.get('name', 'You'),
        'debt': state.get('debt', 0),
        'scenarios_completed': state.get('scenarios_completed', 0),
        'weak_topics': state.get('weak_topics', {}),
        'accuracy_per_difficulty': state.get('accuracy_per_difficulty', {
            'easy': {'correct': 0, 'total': 0},
            'medium': {'correct': 0, 'total': 0},
            'hard': {'correct': 0, 'total': 0}
        }),
        'last_difficulty': state.get('last_difficulty', 'easy'),
        'correct': state.get('correct', 0),
        'wrong': state.get('wrong', 0),
        'risk_score': state.get('risk_score', 0),
        'topics': state.get('topics', {}),
        'seen_scenarios': state.get('seen_scenarios', [])
    })
    return payload


def _fallback_ai_scenario(profile: AIScenarioBody, user_money: int, new_id: int):
    focus = profile.weak_topics[0] if profile.weak_topics else 'Budgeting'
    return {
        'id': new_id,
        'title': f'AI Scenario: {focus} Pressure Test',
        'situation': f'Your current balance is ₹{user_money}. A new decision tests your {focus.lower()} discipline.',
        'topic': focus,
        'difficulty': 'medium',
        'options': [
            'Create a realistic spending plan and follow it',
            'Take a quick high-interest loan',
            'Ignore the issue and delay action',
            'Spend first and think later'
        ],
        'correct_option': 0,
        'effects': {'correct': 500, 'wrong': -1500},
        'explanation': 'Planned actions reduce risk and improve long-term financial stability.',
        'consequence': {
            'correct': 'You take control early and avoid compounding financial stress.',
            'wrong': 'Short-term choices worsen your future cash flow.'
        }
    }


def load_user_state(user_id: str):
    if supabase:
        try:
            data = supabase.table('user_performance_metrics').select('*').eq('id', user_id).execute()
            if getattr(data, 'error', None):
                logger.warning('Supabase load_user_state error: %s', data.error)
                return None
            records = getattr(data, 'data', None) or []
            if not records:
                return None
            record = records[0]
            return {
                'id': user_id,
                'name': record.get('name', 'You'),
                'money': int(record.get('money', 10000)),
                'debt': int(record.get('debt', 0)),
                'xp': int(record.get('xp', 0)),
                'level': int(record.get('level', 1)),
                'scenarios_completed': int(record.get('scenarios_completed', 0)),
                'weak_topics': record.get('weak_topics', {}) or {},
                'accuracy_per_difficulty': record.get('accuracy_per_difficulty', {
                    'easy': {'correct': 0, 'total': 0},
                    'medium': {'correct': 0, 'total': 0},
                    'hard': {'correct': 0, 'total': 0}
                }),
                'last_difficulty': record.get('last_difficulty', 'easy'),
                'correct': int(record.get('correct', 0)),
                'wrong': int(record.get('wrong', 0)),
                'risk_score': int(record.get('risk_score', 0)),
                'topics': record.get('topics', {}) or {},
                'seen_scenarios': record.get('seen_scenarios', []) or []
            }
        except Exception:
            logger.exception('Error loading user state from Supabase')

    try:
        lp = Path(__file__).resolve().parent.parent / 'local_users.json'
        if lp.exists():
            data = json.loads(lp.read_text(encoding='utf-8') or '{}')
            if user_id in data:
                return data[user_id]
    except Exception:
        logger.exception('Error reading local_users.json')
    return None


def save_user_state(state: dict):
    # always write a local fallback copy first to guarantee persistence during development
    local_saved = False
    try:
        lp = Path(__file__).resolve().parent.parent / 'local_users.json'
        data = {}
        if lp.exists():
            try:
                data = json.loads(lp.read_text(encoding='utf-8') or '{}')
            except Exception:
                data = {}
        data[state['id']] = state
        lp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        local_saved = True
    except Exception:
        logger.exception('Error writing local_users.json fallback at start of save_user_state')
    if not supabase:
        logger.warning('Supabase client unavailable; using local_users.json only.')
        return {
            'local_saved': local_saved,
            'database_saved': False,
            'database_error': 'Supabase client is not initialized'
        }

    payload = user_state_payload(state, minimal=True)
    try:
        result = supabase.table('user_performance_metrics').upsert(payload, on_conflict='id').execute()
        if getattr(result, 'error', None):
            logger.warning('Supabase save_user_state error: %s', result.error)
            return {
                'local_saved': local_saved,
                'database_saved': False,
                'database_error': str(result.error)
            }
        return {'local_saved': local_saved, 'database_saved': True, 'database_error': None}
    except Exception as exc:
        logger.exception('Error saving user state to Supabase')
        return {
            'local_saved': local_saved,
            'database_saved': False,
            'database_error': str(exc)
        }


@app.get('/user/profile')
def profile():
    data = user.copy()
    data['weak_topics'] = dict(user['weak_topics'])
    data['balance'] = user['money']
    return data

def user_response(user_id: str):
    state = load_user_state(user_id)
    if not state:
        state = default_user_state(user_id)
        save_user_state(state)
    return {
        'id': state['id'],
        'name': state['name'],
        'money': state['money'],
        'debt': state['debt'],
        'xp': state['xp'],
        'level': state['level'],
        'scenarios_completed': state['scenarios_completed'],
        'weak_topics': state['weak_topics'],
        'accuracy_per_difficulty': state['accuracy_per_difficulty'],
        'last_difficulty': state['last_difficulty'],
        'balance': state['money']
    }


@app.get('/user')
def current_user(user_id: str = Depends(verify_user)):
    return user_response(user_id)

@app.get('/user/{user_id}')
def get_user(user_id: str, verified_user_id: str = Depends(verify_user)):
    if user_id != verified_user_id:
        raise HTTPException(status_code=403, detail='Cannot access another user')
    return user_response(user_id)

@app.get('/scenario/next')
@app.get('/scenerio/next')
def next_scenario(user_id: str = Depends(verify_user)):
    state = load_user_state(user_id) or default_user_state(user_id)
    difficulty = choose_difficulty(state)
    scenario = get_next_scenario(difficulty, state.get('seen_scenarios'))
    if scenario['id'] not in state['seen_scenarios']:
        state['seen_scenarios'].append(scenario['id'])
        save_user_state(state)
    return serialize_scenario(scenario)

@app.post('/scenario/submit')
def submit(body: SubmitBody, user_id: str = Depends(verify_user)):
    actual_user_id = user_id
    if body.user_id and body.user_id != user_id:
        raise HTTPException(status_code=403, detail='Cannot submit for another user')

    scenario = find_scenario(body.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail='Scenario not found')

    state = load_user_state(actual_user_id) or default_user_state(actual_user_id)
    correct = body.selected_option == scenario['correct_option']
    follow_up = None
    if not correct:
        follow_up = scenario.get('follow_up', {}).get('wrong')
    money_change = scenario['effects']['correct'] if correct else scenario['effects']['wrong']
    # XP calculation per design
    XP_CORRECT = 100
    XP_BONUS = 50
    XP_WRONG = -40

    if correct:
        xp_change_raw = XP_CORRECT + XP_BONUS
    else:
        xp_change_raw = XP_WRONG

    consequence = scenario['consequence']['correct' if correct else 'wrong']
    next_id = scenario.get('next', {}).get('correct' if correct else 'wrong')
    weak_topic = scenario['topic'] if not correct else None
    current_difficulty = scenario['difficulty']
    state['money'] += money_change
    if not correct:
        state['debt'] += abs(money_change)
    prev_xp = int(state.get('xp', 0) or 0)
    new_xp = max(0, prev_xp + xp_change_raw)
    applied_xp_change = new_xp - prev_xp
    level = (new_xp // XP_PER_LEVEL) + 1
    state['xp'] = new_xp
    state['level'] = level
    state['scenarios_completed'] += 1
    topic = scenario['topic']
    if topic not in state['topics']:
        state['topics'][topic] = 0

    if correct:
        state['correct'] += 1
        state['topics'][topic] -= 1
    else:
        state['wrong'] += 1
        state['topics'][topic] += 2

    if ('loan' in scenario['title'].lower() or 'credit' in scenario['title'].lower()) and not correct:
        state['risk_score'] += 1

    if state['risk_score'] > 3:
        personality = 'High Risk Taker'
    elif state['correct'] > state['wrong']:
        personality = 'Disciplined Planner'
    else:
        personality = 'Unstable Decision Maker'

    ranked_topics = sorted(
        (name for name, score in state['topics'].items() if score > 0),
        key=lambda name: state['topics'][name],
        reverse=True
    )
    state['accuracy_per_difficulty'][scenario['difficulty']]['total'] += 1
    if correct:
        state['accuracy_per_difficulty'][scenario['difficulty']]['correct'] += 1
    else:
        state['weak_topics'][scenario['topic']] = state['weak_topics'].get(scenario['topic'], 0) + 1

    current_money = state['money']
    future_money = current_money + int(current_money * 0.15)
    crisis_mode = current_money < CRISIS_THRESHOLD
    crisis_scenarios = [s for s in SCENARIOS if s['id'] >= 100]

    if crisis_mode and crisis_scenarios:
        selected_next = random.choice(crisis_scenarios)
    else:
        selected_next = next((s for s in SCENARIOS if s['id'] == next_id), None) if next_id else None
        if not selected_next:
            selected_next = get_next_scenario(choose_difficulty(state), state.get('seen_scenarios'))

    save_result = save_user_state(state)

    return {
        'correct': correct,
        'money_change': money_change,
        'xp_change': applied_xp_change,
        'xp_change_raw': xp_change_raw,
        'balance': state['money'],
        'debt': state['debt'],
        'xp': new_xp,
        'level': level,
        'weak_topic': weak_topic,
        'difficulty': choose_difficulty(state),
        'future_projection': {
            'current': current_money,
            'future': future_money,
            'change': future_money - current_money
        },
        'crisis_mode': crisis_mode,
        'next_scenario': serialize_scenario(selected_next),
        'follow_up': serialize_scenario(follow_up),
        'is_correct': correct,
        'score_change': money_change,
        'saved_to_database': bool(save_result.get('database_saved')) if isinstance(save_result, dict) else False,
        'database_error': save_result.get('database_error') if isinstance(save_result, dict) else None,
        'profile': {
            'type': personality,
            'weak_topics': ranked_topics[:2]
        },
        'consequence': consequence,
        'explanation': scenario['explanation']
    }

@app.post('/ai/insight')
def ai_insight(body: InsightBody, user_id: str = Depends(verify_user)):
    fallback = f"Your decision on {body.scenario_title} {'was strong' if body.is_correct else 'needs improvement'}. {body.explanation} Focus on planning and disciplined budgeting next."
    if not client:
        return {'insight': fallback}
    try:
        prompt = (
            f"You are a financial advisor. Provide concise, actionable coaching in 3-4 sentences. "
            f"Scenario: {body.scenario_title}. Topic: {body.topic}. Selected option: {body.selected_option}. "
            f"Correct: {body.is_correct}. Money impact: {body.money_change}. Explanation: {body.explanation}. "
            "Include one specific improvement suggestion and one positive reinforcement sentence."
        )
        response = client.ChatCompletion.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': 'You are a helpful, concise financial coach.'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.5,
            max_tokens=180
        )
        insight = getattr(response.choices[0], 'message', None)
        if insight is None:
            insight = getattr(response.choices[0], 'text', None)
        content = getattr(insight, 'content', insight)
        return {'insight': content.strip() if isinstance(content, str) else fallback}
    except Exception:
        logger.exception('Error generating AI insight')
        return {'insight': fallback}


@app.post('/ai/scenario')
def generate_ai_scenario(body: AIScenarioBody, user_id: str = Depends(verify_user)):
    user_money = body.money if body.money is not None else user['money']
    next_id = max((s['id'] for s in SCENARIOS), default=0) + 1
    fallback = _fallback_ai_scenario(body, user_money, next_id)

    if not client:
        SCENARIOS.append(fallback)
        return {k: v for k, v in fallback.items() if k != 'correct_option'}

    recent_topics = [item['topic'] for item in user_history[-3:]]
    seed = random.randint(1, 100000)
    prompt = f"""
You are a financial simulation engine.

User profile:
- Personality: {body.type}
- Weak topics: {body.weak_topics}
- Recent topics: {recent_topics}
- Money: {user_money}

Generate one realistic financial scenario as strict JSON.
Generate a NEW scenario that is different from recent topics and avoid repetition.
Random seed: {seed}

Return exactly this schema (no markdown, no extra text):
{{
  "title": "...",
  "situation": "...",
  "topic": "...",
  "difficulty": "easy|medium|hard",
  "options": ["...", "...", "...", "..."],
  "correct_option": 0,
  "explanation": "...",
  "impact": {{
    "correct": 500,
    "wrong": -1500
  }}
}}
"""
    try:
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.6
        )
        raw = response.choices[0].message.content or ''
        parsed = json.loads(raw)
        generated = {
            'id': next_id,
            'title': parsed.get('title') or fallback['title'],
            'situation': parsed.get('situation') or fallback['situation'],
            'topic': parsed.get('topic') or fallback['topic'],
            'difficulty': parsed.get('difficulty') if parsed.get('difficulty') in {'easy', 'medium', 'hard'} else 'medium',
            'options': parsed.get('options') if isinstance(parsed.get('options'), list) and len(parsed.get('options')) == 4 else fallback['options'],
            'correct_option': parsed.get('correct_option') if isinstance(parsed.get('correct_option'), int) and 0 <= parsed.get('correct_option') < 4 else 0,
            'effects': parsed.get('impact') if isinstance(parsed.get('impact'), dict) and 'correct' in parsed.get('impact') and 'wrong' in parsed.get('impact') else fallback['effects'],
            'explanation': parsed.get('explanation') or fallback['explanation'],
            'consequence': fallback['consequence']
        }
        SCENARIOS.append(generated)
        return {k: v for k, v in generated.items() if k != 'correct_option'}
    except Exception:
        SCENARIOS.append(fallback)
        return {k: v for k, v in fallback.items() if k != 'correct_option'}

@app.get('/leaderboard')
def leaderboard(user_id: str = Depends(verify_user)):
    if supabase:
        try:
            result = supabase.table('user_performance_metrics').select('id,money,xp,level').order('xp', desc=True).limit(10).execute()
            if not getattr(result, 'error', None):
                users = []
                for row in getattr(result, 'data', []) or []:
                    rid = row.get('id')
                    rname = row.get('name') or (f"Player {rid[:8]}" if isinstance(rid, str) else 'Player')
                    users.append({
                        'id': rid,
                        'name': 'You' if rid == user_id else rname,
                        'money': int(row.get('money', 0) or 0),
                        'xp': int(row.get('xp', 0) or 0)
                    })
                return {'users': users}
        except Exception:
            logger.exception('Error fetching leaderboard from Supabase')
    users = mock_users.copy()
    if user_id:
        state = load_user_state(user_id) or default_user_state(user_id)
        users.append({'id': state['id'], 'name': state['name'], 'money': state['money'], 'xp': state['xp']})
    users = sorted(users, key=lambda u: (u['money'], u['xp']), reverse=True)
    return {'users': users}
