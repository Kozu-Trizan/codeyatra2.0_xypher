"""
Diagnostic routes -- generate and evaluate concept-mastery checks.

POST /api/diagnose          -- generate diagnostic questions for a concept
POST /api/diagnose/evaluate -- evaluate answers and update mastery
"""

from datetime import datetime, timezone
from flask import Blueprint, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request,
)
from app.models import (
    db,
    Concept,
    DiagnosticQuestion,
    DiagnosticSession,
    DiagnosticAnswer,
    StudentProgress,
)
from app.utils.response import success_response, error_response

diagnose_bp = Blueprint("diagnose", __name__)

@diagnose_bp.post("/")
@jwt_required()
def start_diagnostic():
    data = request.get_json(silent=True) or {}

    student_id = data.get("student_id")
    if not student_id:
        try:
            verify_jwt_in_request()
            student_id = get_jwt_identity()
        except Exception:
            student_id = None

    concept_id = data.get("concept_id")
    num_questions = data.get("num_questions", 5)

    if not concept_id:
        return error_response("VALIDATION_ERROR", "concept_id is required.", {}, 400)

    concept = Concept.query.get(concept_id)
    if concept is None:
        return error_response("NOT_FOUND", "Concept not found.", {"concept_id": concept_id}, 404)

    questions = (
        DiagnosticQuestion.query
        .filter_by(concept_id=concept_id)
        .order_by(DiagnosticQuestion.difficulty)
        .limit(num_questions)
        .all()
    )

    if not questions:
        return error_response(
            "NOT_FOUND",
            "No diagnostic questions available for this concept.",
            {"concept_id": concept_id},
            404,
        )

    session = DiagnosticSession(
        student_id=int(student_id) if student_id else 0,
        concept_id=int(concept_id),
        result="pending",
    )
    db.session.add(session)
    db.session.commit()

    return success_response(
        {
            "session_id": session.id,
            "concept": concept.to_dict(),
            "questions": [q.to_dict() for q in questions],
        },
        status_code=201,
    )


@diagnose_bp.post("/evaluate")
@jwt_required()
def evaluate_diagnostic():
    data = request.get_json(silent=True) or {}

    session_id = data.get("session_id")
    answers = data.get("answers", [])

    if not session_id:
        return error_response("VALIDATION_ERROR", "session_id is required.", {}, 400)
    if not answers:
        return error_response("VALIDATION_ERROR", "answers array is required.", {}, 400)

    session = DiagnosticSession.query.get(session_id)
    if session is None:
        return error_response("NOT_FOUND", "Diagnostic session not found.", {"session_id": session_id}, 404)

    if session.result != "pending":
        return error_response("CONFLICT", "Session already evaluated.", {}, 409)

    correct_count = 0
    total_count = len(answers)
    feedback_list = []

    for ans in answers:
        question_id = ans.get("question_id")
        student_answer = str(ans.get("answer") or ans.get("choice_id") or "").strip()

        question = DiagnosticQuestion.query.get(question_id)
        if question is None:
            continue

        expected = (question.expected_answer or "").strip()
        is_correct = False

        try:
            expected_num = float(expected)
            student_num = float(student_answer)
            is_correct = abs(expected_num - student_num) < 0.01
        except (ValueError, TypeError):
            is_correct = student_answer.lower() == expected.lower()

        if is_correct:
            correct_count += 1

        diag_answer = DiagnosticAnswer(
            session_id=session.id,
            question_id=question_id,
            student_answer=student_answer,
            is_correct=is_correct,
        )
        db.session.add(diag_answer)

        feedback_list.append({
            "question_id": question_id,
            "is_correct": is_correct,
            "feedback": (
                "Correct! Expected: " + expected
                if is_correct
                else "Incorrect. Expected: " + expected
            ),
        })

    score = correct_count / total_count if total_count > 0 else 0.0
    passed = score >= session.pass_threshold

    session.score = score
    session.result = "pass" if passed else "fail"
    session.completed_at = datetime.now(timezone.utc)

    now = datetime.now(timezone.utc)
    progress = StudentProgress.query.filter_by(
        student_id=session.student_id,
        concept_id=session.concept_id,
    ).first()

    if progress is None:
        progress = StudentProgress(
            student_id=session.student_id,
            concept_id=session.concept_id,
            attempts=0,
            mastery_score=0.0,
        )
        db.session.add(progress)

    progress.attempts = (progress.attempts or 0) + 1
    progress.mastery_score = score
    progress.last_attempted_at = now

    if passed:
        progress.status = "mastered"
        progress.mastered_at = now
    else:
        if progress.status != "mastered":
            progress.status = "in_progress"

    db.session.commit()

    return success_response({
        "session_id": session.id,
        "result": session.result,
        "score": round(score, 2),
        "correct_count": correct_count,
        "total_count": total_count,
        "feedback": feedback_list,
        "concept_status": progress.status,
        "mastered_at": progress.mastered_at.isoformat() if progress.mastered_at else None,
    })
