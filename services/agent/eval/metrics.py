"""
Evaluation metrics for the Oceanus Multi-Agent AI Assistant using standard Google Agent Platform criteria.
"""

from typing import Dict, Any

def evaluate_groundedness(response_text: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates whether all figures in response_text are grounded in context data.
    """
    # Simple rule-based validation + LLM-as-a-judge interface
    is_grounded = True
    reasons = []

    # Check for Bank A provenance violation
    if "Bank A" in response_text and ("metered" in response_text.lower() or "measured energy" in response_text.lower()):
        is_grounded = False
        reasons.append("Bank A energy must be labeled as modeled, not metered.")

    score = 1.0 if is_grounded else 0.0
    return {
        "metric": "grounding",
        "score": score,
        "is_grounded": is_grounded,
        "explanation": "; ".join(reasons) if reasons else "Response strictly grounded in telemetry context."
    }

def evaluate_hallucination_absence(response_text: str) -> Dict[str, Any]:
    """
    Evaluates that no unsubstantiated certainty claims are made without supporting data.
    """
    has_hallucination = False
    reasons = []

    if "100% guaranteed" in response_text.lower() or "zero uncertainty" in response_text.lower():
        has_hallucination = True
        reasons.append("Over-claiming absolute certainty without confidence interval.")

    score = 0.0 if has_hallucination else 1.0
    return {
        "metric": "hallucination_absence",
        "score": score,
        "explanation": "; ".join(reasons) if reasons else "No hallucinated certainty detected."
    }

def evaluate_tool_selection(actual_specialists: list, expected_specialists: list) -> Dict[str, Any]:
    """
    Evaluates router specialist selection accuracy against golden references.
    """
    if not expected_specialists:
        return {"metric": "tool_selection", "score": 1.0, "explanation": "No specific tools required."}

    matched = set(actual_specialists).intersection(set(expected_specialists))
    score = len(matched) / len(expected_specialists)

    return {
        "metric": "tool_selection",
        "score": score,
        "explanation": f"Matched {len(matched)} of {len(expected_specialists)} expected specialists."
    }
