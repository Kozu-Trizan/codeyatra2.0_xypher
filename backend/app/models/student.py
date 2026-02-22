"""
Student and StudentProgress models.

Student         : A registered learner.
StudentProgress : Per-concept mastery status for each student.

Supports:
  POST /api/progress — update student concept status
"""

from app.models import db
from datetime import datetime, timezone


class Student(db.Model):
    """
    A learner using the platform.

    For the hackathon demo, authentication is minimal (email + hashed password).
    """

    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(256), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- relationships ---
    progress = db.relationship(
        "StudentProgress",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    diagnostic_sessions = db.relationship(
        "DiagnosticSession",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __repr__(self):
        return f"<Student {self.id}: {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
        }


class StudentProgress(db.Model):
    """
    Tracks a single student's mastery status for a single concept.

    status values
    -------------
    not_started : student has not attempted any problem for this concept
    in_progress : student has started but not yet proven mastery
    mastered    : student passed the mastery threshold (e.g. 4/5 correct)
    needs_review: previously mastered but flagged by a backtrack failure

    attempts     : total number of problem submissions for this concept
    mastery_score: latest score (0.0 – 1.0)
    """

    __tablename__ = "student_progress"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status = db.Column(
        db.String(32), default="not_started", nullable=False
    )  # not_started | in_progress | mastered | needs_review

    attempts = db.Column(db.Integer, default=0, nullable=False)
    mastery_score = db.Column(db.Float, default=0.0, nullable=False)

    last_attempted_at = db.Column(db.DateTime, nullable=True)
    mastered_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- constraints & indexes (spec §3.2.9) ---
    __table_args__ = (
        db.UniqueConstraint("student_id", "concept_id", name="uq_student_concept"),
        db.Index("idx_progress_student_status", "student_id", "status"),
        db.Index("idx_progress_concept", "concept_id"),
    )

    # --- relationships ---
    student = db.relationship("Student", back_populates="progress")
    concept = db.relationship("Concept")

    def __repr__(self):
        return f"<Progress student={self.student_id} concept={self.concept_id} status={self.status}>"

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "concept_id": self.concept_id,
            "status": self.status,
            "attempts": self.attempts,
            "mastery_score": self.mastery_score,
            "last_attempted_at": (
                self.last_attempted_at.isoformat() if self.last_attempted_at else None
            ),
            "mastered_at": (
                self.mastered_at.isoformat() if self.mastered_at else None
            ),
        }
