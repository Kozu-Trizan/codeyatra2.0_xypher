"""
Progress routes.

GET /api/progress/<student_id>  — student's overall mastery overview
POST /api/progress              — manually update a concept progress entry
"""

from datetime import datetime, timezone

from flask import Blueprint, request

from app.models import db, Concept, StudentProgress, Student
from app.utils.response import success_response, error_response

progress_bp = Blueprint("progress", __name__)


@progress_bp.get("/<int:student_id>")
def get_progress(student_id):
    student = Student.query.get(student_id)
    if student is None:
        return error_response("NOT_FOUND", "Student not found.", {"student_id": student_id}, 404)

    total_concepts = Concept.query.count()
    progress_entries = StudentProgress.query.filter_by(student_id=student_id).all()

    mastered = sum(1 for p in progress_entries if p.status == "mastered")
    in_progress = sum(1 for p in progress_entries if p.status == "in_progress")
    needs_review = sum(1 for p in progress_entries if p.status == "needs_review")

    concepts_data = []
    for p in progress_entries:
        concept = Concept.query.get(p.concept_id)
        concepts_data.append({
            "id": p.concept_id,
            "name": concept.name if concept else "Unknown",
            "status": p.status,
            "mastery_score": p.mastery_score,
            "attempts": p.attempts,
            "last_attempted_at": p.last_attempted_at.isoformat() if p.last_attempted_at else None,
            "mastered_at": p.mastered_at.isoformat() if p.mastered_at else None,
        })

    return success_response({
        "student_id": student_id,
        "total_concepts": total_concepts,
        "mastered_concepts": mastered,
        "in_progress_concepts": in_progress,
        "needs_review_concepts": needs_review,
        "mastery_percentage": round((mastered / total_concepts) * 100, 1) if total_concepts else 0.0,
        "concepts": concepts_data,
    })


@progress_bp.post("")
def update_progress():
    data = request.get_json(silent=True) or {}

    student_id = data.get("student_id")
    concept_id = data.get("concept_id")
    status = data.get("status")

    if not student_id or not concept_id:
        return error_response("VALIDATION_ERROR", "student_id and concept_id are required.", {}, 400)

    valid_statuses = {"not_started", "in_progress", "mastered", "needs_review"}
    if status and status not in valid_statuses:
        return error_response("VALIDATION_ERROR", f"status must be one of: {', '.join(valid_statuses)}", {}, 400)

    progress = StudentProgress.query.filter_by(
        student_id=student_id,
        concept_id=concept_id,
    ).first()

    now = datetime.now(timezone.utc)

    if progress is None:
        progress = StudentProgress(
            student_id=int(student_id),
            concept_id=int(concept_id),
            status=status or "not_started",
        )
        db.session.add(progress)
    else:
        if status:
            progress.status = status
        progress.last_attempted_at = now
        if status == "mastered":
            progress.mastered_at = now

    db.session.commit()

    return success_response(progress.to_dict())
