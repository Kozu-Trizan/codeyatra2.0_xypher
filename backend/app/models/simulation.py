"""
Simulation models.

Simulation: metadata linking a simulation to a concept.
SimulationInteraction: tracks every student session with a simulation.
"""

from datetime import datetime, timezone
from app.models import db


class Simulation(db.Model):
    """Simulation metadata — one row per concept that owns a simulation."""

    __tablename__ = "simulations"

    id = db.Column(db.Integer, primary_key=True)
    concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    simulation_type = db.Column(db.String(64), nullable=False)
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text)
    configuration = db.Column(db.JSON)  # type-specific defaults

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    concept = db.relationship("Concept", backref="simulations")
    interactions = db.relationship(
        "SimulationInteraction",
        back_populates="simulation",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "concept_id": self.concept_id,
            "type": self.simulation_type,
            "title": self.title,
            "description": self.description,
            "configuration": self.configuration,
        }


class SimulationInteraction(db.Model):
    """One student session inside a simulation."""

    __tablename__ = "simulation_interactions"

    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(
        db.Integer,
        db.ForeignKey("simulations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = db.Column(db.String(64), index=True)

    started_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at = db.Column(db.DateTime)
    time_spent_seconds = db.Column(db.Integer)

    interactions = db.Column(db.JSON, nullable=False, default=list)
    final_state = db.Column(db.JSON, nullable=False, default=dict)
    validation_result = db.Column(db.JSON)
    mastery_achieved = db.Column(db.Boolean, default=False)

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    simulation = db.relationship("Simulation", back_populates="interactions")
    student = db.relationship("Student")

    def to_dict(self):
        return {
            "id": self.id,
            "simulation_id": self.simulation_id,
            "student_id": self.student_id,
            "session_id": self.session_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "time_spent_seconds": self.time_spent_seconds,
            "mastery_achieved": self.mastery_achieved,
            "validation_result": self.validation_result,
        }
