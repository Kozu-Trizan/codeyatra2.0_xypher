"""
Problem routes.

GET /api/problems           — list problems (filterable by concept_id, difficulty)
GET /api/problems/<id>      — full problem with checkpoints + choices (no answers!)
"""

from flask import Blueprint, request

from app.models import Problem, Checkpoint, CheckpointChoice
from app.utils.response import success_response, error_response

problems_bp = Blueprint("problems", __name__)

@problems_bp.get("/")
def list_problems():
    query = Problem.query

    concept_id = request.args.get("concept_id", type=int)
    if concept_id is not None:
        query = query.filter(Problem.concept_id == concept_id)

    difficulty = request.args.get("difficulty", type=int)
    if difficulty is not None:
        query = query.filter(Problem.difficulty == difficulty)

    problems = query.all()

    data = []
    for p in problems:
        d = p.to_dict()
        d["checkpoint_count"] = Checkpoint.query.filter_by(problem_id=p.id).count()
        data.append(d)

    return success_response({"problems": data})


@problems_bp.route("/<int:problem_id>")
def get_problem(problem_id):
    problem = Problem.query.get(problem_id)
    if problem is None:
        return error_response("NOT_FOUND", "Problem not found.", {"id": problem_id}, 404)

    checkpoints = (
        Checkpoint.query
        .filter_by(problem_id=problem.id)
        .order_by(Checkpoint.order)
        .all()
    )

    cp_list = []
    for cp in checkpoints:
        choices = CheckpointChoice.query.filter_by(checkpoint_id=cp.id).all()
        cp_dict = {
            "id": cp.id,
            "order": cp.order,
            "question": cp.question,
            "unit": cp.unit,
            "input_type": cp.input_type,
            "hint": cp.hint,
            "choices": [
                {"id": c.id, "label": c.label, "value": c.value}
                for c in choices
            ],
        }
        cp_list.append(cp_dict)

    return success_response({
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "concept_id": problem.concept_id,
        "difficulty": problem.difficulty, "checkpoints": cp_list,
    })
