"""
Resource model.

Stores curated learning resources (YouTube links with timestamps, articles, etc.)
for a given Concept.

Supports:
  GET /api/resources/{concept_id} — get curated YouTube links with timestamps
"""

from app.models import db
from datetime import datetime, timezone


class Resource(db.Model):
    """
    A curated external resource linked to a Concept.

    resource_type values: "youtube", "article", "simulation", "documentation"

    For YouTube resources:
      url           = full video URL
      start_seconds = timestamp where relevant explanation begins
      end_seconds   = timestamp where it ends (nullable)
    """

    __tablename__ = "resources"

    id = db.Column(db.Integer, primary_key=True)
    concept_id = db.Column(
        db.Integer,
        db.ForeignKey("concepts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    resource_type = db.Column(db.String(32), default="youtube", nullable=False)
    title = db.Column(db.String(256), nullable=False)
    url = db.Column(db.String(512), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # YouTube-specific timestamp fields
    start_seconds = db.Column(db.Integer, nullable=True)
    end_seconds = db.Column(db.Integer, nullable=True)

    # Optional quality / relevance ordering
    priority = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # --- indexes (spec §3.2.7) ---
    __table_args__ = (
        db.Index("idx_resource_concept_priority", "concept_id", priority.desc()),
    )

    # --- relationships ---
    concept = db.relationship("Concept", back_populates="resources")

    def __repr__(self):
        return f"<Resource {self.id}: {self.title[:40]}>"

    def to_dict(self):
        return {
            "id": self.id,
            "concept_id": self.concept_id,
            "resource_type": self.resource_type,
            "title": self.title,
            "url": self.url,
            "description": self.description,
            "start_seconds": self.start_seconds,
            "end_seconds": self.end_seconds,
            "priority": self.priority,
        }
