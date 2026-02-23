"""
Concept and ConceptPrerequisite models.

Concept: A single learning concept (node in the knowledge dependency graph).
ConceptPrerequisite: Self-referential many-to-many linking concepts to their prerequisites.

Supports:
  GET  /api/concepts           — list all concepts with prerequisite links
  GET  /api/concepts/{id}/path — get prerequisite chain for a concept
  POST /api/pathfind           — goal-backwards pathfinding from panic topic
"""

from app.models import db
from datetime import datetime, timezone


# --- Association table for the self-referential many-to-many ---
class ConceptPrerequisite(db.Model):
    """Edge in the concept dependency graph: concept_id depends on prerequisite_id."""

    __tablename__ = "concept_prerequisites"

    concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    prerequisite_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    # How strongly the prerequisite is required (1 = nice-to-know, 5 = hard blocker)
    weight = db.Column(db.Integer, default=3, nullable=False)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self):
        return f"<Prereq {self.concept_id} ← {self.prerequisite_id}>"


class Concept(db.Model):
    """
    A single learning concept such as "Vector Decomposition" or "Trigonometry".

    Fields
    ------
    subject   : broad subject area (e.g. "physics", "chemistry")
    topic     : chapter / unit name (e.g. "Mechanics")
    name      : unique concept name
    difficulty: 1-5 scale
    description: short explanation shown in UI cards
    """

    __tablename__ = "concepts"

    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(64), nullable=False)
    topic = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(256), nullable=False, unique=True)
    difficulty = db.Column(db.Integer, default=1, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    is_syllabus = db.Column(db.Boolean, default=True, nullable=False)  # False = foundational/hidden
    neb_class = db.Column(db.String(32), nullable=True)  # e.g. "11", "12"

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- indexes ---
    __table_args__ = (
        db.Index("idx_concept_subject_topic", "subject", "topic"),
    )

    # --- relationships ---
    # Concepts that THIS concept depends on
    prerequisites = db.relationship(
        "Concept",
        secondary="concept_prerequisites",
        primaryjoin="Concept.id == ConceptPrerequisite.concept_id",
        secondaryjoin="Concept.id == ConceptPrerequisite.prerequisite_id",
        backref=db.backref("dependents", lazy="dynamic"),
        lazy="dynamic",
    )

    # Problems that test this concept
    problems = db.relationship("Problem", back_populates="concept", lazy="dynamic")

    # Curated resources (YouTube links, etc.)
    resources = db.relationship("Resource", back_populates="concept", lazy="dynamic")

    # Diagnostic questions targeting this concept
    diagnostic_questions = db.relationship(
        "DiagnosticQuestion", back_populates="concept", lazy="dynamic"
    )

    def __repr__(self):
        return f"<Concept {self.id}: {self.name}>"

    # --- critical methods (spec §3.2.1) ---

    def get_prerequisite_chain(self):
        """
        Return ordered list of ALL prerequisites via depth-first traversal.
        Used for call-stack visualisation and gap detection.
        Avoids cycles by tracking visited nodes.
        Returns deduplicated list preserving first-seen order.
        """
        visited = set()
        chain = []

        def _dfs(concept):
            if concept.id in visited:
                return
            visited.add(concept.id)
            for prereq in concept.prerequisites:
                _dfs(prereq)
                if prereq.id not in {c.id for c in chain}:
                    chain.append(prereq)

        _dfs(self)
        return chain

    def get_missing_prerequisites(self, student_id):
        """
        Identify which prerequisites the student has NOT mastered.
        Returns list of Concept objects the student still needs to learn.
        """
        from app.models.student import StudentProgress

        chain = self.get_prerequisite_chain()
        if not chain:
            return []

        prereq_ids = [c.id for c in chain]
        mastered = {
            sp.concept_id
            for sp in StudentProgress.query.filter(
                StudentProgress.student_id == student_id,
                StudentProgress.concept_id.in_(prereq_ids),
                StudentProgress.status == "mastered",
            ).all()
        }
        return [c for c in chain if c.id not in mastered]

    @staticmethod
    def get_dependency_graph():
        """
        Return complete dependency graph for frontend visualisation.
        Format: {nodes: [...], edges: [...]}  (react-flow compatible)
        """
        concepts = Concept.query.all()
        edges = ConceptPrerequisite.query.all()

        nodes = [
            {
                "id": str(c.id),
                "data": {"label": c.name, "subject": c.subject, "topic": c.topic},
                "position": {"x": 0, "y": 0},
            }
            for c in concepts
        ]
        edge_list = [
            {
                "id": f"e{e.prerequisite_id}-{e.concept_id}",
                "source": str(e.prerequisite_id),
                "target": str(e.concept_id),
                "label": str(e.weight),
            }
            for e in edges
        ]
        return {"nodes": nodes, "edges": edge_list}

    def to_dict(self, include_prerequisites=False):
        data = {
            "id": self.id,
            "subject": self.subject,
            "topic": self.topic,
            "name": self.name,
            "difficulty": self.difficulty,
            "description": self.description,
            "is_syllabus": self.is_syllabus,
            "neb_class": self.neb_class,
        }
        if include_prerequisites:
            data["prerequisites"] = [
                {"id": p.id, "name": p.name} for p in self.prerequisites
            ]
        return data
