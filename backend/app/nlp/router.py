import re

INTENTS = {
    "retention": {
        "keywords": {
            "retention": 5.0,
            "retain": 5.0,
            "cohort": 5.0,
            "feature": 1.5,
            "retained": 4.0,
        },
        "negatives": ["mrr", "revenue", "churn", "funnel", "dropoff", "drop off", "conversion", "arpu"],
        "regex": [
            r"which feature.*highest.*retention",
            r"highest.*retention",
            r"retention.*feature"
        ]
    },
    "funnel": {
        "keywords": {
            "funnel": 5.0,
            "dropoff": 4.0,
            "drop-off": 4.0,
            "conversion": 4.0,
            "signup": 3.0,
            "onboarding": 3.0,
            "invite": 2.0,
        },
        "negatives": ["mrr", "revenue", "churn", "retention", "dau", "arpu"],
        "regex": [
            r"where.*drop off.*funnel",
            r"drop off.*funnel",
            r"funnel.*conversion",
            r"where do users drop off"
        ]
    },
    "revenue": {
        "keywords": {
            "revenue": 5.0,
            "mrr": 5.0,
            "arr": 4.0,
            "arpu": 4.0,
            "churn": 5.0,
            "plan": 2.0,
            "pricing": 2.0,
        },
        "negatives": ["retention", "funnel", "onboarding", "dau", "session"],
        "regex": [
            r"show.*revenue.*trend",
            r"revenue.*trend",
            r"mrr.*trend",
            r"churn.*rate"
        ]
    },
    "engagement": {
        "keywords": {
            "dau": 5.0,
            "engagement": 5.0,
            "session": 4.0,
            "active": 2.0,
            "minutes": 3.0,
            "average": 1.5,
        },
        "negatives": ["mrr", "revenue", "churn", "funnel", "arpu"],
        "regex": [
            r"why.*engagement.*decrease",
            r"dau.*decrease",
            r"engagement.*decrease",
            r"why did engagement decrease"
        ]
    }
}

def route(question: str) -> dict:
    normalized = question.lower().strip()
    
    # Check for exact regex matches first
    for intent, config in INTENTS.items():
        # Skip regex matching if a negative keyword is present
        has_negative = any(neg in normalized for neg in config["negatives"])
        if has_negative:
            continue
            
        for pattern in config["regex"]:
            if re.search(pattern, normalized):
                return {
                    "status": "matched",
                    "function": intent,
                    "params": {}
                }
                
    scores = {}
    for intent, config in INTENTS.items():
        score = 0.0
        
        # Add weights for matched keywords
        for keyword, weight in config["keywords"].items():
            if keyword in normalized:
                score += weight
                
        # Deduct score for negatives
        for negative in config["negatives"]:
            if negative in normalized:
                score -= 8.0 # High penalty for negative terms
                
        scores[intent] = score
        
    # Sort intents by score
    sorted_intents = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    
    top_intent, top_score = sorted_intents[0]
    second_intent, second_score = sorted_intents[1]
    
    # Threshold checks
    if top_score < 2.0:
        return {
            "status": "low_confidence",
            "candidates": ["retention", "funnel", "revenue", "engagement"]
        }
        
    # Ambiguity check
    if top_score - second_score < 1.5:
        return {
            "status": "ambiguous",
            "candidates": [top_intent, second_intent]
        }
        
    return {
        "status": "matched",
        "function": top_intent,
        "params": {}
    }
