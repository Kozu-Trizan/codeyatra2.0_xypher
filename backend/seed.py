"""
Database seed script — populates the database from JSON data files.

Reads:
  concepts.json            → Concept + ConceptPrerequisite
  resources.json           → Resource
  trigonometry.json         → Problem + Checkpoint + CheckpointChoice + ErrorPattern
  vector_decomposition.json → Problem + Checkpoint + CheckpointChoice + ErrorPattern
  projectile_motion.json    → Problem + Checkpoint + CheckpointChoice + ErrorPattern
  basic_algebra.json        → Problem + Checkpoint + CheckpointChoice + ErrorPattern

Usage:
  python seed.py           (from backend/ directory)
"""

import json
import os
import re
import sys

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.models import (
    db,
    Concept,
    ConceptPrerequisite,
    Problem,
    Checkpoint,
    CheckpointChoice,
    ErrorPattern,
    Resource,
    DiagnosticQuestion,
)

# --------------------------------------------------------------------
# Paths — JSON files live one level up (e:\Codeyatra_2_0\)
# --------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..")

CONCEPT_FILE = os.path.join(DATA_DIR, "concepts.json")
RESOURCE_FILE = os.path.join(DATA_DIR, "resources.json")
PROBLEM_FILES = [
    os.path.join(DATA_DIR, "trigonometry.json"),
    os.path.join(DATA_DIR, "vector_decomposition.json"),
    os.path.join(DATA_DIR, "projectile_motion.json"),
    os.path.join(DATA_DIR, "basic_algebra.json"),
]

# Map from slug to DB id (populated during concept seeding)
concept_id_map: dict[str, int] = {}

# Map difficulty strings to integers
DIFFICULTY_MAP = {"easy": 1, "medium": 2, "hard": 3}


def _load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _parse_numeric_value(raw: str | float | int) -> float | None:
    """Extract a numeric value from a choice label like '38.3 N' or '2.868 s'."""
    if isinstance(raw, (int, float)):
        return float(raw)
    raw = str(raw).strip()
    # Try to extract the leading number
    m = re.match(r'^[-+]?\d*\.?\d+', raw)
    if m:
        return float(m.group())
    return None


# ===================================================================
# 1. Seed Concepts
# ===================================================================
def seed_concepts():
    print("── Seeding concepts …")
    data = _load_json(CONCEPT_FILE)

    # Subject / topic mapping (all are physics-related in the NEB context)
    subject_map = {
        "basic_algebra": ("math", "Mathematics Foundation"),
        "right_triangles": ("math", "Geometry"),
        "trigonometry": ("math", "Trigonometry"),
        "vector_decomposition": ("physics", "Mechanics"),
        "kinematic_equations": ("physics", "Mechanics"),
        "projectile_motion": ("physics", "Mechanics"),
    }

    for c in data["concepts"]:
        slug = c["id"]
        subj, topic = subject_map.get(slug, ("physics", "General"))
        concept = Concept(
            name=c["name"],
            subject=subj,
            topic=topic,
            difficulty=c.get("difficulty", 1),
            description=c.get("description", ""),
        )
        db.session.add(concept)
        db.session.flush()  # assigns concept.id immediately
        concept_id_map[slug] = concept.id
        print(f"   + Concept [{concept.id}] {concept.name}")

    db.session.commit()

    # --- Prerequisites ---
    for c in data["concepts"]:
        slug = c["id"]
        for prereq_slug in c.get("prerequisites", []):
            if prereq_slug in concept_id_map:
                cp = ConceptPrerequisite(
                    concept_id=concept_id_map[slug],
                    prerequisite_id=concept_id_map[prereq_slug],
                    weight=3,
                )
                db.session.add(cp)
                print(f"   → {slug} depends on {prereq_slug}")

    db.session.commit()
    print(f"   ✓ {len(concept_id_map)} concepts seeded.\n")


# ===================================================================
# 2. Seed Resources
# ===================================================================
def seed_resources():
    print("── Seeding resources …")
    data = _load_json(RESOURCE_FILE)
    count = 0

    for r in data["resources"]:
        slug = r["concept_id"]
        cid = concept_id_map.get(slug)
        if cid is None:
            print(f"   ⚠ Unknown concept: {slug} — skipping resource {r['title']}")
            continue

        video_id = r.get("youtube_video_id", "")
        url = f"https://www.youtube.com/watch?v={video_id}" if video_id else ""

        resource = Resource(
            concept_id=cid,
            resource_type="youtube",
            title=r["title"],
            url=url,
            description=r.get("why_recommended", ""),
            start_seconds=r.get("start_seconds"),
            end_seconds=r.get("end_seconds"),
            priority=r.get("quality_rating", 0),
        )
        db.session.add(resource)
        count += 1

    db.session.commit()
    print(f"   ✓ {count} resources seeded.\n")


# ===================================================================
# 3. Seed Problems (with Checkpoints, Choices, ErrorPatterns)
# ===================================================================
def seed_problems():
    print("── Seeding problems …")
    total_p = 0
    total_cp = 0
    total_ch = 0
    total_ep = 0

    for path in PROBLEM_FILES:
        if not os.path.exists(path):
            print(f"   ⚠ File not found: {path} — skipping")
            continue

        data = _load_json(path)
        fname = os.path.basename(path)
        print(f"\n   📄 {fname}")

        for prob in data["problems"]:
            slug = prob["concept_id"]
            cid = concept_id_map.get(slug)
            if cid is None:
                print(f"      ⚠ Unknown concept: {slug} — skipping {prob['title']}")
                continue

            diff_raw = prob.get("difficulty", "easy")
            diff = DIFFICULTY_MAP.get(diff_raw, 1) if isinstance(diff_raw, str) else int(diff_raw)

            problem = Problem(
                concept_id=cid,
                title=prob["title"],
                description=prob.get("text", prob.get("description", "")),
                difficulty=diff,
            )
            db.session.add(problem)
            db.session.flush()
            total_p += 1
            print(f"      + Problem [{problem.id}] {problem.title}")

            for cp_idx, cp_data in enumerate(prob.get("checkpoints", [])):
                correct_val = None
                # Find the correct answer value from choices
                for ch in cp_data.get("choices", []):
                    if ch.get("is_correct"):
                        correct_val = _parse_numeric_value(ch.get("value", 0))
                        break

                if correct_val is None:
                    # Default correct value for conceptual checkpoints
                    correct_val = 1.0

                checkpoint = Checkpoint(
                    problem_id=problem.id,
                    order=cp_idx,
                    question=cp_data.get("question", ""),
                    correct_answer=correct_val,
                    unit=cp_data.get("unit", ""),
                    input_type=cp_data.get("type", "multiple_choice"),
                    hint=cp_data.get("hint_on_first_wrong", ""),
                    tolerance=0.5,  # generous for matching choice values
                )
                db.session.add(checkpoint)
                db.session.flush()
                total_cp += 1

                # --- Choices ---
                for ch in cp_data.get("choices", []):
                    raw_val = ch.get("value", 0)
                    numeric_val = _parse_numeric_value(raw_val)
                    label = str(raw_val) if isinstance(raw_val, str) else str(raw_val)

                    if numeric_val is None:
                        numeric_val = 0.0

                    choice = CheckpointChoice(
                        checkpoint_id=checkpoint.id,
                        label=label,
                        value=numeric_val,
                        is_correct=ch.get("is_correct", False),
                    )
                    db.session.add(choice)
                    total_ch += 1

                # --- Error Patterns ---
                for ep in cp_data.get("error_patterns", []):
                    missing_slug = ep.get("missing_concept_id", "")
                    missing_cid = concept_id_map.get(missing_slug)

                    # Find the trigger value from the wrong choice label
                    wrong_label = ep.get("wrong_choice", "")
                    trigger_val = _parse_numeric_value(wrong_label)
                    if trigger_val is None:
                        trigger_val = 0.0

                    # Derive error type from diagnosis text
                    diagnosis = ep.get("diagnosis", "")
                    error_type = _infer_error_type(diagnosis, missing_slug)

                    pattern = ErrorPattern(
                        checkpoint_id=checkpoint.id,
                        trigger_value=trigger_val,
                        trigger_tolerance=0.5,
                        error_type=error_type,
                        diagnosis_text=diagnosis,
                        missing_concept_id=missing_cid,
                        confidence=0.90,
                    )
                    db.session.add(pattern)
                    total_ep += 1

    db.session.commit()
    print(f"\n   ✓ {total_p} problems, {total_cp} checkpoints, {total_ch} choices, {total_ep} error patterns seeded.\n")


def _infer_error_type(diagnosis: str, missing_slug: str) -> str:
    """Derive a short error type code from the diagnosis text and missing concept."""
    d = diagnosis.lower()
    if "sin" in d and "cos" in d:
        return "TRIG_FUNCTION_SWAP"
    if "decompos" in d or "no trig" in d or "raw" in d or "magnitude" in d:
        return "VECTOR_DECOMPOSITION_OMITTED"
    if "half" in d or "divided by 2" in d:
        return "HALVED_VALUE"
    if "forgot" in d and ("double" in d or "2" in d or "back down" in d):
        return "FORGOT_TO_DOUBLE"
    if "peak" in d or "half" in d and "time" in d:
        return "HALF_TIME_USED"
    if "rearrang" in d or "cannot" in d:
        return "ALGEBRA_MISCONCEPTION"
    if missing_slug == "trigonometry":
        return "TRIG_ERROR"
    if missing_slug == "vector_decomposition":
        return "VECTOR_ERROR"
    if missing_slug == "kinematic_equations":
        return "KINEMATICS_ERROR"
    if missing_slug == "basic_algebra":
        return "ALGEBRA_ERROR"
    if missing_slug == "right_triangles":
        return "GEOMETRY_ERROR"
    return "UNKNOWN_ERROR"


# ===================================================================
# 4. Seed Diagnostic Questions (auto-generated from concept descriptions)
# ===================================================================
def seed_diagnostic_questions():
    """Seed basic diagnostic questions for each concept so /api/diagnose works."""
    print("── Seeding diagnostic questions …")
    count = 0

    diagnostic_bank = {
        "basic_algebra": [
            ("Rearrange v = u + at to solve for t.", "t = (v - u) / a"),
            ("If F = ma, what is a when F=20N and m=4kg?", "5"),
            ("Solve for x: 3x + 5 = 20", "5"),
            ("Rearrange s = ut + ½at² for a (when u=0).", "a = 2s / t²"),
            ("If KE = ½mv², what is v when KE=100J and m=2kg?", "10"),
        ],
        "right_triangles": [
            ("In a right triangle with legs 3 and 4, what is the hypotenuse?", "5"),
            ("If hypotenuse = 13 and one leg = 5, what is the other leg?", "12"),
            ("Which side of a right triangle is always the longest?", "hypotenuse"),
            ("A right triangle has legs 6 and 8. What is the hypotenuse?", "10"),
            ("True or False: The hypotenuse is always opposite the right angle.", "true"),
        ],
        "trigonometry": [
            ("sin(30°) = ?", "0.5"),
            ("cos(60°) = ?", "0.5"),
            ("If hypotenuse = 10 and angle = 30°, what is the opposite side?", "5"),
            ("Which trig ratio uses Adjacent / Hypotenuse?", "cos"),
            ("tan(45°) = ?", "1"),
        ],
        "vector_decomposition": [
            ("A 50N force at 40°. Horizontal component = 50 × ___(40°). Fill the trig function.", "cos"),
            ("Vertical component of a vector uses which trig function?", "sin"),
            ("If Fx=30N and Fy=40N, what is the magnitude of the resultant?", "50"),
            ("A vector at 0° from horizontal has vertical component = ?", "0"),
            ("True or False: √(Fx² + Fy²) should equal the original magnitude.", "true"),
        ],
        "kinematic_equations": [
            ("Using v = u + at, find v when u=10, a=2, t=3.", "16"),
            ("Using s = ut + ½at², find s when u=0, a=10, t=2.", "20"),
            ("What is the time to reach peak height if Vy=20 m/s and g=10 m/s²?", "2"),
            ("Total flight time for a vertical throw: T = 2 × Vy / g. If Vy=15 and g=10, T=?", "3"),
            ("Using v² = u² + 2as, find v when u=0, a=10, s=5.", "10"),
        ],
        "projectile_motion": [
            ("In projectile motion, which velocity component stays constant?", "horizontal"),
            ("Range = Vx × T. If Vx=20 m/s and T=3s, range = ?", "60"),
            ("Maximum height depends on which component: Vx or Vy?", "Vy"),
            ("At maximum height, the vertical velocity equals?", "0"),
            ("True or False: Horizontal and vertical motions are independent.", "true"),
        ],
    }

    for slug, questions in diagnostic_bank.items():
        cid = concept_id_map.get(slug)
        if cid is None:
            continue
        for i, (q_text, expected) in enumerate(questions):
            dq = DiagnosticQuestion(
                concept_id=cid,
                question_text=q_text,
                expected_answer=expected,
                source="manual",
                difficulty=min(i + 1, 5),
            )
            db.session.add(dq)
            count += 1

    db.session.commit()
    print(f"   ✓ {count} diagnostic questions seeded.\n")


# ===================================================================
# Main
# ===================================================================
def main():
    app = create_app("development")

    with app.app_context():
        # Drop and recreate all tables for a clean seed
        print("🗑  Dropping existing tables …")
        db.drop_all()
        print("🔨 Creating tables …")
        db.create_all()
        print()

        seed_concepts()
        seed_resources()
        seed_problems()
        seed_diagnostic_questions()

        print("═" * 50)
        print("✅ Database seeded successfully!")
        print(f"   DB path: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print("═" * 50)


if __name__ == "__main__":
    main()
