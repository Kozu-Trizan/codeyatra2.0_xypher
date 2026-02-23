"""
Problem, Step, StepOption, and ErrorPattern models.

Problem    : A structured question that tests a specific Concept.
Step       : One guided step inside a multi-step problem (replaces Checkpoint).
StepOption : A selectable option at a step (multiple-choice).
ErrorPattern : Maps a wrong choice to a missing prerequisite concept for backtracking.

These tables power the "Learning Debugger" core loop:
  student sees step → picks option → correct/incorrect feedback with explanation.
"""

from app.models import db
from datetime import datetime, timezone


class Problem(db.Model):
    """
    A complete problem tied to one Concept.

    Supports the new step-based problem format from sikshya_problems_dataset.json.
    """

    __tablename__ = "problems"

    id = db.Column(db.Integer, primary_key=True)
    ext_id = db.Column(db.String(32), unique=True, nullable=True, index=True)  # e.g. "PHY_001"
    concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Integer, default=1, nullable=False, index=True)  # 1-3

    # Extended fields from the new dataset
    subject = db.Column(db.String(64), nullable=True, index=True)   # "Physics", "Chemistry", "Mathematics"
    topic = db.Column(db.String(128), nullable=True, index=True)     # "Vectors and Scalars"
    subtopic = db.Column(db.String(128), nullable=True)              # "Vector Addition and Components"
    problem_type = db.Column(db.String(64), nullable=True)           # "Numerical", "Conceptual"
    neb_alignment = db.Column(db.String(256), nullable=True)         # "Vector Addition - Basic"
    problem_statement = db.Column(db.Text, nullable=True)            # full problem text

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- relationships ---
    concept = db.relationship("Concept", back_populates="problems")
    steps = db.relationship(
        "Step",
        back_populates="problem",
        order_by="Step.step_number",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Problem {self.id} ({self.ext_id}): {self.title[:40]}>"

    def to_dict(self, include_steps=False):
        data = {
            "id": self.id,
            "ext_id": self.ext_id,
            "concept_id": self.concept_id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
            "subject": self.subject,
            "topic": self.topic,
            "subtopic": self.subtopic,
            "problem_type": self.problem_type,
            "neb_alignment": self.neb_alignment,
            "problem_statement": self.problem_statement,
        }
        if include_steps:
            data["steps"] = [s.to_dict(include_options=True) for s in self.steps]
        return data


class Step(db.Model):
    """
    One guided step inside a Problem.

    The student progresses through steps sequentially.
    Each step has a title, description, correct_answer (text), and an
    explanation shown after the student answers correctly.
    """

    __tablename__ = "steps"

    id = db.Column(db.Integer, primary_key=True)
    problem_id = db.Column(
        db.Integer,
        db.ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    step_number = db.Column(db.Integer, nullable=False)   # 1-based ordering
    step_title = db.Column(db.String(256), nullable=False)
    step_description = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.Text, nullable=False)   # full text of the correct option
    explanation = db.Column(db.Text, nullable=True)       # shown after student answers correctly

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        db.UniqueConstraint("problem_id", "step_number", name="uq_step_problem_number"),
        db.Index("idx_step_problem_number", "problem_id", "step_number"),
    )

    # --- relationships ---
    problem = db.relationship("Problem", back_populates="steps")
    options = db.relationship(
        "StepOption",
        back_populates="step",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="StepOption.id",
    )

    def __repr__(self):
        return f"<Step {self.id} (step={self.step_number}): {self.step_title[:40]}>"

    def to_dict(self, include_options=False):
        data = {
            "id": self.id,
            "problem_id": self.problem_id,
            "step_number": self.step_number,
            "step_title": self.step_title,
            "step_description": self.step_description,
        }
        if include_options:
            data["options"] = [o.to_dict() for o in self.options]
        return data

    def to_dict_with_answer(self):
        """Include explanation (only safe to send after student answers correctly)."""
        d = self.to_dict(include_options=True)
        d["explanation"] = self.explanation
        return d


class StepOption(db.Model):
    """
    One selectable option shown at a step (multiple-choice).
    `is_correct` marks the right answer; the rest are distractors.
    """

    __tablename__ = "step_options"

    id = db.Column(db.Integer, primary_key=True)
    step_id = db.Column(
        db.Integer,
        db.ForeignKey("steps.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- relationships ---
    step = db.relationship("Step", back_populates="options")

    def __repr__(self):
        return f"<StepOption {self.id}: {'✓' if self.is_correct else '✗'} {self.option_text[:40]}>"

    def to_dict(self):
        return {
            "id": self.id,
            "option_text": self.option_text,
            # NOTE: is_correct intentionally omitted here — sent only in verify responses
        }


class ErrorPattern(db.Model):
    """
    Legacy: maps a wrong answer pattern to a diagnosis for backtracking.
    Kept for compatibility but not used with step-based problems.
    """

    __tablename__ = "error_patterns"

    id = db.Column(db.Integer, primary_key=True)
    step_id = db.Column(db.Integer, nullable=True, index=True)   # now optional / unused
    trigger_value = db.Column(db.String(256), nullable=False)
    trigger_tolerance = db.Column(db.Float, default=0.5, nullable=False)
    error_type = db.Column(db.String(64), nullable=False)
    diagnosis_text = db.Column(db.Text, nullable=False)
    missing_concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    confidence = db.Column(db.Float, default=0.9, nullable=False)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self):
        return f"<ErrorPattern {self.id}: {self.error_type}>"

    def to_dict(self):
        return {
            "id": self.id,
            "trigger_value": self.trigger_value,
            "error_type": self.error_type,
            "diagnosis_text": self.diagnosis_text,
            "missing_concept_id": self.missing_concept_id,
            "confidence": self.confidence,
        }
