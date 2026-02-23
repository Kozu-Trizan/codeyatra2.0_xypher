"""
Problem, Checkpoint, CheckpointChoice, and ErrorPattern models.

Problem       : A structured question that tests a specific Concept.
Checkpoint    : One step inside a multi-step problem (guided calculation flow).
CheckpointChoice : A selectable option at a checkpoint (multiple-choice / slider value).
ErrorPattern  : Maps a wrong choice to a missing prerequisite concept for backtracking.

These tables power the "Learning Debugger" core loop:
  student sees checkpoint → picks answer → error pattern triggers backtrack.
"""

from app.models import db
from datetime import datetime, timezone


class Problem(db.Model):
    """
    A complete problem tied to one Concept.

    Example
    -------
    "A ball is launched at 20 m/s at 30°. Find the range."
    concept  → Projectile Motion
    difficulty  → 2
    """

    __tablename__ = "problems"

    id = db.Column(db.Integer, primary_key=True)
    concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Integer, default=1, nullable=False, index=True)  # 1-5

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- relationships ---
    concept = db.relationship("Concept", back_populates="problems")
    checkpoints = db.relationship(
        "Checkpoint",
        back_populates="problem",
        order_by="Checkpoint.order",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Problem {self.id}: {self.title[:40]}>"

    def to_dict(self, include_checkpoints=False):
        data = {
            "id": self.id,
            "concept_id": self.concept_id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
        }
        if include_checkpoints:
            data["checkpoints"] = [
                cp.to_dict(include_choices=True) for cp in self.checkpoints
            ]
        return data


class Checkpoint(db.Model):
    """
    One guided step inside a Problem.

    The student progresses through checkpoints sequentially.
    Each checkpoint has a question, a correct answer value, a unit,
    and an input_type that tells the frontend how to render it.

    input_type values: "multiple_choice", "slider", "numeric_input"
    """

    __tablename__ = "checkpoints"

    id = db.Column(db.Integer, primary_key=True)
    problem_id = db.Column(
        db.Integer,
        db.ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order = db.Column(db.Integer, nullable=False)  # display / progression order
    question = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.String(256), nullable=False)
    unit = db.Column(db.String(32), nullable=True)  # e.g. "m/s", "N"
    input_type = db.Column(db.String(32), default="multiple_choice", nullable=False)
    hint = db.Column(db.Text, nullable=True)  # optional static hint
    instruction = db.Column(db.Text, nullable=True)  # step instruction text

    # Tolerance for numeric comparison (e.g. ±0.5 for rounding)
    tolerance = db.Column(db.Float, default=0.01, nullable=False)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- constraints & indexes (spec §3.2.4) ---
    __table_args__ = (
        db.UniqueConstraint("problem_id", "order", name="uq_checkpoint_problem_order"),
        db.Index("idx_checkpoint_problem_order", "problem_id", "order"),
    )

    # --- relationships ---
    problem = db.relationship("Problem", back_populates="checkpoints")
    choices = db.relationship(
        "CheckpointChoice",
        back_populates="checkpoint",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    error_patterns = db.relationship(
        "ErrorPattern",
        back_populates="checkpoint",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<Checkpoint {self.id} (order={self.order})>"

    def to_dict(self, include_choices=False):
        data = {
            "id": self.id,
            "problem_id": self.problem_id,
            "order": self.order,
            "question": self.question,
            "correct_answer": self.correct_answer,
            "unit": self.unit,
            "input_type": self.input_type,
            "hint": self.hint,
            "tolerance": self.tolerance,
        }
        if include_choices:
            data["choices"] = [c.to_dict() for c in self.choices]
        return data


class CheckpointChoice(db.Model):
    """
    One selectable option shown at a checkpoint.

    For multiple-choice checkpoints each row is one radio-button option.
    `is_correct` marks the right answer; the rest are distractors.
    """

    __tablename__ = "checkpoint_choices"

    id = db.Column(db.Integer, primary_key=True)
    checkpoint_id = db.Column(
        db.Integer,
        db.ForeignKey("checkpoints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label = db.Column(db.String(256), nullable=False)  # display text, e.g. "17.3 m/s"
    value = db.Column(db.String(256), nullable=False)   # value (string or numeric)
    is_correct = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- relationships ---
    checkpoint = db.relationship("Checkpoint", back_populates="choices")

    def __repr__(self):
        return f"<Choice {self.id}: {self.label} ({'✓' if self.is_correct else '✗'})>"

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "value": self.value,
            "is_correct": self.is_correct,
        }


class ErrorPattern(db.Model):
    """
    Maps a specific wrong answer at a checkpoint to a diagnosis.

    When the student selects a value that matches `trigger_value` (within tolerance),
    the system knows:
      - which concept is missing (`missing_concept_id`)
      - what type of error it is (`error_type`)
      - a human-readable explanation (`diagnosis_text`)

    This is the deterministic lookup table that drives prerequisite backtracking
    WITHOUT needing any AI at runtime.
    """

    __tablename__ = "error_patterns"

    id = db.Column(db.Integer, primary_key=True)
    checkpoint_id = db.Column(
        db.Integer,
        db.ForeignKey("checkpoints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trigger_value = db.Column(db.String(256), nullable=False)
    trigger_tolerance = db.Column(db.Float, default=0.5, nullable=False)

    error_type = db.Column(db.String(64), nullable=False)
    # e.g. "TRIG_FUNCTION_SWAP", "VECTOR_DECOMPOSITION_OMITTED"

    diagnosis_text = db.Column(db.Text, nullable=False)
    # e.g. "Used sin instead of cos for horizontal component"

    missing_concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    confidence = db.Column(db.Float, default=0.9, nullable=False)  # 0-1

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- relationships ---
    checkpoint = db.relationship("Checkpoint", back_populates="error_patterns")
    missing_concept = db.relationship("Concept", foreign_keys=[missing_concept_id])

    def __repr__(self):
        return f"<ErrorPattern {self.id}: {self.error_type}>"

    def to_dict(self):
        return {
            "id": self.id,
            "checkpoint_id": self.checkpoint_id,
            "trigger_value": self.trigger_value,
            "error_type": self.error_type,
            "diagnosis_text": self.diagnosis_text,
            "missing_concept_id": self.missing_concept_id,
            "confidence": self.confidence,
        }
