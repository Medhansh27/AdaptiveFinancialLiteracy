import json


def fallback_personality(answers: dict):
    debt = (answers.get('debt_level') or '').lower()
    savings = (answers.get('savings_habit') or '').lower()
    risk = (answers.get('risk_tolerance') or '').lower()
    confidence = (answers.get('financial_confidence') or '').lower()
    spending = (answers.get('spending_behavior') or '').lower()

    risk_score = 70 if 'high' in risk else (35 if 'low' in risk else 50)
    discipline_score = 35 if ('rarely' in savings or 'impulsive' in spending) else 65
    panic_score = 70 if ('none' in answers.get('emergency_fund', '').lower() or 'low' in confidence) else 45

    weak_areas = []
    if 'high' in debt:
        weak_areas.append('Debt')
    if 'rarely' in savings or 'none' in answers.get('emergency_fund', '').lower():
        weak_areas.append('Emergency Savings')
    if 'impulsive' in spending:
        weak_areas.append('Spending Discipline')

    strengths = []
    if 'stable' in answers.get('income_range', '').lower():
        strengths.append('Income Stability')
    if 'low' in debt:
        strengths.append('Debt Control')
    if 'consistent' in savings:
        strengths.append('Savings Habit')

    if risk_score > 65 and discipline_score < 45:
        personality_type = 'Impulsive Planner'
    elif discipline_score > 60:
        personality_type = 'Disciplined Builder'
    else:
        personality_type = 'Cautious Balancer'

    return {
        'personality_type': personality_type,
        'weak_areas': weak_areas or ['Emergency Savings'],
        'strengths': strengths or ['Willingness to Improve'],
        'risk_score': risk_score,
        'discipline_score': discipline_score,
        'panic_score': panic_score
    }


def analyze_personality(openai_client, answers: dict):
    fallback = fallback_personality(answers)
    if not openai_client:
        return fallback
    prompt = f"""
You are a financial behavior analyst.
Given this onboarding data, produce strict JSON only:
{{
  "personality_type": "string",
  "weak_areas": ["string"],
  "strengths": ["string"],
  "risk_score": 0,
  "discipline_score": 0,
  "panic_score": 0
}}
Onboarding:
{json.dumps(answers, ensure_ascii=False)}
Scores must be integers from 0 to 100.
"""
    try:
        response = openai_client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.4
        )
        parsed = json.loads((response.choices[0].message.content or '').strip())
        return {
            'personality_type': parsed.get('personality_type') or fallback['personality_type'],
            'weak_areas': parsed.get('weak_areas') if isinstance(parsed.get('weak_areas'), list) else fallback['weak_areas'],
            'strengths': parsed.get('strengths') if isinstance(parsed.get('strengths'), list) else fallback['strengths'],
            'risk_score': int(parsed.get('risk_score')) if isinstance(parsed.get('risk_score'), (int, float)) else fallback['risk_score'],
            'discipline_score': int(parsed.get('discipline_score')) if isinstance(parsed.get('discipline_score'), (int, float)) else fallback['discipline_score'],
            'panic_score': int(parsed.get('panic_score')) if isinstance(parsed.get('panic_score'), (int, float)) else fallback['panic_score']
        }
    except Exception:
        return fallback
