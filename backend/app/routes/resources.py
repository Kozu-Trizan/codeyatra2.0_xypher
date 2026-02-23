"""
Resource routes.

GET /api/resources/<concept_id>               — curated resources for a concept
GET /api/resources/<concept_id>/youtube-embed  — embed URL with timestamp
"""

from flask import Blueprint

from app.models import Resource, Concept
from app.utils.response import success_response, error_response

resources_bp = Blueprint("resources", __name__)


@resources_bp.get("/<int:concept_id>")
def get_resources(concept_id):
    concept = Concept.query.get(concept_id)
    if concept is None:
        return error_response("NOT_FOUND", "Concept not found.", {"concept_id": concept_id}, 404)

    resources = (
        Resource.query
        .filter_by(concept_id=concept_id)
        .order_by(Resource.priority.desc())
        .all()
    )

    return success_response({
        "concept_id": concept_id,
        "resources": [r.to_dict() for r in resources],
    })


@resources_bp.get("/<int:concept_id>/youtube-embed")
def youtube_embed(concept_id):
    concept = Concept.query.get(concept_id)
    if concept is None:
        return error_response("NOT_FOUND", "Concept not found.", {"concept_id": concept_id}, 404)

    resource = (
        Resource.query
        .filter_by(concept_id=concept_id, resource_type="youtube")
        .order_by(Resource.priority.desc())
        .first()
    )

    if resource is None:
        return error_response("NOT_FOUND", "No YouTube resource found for this concept.", {}, 404)

    # Build embed URL
    # Strip the watch URL down to video ID
    video_id = resource.url.split("v=")[-1].split("&")[0] if "v=" in resource.url else resource.url
    embed_url = f"https://www.youtube.com/embed/{video_id}"
    params = []
    if resource.start_seconds:
        params.append(f"start={resource.start_seconds}")
    if resource.end_seconds:
        params.append(f"end={resource.end_seconds}")
    if params:
        embed_url += "?" + "&".join(params)

    return success_response({
        "embed_url": embed_url,
        "resource": resource.to_dict(),
    })
