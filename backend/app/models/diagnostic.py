"""
DiagnosticQuestion, DiagnosticSession, and DiagnosticAnswer models.

These tables back the AI-driven diagnostic flow:
  POST /api/diagnose          — AI generates 3 diagnostic questions for a concept gap
  POST /api/diagnose/evaluate — AI evaluates student answers and determines pass/fail

DiagnosticQuestion : A question (AI-generated or pre-authored) that probes mastery
                     of a specific Concept.
DiagnosticSession  : One diagnostic attempt by a student for a concept (groups answers).
DiagnosticAnswer   : The student's response to a single diagnostic question within a session.
"""

from app.models import db
from datetime import datetime, timezone


class DiagnosticQuestion(db.Model):
    """
    A diagnostic question that tests understanding of a Concept.

    source values: "ai_generated", "manual"
    """

    __tablename__ = "diagnostic_questions"

    id = db.Column(db.Integer, primary_key=True)
    concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_text = db.Column(db.Text, nullable=False)
    expected_answer = db.Column(db.Text, nullable=True)  # reference / rubric answer
    source = db.Column(db.String(32), default="ai_generated", nullable=False)
    difficulty = db.Column(db.Integer, default=2, nullable=False)  # 1-5

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- relationships ---
    concept = db.relationship("Concept", back_populates="diagnostic_questions")
    answers = db.relationship(
        "DiagnosticAnswer", back_populates="question", lazy="dynamic"
    )

    def __repr__(self):
        return f"<DiagnosticQ {self.id} concept={self.concept_id}>"

    def to_dict(self):
        return {
            "id": self.id,
            "concept_id": self.concept_id,
            "question_text": self.question_text,
            "difficulty": self.difficulty,
            "source": self.source,
        }


class DiagnosticSession(db.Model):
    """
    One diagnostic attempt: a student is tested on a concept with N questions.

    result values: "pending", "pass", "fail"

    The session is created when /api/diagnose is called and finalised
    when /api/diagnose/evaluate returns a verdict.
    """

    __tablename__ = "diagnostic_sessions"

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

    result = db.Column(db.String(16), default="pending", nullable=False)
    # pass / fail threshold (e.g. 0.8 = 4 out of 5)
    pass_threshold = db.Column(db.Float, default=0.8, nullable=False)
    score = db.Column(db.Float, nullable=True)  # final score after evaluation

    started_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at = db.Column(db.DateTime, nullable=True)

    # --- indexes (spec §3.2.11) ---
    __table_args__ = (
        db.Index("idx_diag_session_student_concept", "student_id", "concept_id"),
    )

    # --- relationships ---
    student = db.relationship("Student", back_populates="diagnostic_sessions")
    concept = db.relationship("Concept")
    answers = db.relationship(
        "DiagnosticAnswer",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self):
        return (
            f"<DiagSession {self.id} student={self.student_id} "
            f"concept={self.concept_id} result={self.result}>"
        )

    def to_dict(self, include_answers=False):
        data = {
            "id": self.id,
            "student_id": self.student_id,
            "concept_id": self.concept_id,
            "result": self.result,
            "score": self.score,
            "pass_threshold": self.pass_threshold,
            "started_at": self.started_at.isoformat(),
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
        }
        if include_answers:
            data["answers"] = [a.to_dict() for a in self.answers]
        return data


class DiagnosticAnswer(db.Model):
    """
    A student's answer to one diagnostic question within a session.

    is_correct is populated after AI evaluation via /api/diagnose/evaluate.
    ai_feedback stores the AI's explanation of why the answer is right/wrong.
    """

    __tablename__ = "diagnostic_answers"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(
        db.Integer,
        db.ForeignKey("diagnostic_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id = db.Column(
        db.Integer,
        db.ForeignKey("diagnostic_questions.id", ondelete="CASCADE"),
        nullable=False,
    )

    student_answer = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, nullable=True)  # null until evaluated
    ai_feedback = db.Column(db.Text, nullable=True)

    answered_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- relationships ---
    session = db.relationship("DiagnosticSession", back_populates="answers")
    question = db.relationship("DiagnosticQuestion", back_populates="answers")

    def __repr__(self):
        return f"<DiagAnswer {self.id} session={self.session_id} correct={self.is_correct}>"

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "question_id": self.question_id,
            "student_answer": self.student_answer,
            "is_correct": self.is_correct,
            "ai_feedback": self.ai_feedback,
            "answered_at": self.answered_at.isoformat(),
        }
