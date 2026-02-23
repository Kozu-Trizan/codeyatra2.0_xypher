"""
Simulation API routes.

GET  /api/simulations/<concept_id>            — simulation metadata for a concept
POST /api/simulations/<sim_id>/start          — start interaction session
POST /api/simulations/<sim_id>/interactions   — log a batch of interactions
POST /api/simulations/<sim_id>/submit         — submit final answer for validation
"""

import math
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import db, StudentProgress
from app.models.simulation import Simulation, SimulationInteraction
from app.utils.response import success_response, error_response
from app.services.simulation_validator import SimulationValidator

simulations_bp = Blueprint("simulations", __name__)


# ------------------------------------------------------------------
# GET  /api/simulations/<concept_id>
# ------------------------------------------------------------------

@simulations_bp.route("/<int:concept_id>", methods=["GET"])
def get_simulation_by_concept(concept_id):
    simulation = Simulation.query.filter_by(concept_id=concept_id).first()
    if not simulation:
        return error_response(
            "NOT_FOUND",
            "No simulation found for this concept.",
            {"concept_id": concept_id},
            404,
        )
    return success_response({"simulation": simulation.to_dict()})


# ------------------------------------------------------------------
# GET  /api/simulations  — list all simulations
# ------------------------------------------------------------------

@simulations_bp.route("", methods=["GET"])
def list_simulations():
    sims = Simulation.query.order_by(Simulation.id).all()
    return success_response({
        "simulations": [s.to_dict() for s in sims],
        "count": len(sims),
    })


# ------------------------------------------------------------------
# POST /api/simulations/<sim_id>/start
# ------------------------------------------------------------------

@simulations_bp.route("/<int:simulation_id>/start", methods=["POST"])
@jwt_required()
def start_simulation(simulation_id):
    student_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    simulation = Simulation.query.get(simulation_id)
    if not simulation:
        return error_response("NOT_FOUND", "Simulation not found.", {}, 404)

    interaction = SimulationInteraction(
        simulation_id=simulation_id,
        student_id=student_id,
        session_id=data.get("session_id"),
        interactions=[],
        final_state={},
    )
    db.session.add(interaction)
    db.session.commit()

    return success_response(
        {
            "interaction_id": interaction.id,
            "started_at": interaction.started_at.isoformat(),
        },
        201,
    )


# ------------------------------------------------------------------
# POST /api/simulations/<sim_id>/interactions
# ------------------------------------------------------------------

@simulations_bp.route("/<int:simulation_id>/interactions", methods=["POST"])
@jwt_required()
def log_interactions(simulation_id):
    student_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    interaction_id = data.get("interaction_id")
    batch = data.get("interactions", [])

    interaction = SimulationInteraction.query.get(interaction_id)
    if not interaction or interaction.student_id != student_id:
        return error_response("NOT_FOUND", "Interaction not found.", {}, 404)

    current = list(interaction.interactions or [])
    current.extend(batch)
    interaction.interactions = current
    db.session.commit()

    return success_response({"logged": len(batch)})


# ------------------------------------------------------------------
# POST /api/simulations/<sim_id>/submit
# ------------------------------------------------------------------

@simulations_bp.route("/<int:simulation_id>/submit", methods=["POST"])
@jwt_required()
def submit_simulation(simulation_id):
    student_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    interaction_id = data.get("interaction_id")
    final_state = data.get("final_state", {})

    interaction = SimulationInteraction.query.get(interaction_id)
    if not interaction or interaction.student_id != student_id:
        return error_response("NOT_FOUND", "Interaction not found.", {}, 404)

    simulation = Simulation.query.get(simulation_id)
    if not simulation:
        return error_response("NOT_FOUND", "Simulation not found.", {}, 404)

    # Validate
    validation = SimulationValidator.validate(
        simulation.simulation_type, final_state
    )

    # Persist results
    interaction.final_state = final_state
    interaction.validation_result = validation
    interaction.mastery_achieved = validation.get("correct", False)
    interaction.completed_at = datetime.now(timezone.utc)
    if interaction.started_at:
        interaction.time_spent_seconds = int(
            (interaction.completed_at - interaction.started_at).total_seconds()
        )
    db.session.commit()

    # Update StudentProgress when mastery achieved
    if validation.get("correct"):
        progress = StudentProgress.query.filter_by(
            student_id=student_id, concept_id=simulation.concept_id
        ).first()
        if progress:
            progress.status = "mastered"
            progress.mastery_score = 1.0
            progress.mastered_at = datetime.now(timezone.utc)
        else:
            progress = StudentProgress(
                student_id=student_id,
                concept_id=simulation.concept_id,
                status="mastered",
                mastery_score=1.0,
                mastered_at=datetime.now(timezone.utc),
            )
            db.session.add(progress)
        db.session.commit()

    return success_response({"validation": validation})
