"""
Diagnostic engine — the deterministic core of SikshyaMap AI.

Implements:
  - Error pattern matching (spec §6.1)
  - Progressive hint strategy (spec §6.2)
  - Backtrack decision logic (spec §6.3)
"""

import re
from app.models import db, ErrorPattern, Checkpoint, StudentProgress, Concept


def _parse_numeric(val):
    """Try to extract a float from a string value. Returns None if not numeric."""
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.strip()
        m = re.match(r'^[-+]?\d*\.?\d+', val)
        if m:
            return float(m.group())
    return None


def _answers_match(student_answer: str, correct_answer: str, tolerance: float = 0.01) -> bool:
    """Compare two answers: tries numeric first, falls back to case-insensitive string."""
    s_num = _parse_numeric(student_answer)
    c_num = _parse_numeric(correct_answer)
    if s_num is not None and c_num is not None:
        return abs(s_num - c_num) <= tolerance
    # String comparison (case-insensitive, stripped)
    return str(student_answer).strip().lower() == str(correct_answer).strip().lower()


# ---------------------------------------------------------------------------
# 6.1 Error Pattern Matching
# ---------------------------------------------------------------------------

def match_error_pattern(checkpoint_id: int, student_answer: str) -> ErrorPattern | None:
    """
    Find the highest-confidence ErrorPattern whose trigger_value matches
    the student's answer (string or numeric comparison).
    """
    patterns = ErrorPattern.query.filter_by(checkpoint_id=checkpoint_id).all()

    matches = []
    for p in patterns:
        s_num = _parse_numeric(student_answer)
        t_num = _parse_numeric(p.trigger_value)
        if s_num is not None and t_num is not None:
            if abs(s_num - t_num) <= p.trigger_tolerance:
                matches.append(p)
        else:
            # String comparison
            if str(student_answer).strip().lower() == str(p.trigger_value).strip().lower():
                matches.append(p)

    if not matches:
        return None

    matches.sort(key=lambda p: p.confidence, reverse=True)
    return matches[0]


# ---------------------------------------------------------------------------
# 6.2 Progressive Hint Strategy
# ---------------------------------------------------------------------------

def get_feedback(checkpoint: Checkpoint, pattern: ErrorPattern | None, attempt_number: int) -> dict:
    """
    Return the appropriate feedback dict based on attempt # and pattern match.

    Attempt 1 → generic hint (checkpoint.hint)
    Attempt 2 → specific diagnosis (error_pattern.diagnosis_text)
    Attempt 3+ → backtrack signal
    """
    if pattern is None:
        # No pattern matched — generic response
        return {
            "feedback": checkpoint.hint or "That's not quite right. Try again.",
            "error_type": None,
            "missing_concept": None,
            "hint": checkpoint.hint,
        }

    missing_concept = None
    if pattern.missing_concept_id:
        concept = Concept.query.get(pattern.missing_concept_id)
        if concept:
            missing_concept = {"id": concept.id, "name": concept.name, "description": concept.description}

    if attempt_number == 1:
        return {
            "feedback": checkpoint.hint or "Not quite. Think about what each trig function gives you.",
            "error_type": pattern.error_type,
            "missing_concept": missing_concept,
            "hint": checkpoint.hint,
        }

    if attempt_number == 2:
        return {
            "feedback": pattern.diagnosis_text,
            "error_type": pattern.error_type,
            "missing_concept": missing_concept,
            "hint": pattern.diagnosis_text,
        }

    # attempt >= 3
    return {
        "feedback": f"This error suggests you need to review {missing_concept['name'] if missing_concept else 'a prerequisite concept'}.",
        "error_type": pattern.error_type,
        "missing_concept": missing_concept,
        "hint": "Let's fix this gap before continuing.",
    }


# ---------------------------------------------------------------------------
# 6.3 Backtracking Decision Logic
# ---------------------------------------------------------------------------

def should_backtrack(pattern: ErrorPattern | None, attempt_number: int, student_id: int) -> bool:
    """
    Decide whether the student should be routed to a prerequisite concept.

    Returns True only when:
      - 3+ attempts on this checkpoint
      - A pattern with a missing_concept_id was matched
    """
    if attempt_number < 3:
        return False

    if pattern is None:
        return False

    if pattern.missing_concept_id is None:
        return False

    return True


def get_backtrack_path(student_id: int, missing_concept_id: int) -> list[dict]:
    """
    Build the backtrack path: list of concepts from missing prerequisite up to
    the current concept, annotated with the student's mastery status.
    """
    concept = Concept.query.get(missing_concept_id)
    if concept is None:
        return []

    chain = concept.get_prerequisite_chain()
    chain.append(concept)

    path = []
    for c in chain:
        progress = StudentProgress.query.filter_by(
            student_id=student_id,
            concept_id=c.id,
        ).first()

        status = progress.status if progress else "not_started"
        path.append({
            "concept": c.to_dict(),
            "status": status,
            "is_target": c.id == missing_concept_id,
        })

    return path


# ---------------------------------------------------------------------------
# Full checkpoint evaluation (combines all three)
# ---------------------------------------------------------------------------

def evaluate_checkpoint_answer(
    checkpoint: Checkpoint,
    student_answer: str,
    attempt_number: int,
    student_id: int,
) -> dict:
    """
    Evaluate a student's answer at a checkpoint and return the full response payload.
    Accepts string-based answers for both numeric and MCQ checkpoints.
    """
    is_correct = _answers_match(student_answer, checkpoint.correct_answer, checkpoint.tolerance)

    if is_correct:
        return {
            "correct": True,
            "feedback": "Correct! Well done.",
            "backtrack": False,
            "error_type": None,
            "missing_concept": None,
            "hint": None,
            "next_action": "continue",
            "confidence": 1.0,
            "behavioral_flags": [],
        }

    # Wrong answer — match pattern
    pattern = match_error_pattern(checkpoint.id, student_answer)
    feedback_info = get_feedback(checkpoint, pattern, attempt_number)
    backtrack = should_backtrack(pattern, attempt_number, student_id)

    result = {
        "correct": False,
        **feedback_info,
        "backtrack": backtrack,
        "confidence": pattern.confidence if pattern else 0.0,
        "behavioral_flags": [],
    }

    if backtrack and pattern and pattern.missing_concept_id:
        result["next_action"] = "backtrack"
        result["backtrack_path"] = get_backtrack_path(student_id, pattern.missing_concept_id)

        # Down-grade progress if previously mastered
        progress = StudentProgress.query.filter_by(
            student_id=student_id,
            concept_id=pattern.missing_concept_id,
        ).first()
        if progress and progress.status == "mastered":
            progress.status = "needs_review"
            db.session.commit()
    else:
        result["next_action"] = "retry"

    return result
