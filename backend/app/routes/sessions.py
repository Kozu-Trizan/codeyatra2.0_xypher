"""
Session routes — start a problem-solving session and submit answers.

POST /api/sessions/start                — create session
POST /api/sessions/<session_id>/submit  — submit answer for current checkpoint
GET  /api/sessions/<session_id>         — get session state
"""

from datetime import datetime, timezone

from flask import Blueprint, request

from app.models import db, Problem, Checkpoint, CheckpointChoice, StudentProgress
from app.utils.response import success_response, error_response
from app.utils.session_manager import (
    create_session,
    get_session,
    log_attempt,
    get_attempts_for_checkpoint,
    update_session,
    complete_session,
)
from app.utils.diagnostic_engine import evaluate_checkpoint_answer

sessions_bp = Blueprint("sessions", __name__)


def _checkpoint_payload(cp: Checkpoint) -> dict:
    """Build a safe checkpoint dict (no correct answers)."""
    choices = CheckpointChoice.query.filter_by(checkpoint_id=cp.id).all()
    return {
        "id": cp.id,
        "order": cp.order,
        "question": cp.question,
        "unit": cp.unit,
        "input_type": cp.input_type,
        "hint": cp.hint,
        "choices": [{"id": c.id, "label": c.label, "value": c.value} for c in choices],
    }


@sessions_bp.route("/start", methods=["POST"])
def start_session():
    data = request.get_json(silent=True) or {}

    problem_id = data.get("problem_id")
    student_id = data.get("student_id")

    if not problem_id:
        return error_response("VALIDATION_ERROR", "problem_id is required.", {}, 400)
    if not student_id:
        return error_response("VALIDATION_ERROR", "student_id is required.", {}, 400)

    problem = Problem.query.get(problem_id)
    if problem is None:
        return error_response("NOT_FOUND", "Problem not found.", {"problem_id": problem_id}, 404)

    session = create_session(
        student_id=int(student_id),
        problem_id=problem.id,
        concept_id=problem.concept_id,
    )

    first_cp = (
        Checkpoint.query
        .filter_by(problem_id=problem.id)
        .order_by(Checkpoint.order)
        .first()
    )

    return success_response(
        {
            "session_id": session["session_id"],
            "problem": problem.to_dict(),
            "current_checkpoint": _checkpoint_payload(first_cp) if first_cp else None,
            "started_at": session["started_at"],
        },
        status_code=201,
    )


@sessions_bp.route("/<session_id>/submit", methods=["POST"])
def submit_answer(session_id):
    session = get_session(session_id)
    if session is None:
        return error_response("NOT_FOUND", "Session not found.", {"session_id": session_id}, 404)

    if session["status"] == "completed":
        return error_response("CONFLICT", "Session already completed.", {}, 409)

    data = request.get_json(silent=True) or {}
    checkpoint_id = data.get("checkpoint_id")
    selected_value = data.get("selected_value")
    time_spent = data.get("time_spent_seconds", 0)

    # --- validation ---
    errors = {}
    if checkpoint_id is None:
        errors["checkpoint_id"] = "Required field."
    if selected_value is None:
        errors["selected_value"] = "Required field."
    if errors:
        return error_response("VALIDATION_ERROR", "Missing required fields.", errors, 400)

    checkpoint = Checkpoint.query.get(checkpoint_id)
    if checkpoint is None:
        return error_response("NOT_FOUND", "Checkpoint not found.", {"checkpoint_id": checkpoint_id}, 404)

    # Count previous attempts on this checkpoint
    attempt_number = get_attempts_for_checkpoint(session_id, checkpoint_id) + 1

    # Log the attempt
    log_attempt(session_id, {
        "checkpoint_id": checkpoint_id,
        "selected_value": float(selected_value),
        "attempt_number": attempt_number,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "time_spent_seconds": time_spent,
    })

    # Evaluate
    result = evaluate_checkpoint_answer(
        checkpoint=checkpoint,
        student_answer=float(selected_value),
        attempt_number=attempt_number,
        student_id=session["student_id"],
    )

    # If correct, advance to next checkpoint
    if result["correct"]:
        all_cps = (
            Checkpoint.query
            .filter_by(problem_id=session["problem_id"])
            .order_by(Checkpoint.order)
            .all()
        )
        current_idx = session["current_checkpoint_index"]
        next_idx = current_idx + 1

        if next_idx >= len(all_cps):
            # Problem complete
            complete_session(session_id)
            result["next_action"] = "complete"
            result["next_checkpoint"] = None
            result["feedback"] = "Problem completed! All checkpoints passed."

            # Update student progress
            _update_progress(session["student_id"], session["concept_id"])

        else:
            update_session(session_id, {"current_checkpoint_index": next_idx})
            next_cp = all_cps[next_idx]
            result["next_checkpoint"] = _checkpoint_payload(next_cp)

    # If backtrack triggered, update session status
    if result.get("backtrack"):
        update_session(session_id, {"status": "backtracking"})
        session_data = get_session(session_id)
        if session_data:
            session_data["backtrack_history"].append({
                "checkpoint_id": checkpoint_id,
                "error_type": result.get("error_type"),
                "missing_concept": result.get("missing_concept"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    return success_response(result)


@sessions_bp.route("/<session_id>", methods=["GET"])
def get_session_state(session_id):
    session = get_session(session_id)
    if session is None:
        return error_response("NOT_FOUND", "Session not found.", {"session_id": session_id}, 404)
    return success_response(session)


def _update_progress(student_id: int, concept_id: int):
    """Update or create student progress record when a problem is completed."""
    progress = StudentProgress.query.filter_by(
        student_id=student_id,
        concept_id=concept_id,
    ).first()

    now = datetime.now(timezone.utc)

    if progress is None:
        progress = StudentProgress(
            student_id=student_id,
            concept_id=concept_id,
            status="in_progress",
            attempts=1,
            last_attempted_at=now,
        )
        db.session.add(progress)
    else:
        progress.attempts = (progress.attempts or 0) + 1
        progress.last_attempted_at = now

    db.session.commit()
