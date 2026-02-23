"""
Concept routes.

GET /api/concepts                     — list / filter concepts
GET /api/concepts/<id>                — single concept
GET /api/concepts/<id>/path           — prerequisite chain
GET /api/concepts/dependency-graph    — react-flow graph
"""

from flask import Blueprint, request
from app.models import Concept
from app.utils.response import success_response, error_response

concepts_bp = Blueprint("concepts", __name__)

@concepts_bp.get("/")
def list_concepts():
    query = Concept.query

    # --- optional filters ---
    subject = request.args.get("subject")
    if subject:
        query = query.filter(Concept.subject == subject)

    topic = request.args.get("topic")
    if topic:
        query = query.filter(Concept.topic == topic)

    diff_min = request.args.get("difficulty_min", type=int)
    if diff_min is not None:
        query = query.filter(Concept.difficulty >= diff_min)

    diff_max = request.args.get("difficulty_max", type=int)
    if diff_max is not None:
        query = query.filter(Concept.difficulty <= diff_max)

    concepts = query.order_by(Concept.difficulty).all()
    include_prereqs = request.args.get("include_prerequisites", "false").lower() == "true"

    return success_response({
        "concepts": [c.to_dict(include_prerequisites=include_prereqs) for c in concepts],
        "count": len(concepts),
    })


@concepts_bp.get("/<int:concept_id>")
def get_concept(concept_id):
    concept = Concept.query.get(concept_id)
    if concept is None:
        return error_response("NOT_FOUND", "Concept not found.", {"id": concept_id}, 404)
    return success_response(concept.to_dict(include_prerequisites=True))


@concepts_bp.get("/<int:concept_id>/path")
def get_concept_path(concept_id):
    concept = Concept.query.get(concept_id)
    if concept is None:
        return error_response("NOT_FOUND", "Concept not found.", {"id": concept_id}, 404)

    chain = concept.get_prerequisite_chain()

    prerequisite_chain = [
        {"id": c.id, "name": c.name, "order": i, "difficulty": c.difficulty}
        for i, c in enumerate(chain)
    ]

    prerequisite_chain.append({
        "id": concept.id,
        "name": concept.name,
        "order": len(prerequisite_chain),
        "difficulty": concept.difficulty,
    })

    return success_response({
        "concept_id": concept.id,
        "concept_name": concept.name,
        "prerequisite_chain": prerequisite_chain,
    })


@concepts_bp.get("/dependency-graph")
def dependency_graph():
    graph = Concept.get_dependency_graph()
    return success_response(graph)
