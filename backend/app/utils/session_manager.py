"""
In-memory session manager for problem-solving sessions.

MVP strategy (spec §6.4): sessions live in a Python dict.
Production would use Redis with 24-hour TTL.
"""

import uuid
from datetime import datetime, timezone


# Global in-memory store: { session_id: session_dict }
_sessions: dict[str, dict] = {}


def create_session(student_id: int, problem_id: int, concept_id: int) -> dict:
    """Create a new problem-solving session and return it."""
    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "student_id": student_id,
        "problem_id": problem_id,
        "concept_id": concept_id,
        "current_checkpoint_index": 0,
        "attempts_log": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",  # active | backtracking | completed
        "backtrack_history": [],
    }
    _sessions[session_id] = session
    return session


def get_session(session_id: str) -> dict | None:
    """Retrieve session by UUID. Returns None if not found / expired."""
    return _sessions.get(session_id)


def update_session(session_id: str, updates: dict) -> dict | None:
    """Merge updates into an existing session."""
    session = _sessions.get(session_id)
    if session is None:
        return None
    session.update(updates)
    return session


def log_attempt(session_id: str, attempt: dict) -> dict | None:
    """Append an attempt entry to the session's attempts_log."""
    session = _sessions.get(session_id)
    if session is None:
        return None
    session["attempts_log"].append(attempt)
    return session


def complete_session(session_id: str) -> dict | None:
    """Mark session as completed."""
    return update_session(session_id, {"status": "completed"})


def delete_session(session_id: str) -> bool:
    """Remove a session (cleanup)."""
    return _sessions.pop(session_id, None) is not None


def get_attempts_for_checkpoint(session_id: str, checkpoint_id: int) -> int:
    """Count how many times the student attempted a given checkpoint in this session."""
    session = _sessions.get(session_id)
    if session is None:
        return 0
    return sum(
        1
        for a in session["attempts_log"]
        if a.get("checkpoint_id") == checkpoint_id
    )
