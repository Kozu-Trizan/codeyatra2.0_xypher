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
from app.models.simulation import Simulation

# --------------------------------------------------------------------
# Paths — JSON files live in backend/data/
# --------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

CONCEPT_FILE = os.path.join(DATA_DIR, "concepts.json")
RESOURCE_FILE = os.path.join(DATA_DIR, "resources.json")
PROBLEM_FILES = [
    os.path.join(DATA_DIR, "trigonometry.json"),
    os.path.join(DATA_DIR, "vector_decomposition.json"),
    os.path.join(DATA_DIR, "projectile_motion.json"),
    os.path.join(DATA_DIR, "basic_algebra.json"),
    os.path.join(DATA_DIR, "problems.json"),
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

    # Subject / topic mapping
    subject_map = {
        "basic_algebra": ("math", "Mathematics Foundation"),
        "right_triangles": ("math", "Geometry"),
        "trigonometry": ("math", "Trigonometry"),
        "vector_decomposition": ("physics", "Mechanics"),
        "kinematic_equations": ("physics", "Mechanics"),
        "projectile_motion": ("physics", "Mechanics"),
        "newtons_laws": ("physics", "Mechanics"),
        "work_energy_power": ("physics", "Mechanics"),
        "gravitation": ("physics", "Mechanics"),
        "simple_harmonic_motion": ("physics", "Waves & Oscillations"),
        "wave_motion": ("physics", "Waves & Oscillations"),
        "current_electricity": ("physics", "Electricity"),
        "magnetic_fields": ("physics", "Magnetism"),
    }

    # Concepts that are NOT directly in the NEB syllabus chapters
    # (they are foundational / dependency-only)
    non_syllabus_slugs = {"basic_algebra", "right_triangles", "organic_chemistry_basics", "calculus_basics"}

    for c in data["concepts"]:
        slug = c["id"]
        subj, topic = subject_map.get(slug, ("physics", "General"))
        is_syllabus = c.get("is_syllabus", slug not in non_syllabus_slugs)
        concept = Concept(
            name=c["name"],
            subject=subj,
            topic=topic,
            difficulty=c.get("difficulty", 1),
            description=c.get("description", ""),
            is_syllabus=is_syllabus,
            neb_class=c.get("neb_class"),
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
                # Find the correct answer value from choices (keep as string)
                for ch in cp_data.get("choices", []):
                    if ch.get("is_correct"):
                        correct_val = str(ch.get("value", ""))
                        break

                if correct_val is None:
                    correct_val = ""

                checkpoint = Checkpoint(
                    problem_id=problem.id,
                    order=cp_idx,
                    question=cp_data.get("question", ""),
                    correct_answer=correct_val,
                    unit=cp_data.get("unit", ""),
                    input_type=cp_data.get("type", "multiple_choice"),
                    hint=cp_data.get("hint_on_first_wrong", ""),
                    instruction=cp_data.get("instruction"),
                    tolerance=0.5,  # generous for matching choice values
                )
                db.session.add(checkpoint)
                db.session.flush()
                total_cp += 1

                # --- Choices (store value as string) ---
                for ch in cp_data.get("choices", []):
                    raw_val = ch.get("value", "")
                    label = str(raw_val)

                    choice = CheckpointChoice(
                        checkpoint_id=checkpoint.id,
                        label=label,
                        value=label,
                        is_correct=ch.get("is_correct", False),
                    )
                    db.session.add(choice)
                    total_ch += 1

                # --- Error Patterns (store trigger as string) ---
                for ep in cp_data.get("error_patterns", []):
                    missing_slug = ep.get("missing_concept_id", "")
                    missing_cid = concept_id_map.get(missing_slug)

                    wrong_label = str(ep.get("wrong_choice", ""))

                    # Derive error type from diagnosis text
                    diagnosis = ep.get("diagnosis", "")
                    error_type = _infer_error_type(diagnosis, missing_slug)

                    pattern = ErrorPattern(
                        checkpoint_id=checkpoint.id,
                        trigger_value=wrong_label,
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
    if missing_slug == "organic_chemistry_basics":
        return "ORGANIC_CHEM_ERROR"
    if missing_slug == "calculus_basics":
        return "CALCULUS_ERROR"
    return "UNKNOWN_ERROR"


# ===================================================================
# 4. Seed Diagnostic Questions (auto-generated from concept descriptions)
# ===================================================================
def seed_diagnostic_questions():
    """Seed MCQ diagnostic questions for each concept so /api/diagnose works."""
    import json as _json
    print("── Seeding diagnostic questions …")
    count = 0

    # Format: (question_text, choices_list, correct_choice_id)
    # choices_list = [{"id": "a", "text": "..."}, ...]  correct_choice_id = "a"/"b"/"c"/"d"
    diagnostic_bank = {
        "basic_algebra": [
            ("If F = ma, what is a when F = 20 N and m = 4 kg?",
             [{"id":"a","text":"4 m/s²"},{"id":"b","text":"5 m/s²"},{"id":"c","text":"80 m/s²"},{"id":"d","text":"16 m/s²"}], "b"),
            ("Solve for x: 3x + 5 = 20",
             [{"id":"a","text":"3"},{"id":"b","text":"4"},{"id":"c","text":"5"},{"id":"d","text":"6"}], "c"),
            ("Which operation isolates a variable when it is multiplied on both sides?",
             [{"id":"a","text":"Addition"},{"id":"b","text":"Division"},{"id":"c","text":"Multiplication"},{"id":"d","text":"Squaring"}], "b"),
            ("If KE = ½mv², what is v when KE = 50 J and m = 2 kg?",
             [{"id":"a","text":"5 m/s"},{"id":"b","text":"7 m/s"},{"id":"c","text":"10 m/s"},{"id":"d","text":"25 m/s"}], "a"),
            ("Rearrange v = u + at for t.",
             [{"id":"a","text":"t = (v + u) / a"},{"id":"b","text":"t = (v − u) / a"},{"id":"c","text":"t = v / a"},{"id":"d","text":"t = u − v / a"}], "b"),
        ],
        "right_triangles": [
            ("A right triangle has legs 3 and 4. What is the hypotenuse?",
             [{"id":"a","text":"5"},{"id":"b","text":"6"},{"id":"c","text":"7"},{"id":"d","text":"8"}], "a"),
            ("If hypotenuse = 13 and one leg = 5, what is the other leg?",
             [{"id":"a","text":"8"},{"id":"b","text":"10"},{"id":"c","text":"12"},{"id":"d","text":"11"}], "c"),
            ("Which side of a right triangle is always the longest?",
             [{"id":"a","text":"Adjacent"},{"id":"b","text":"Opposite"},{"id":"c","text":"Hypotenuse"},{"id":"d","text":"Base"}], "c"),
            ("A right triangle has legs 6 and 8. What is the hypotenuse?",
             [{"id":"a","text":"10"},{"id":"b","text":"12"},{"id":"c","text":"14"},{"id":"d","text":"9"}], "a"),
            ("The square of the hypotenuse equals ___.",
             [{"id":"a","text":"sum of squares of legs"},{"id":"b","text":"product of the legs"},{"id":"c","text":"difference of squares of legs"},{"id":"d","text":"half the sum of legs"}], "a"),
        ],
        "trigonometry": [
            ("sin(30°) = ?",
             [{"id":"a","text":"1"},{"id":"b","text":"0.5"},{"id":"c","text":"√3/2"},{"id":"d","text":"0"}], "b"),
            ("cos(60°) = ?",
             [{"id":"a","text":"√3/2"},{"id":"b","text":"1"},{"id":"c","text":"0.5"},{"id":"d","text":"0"}], "c"),
            ("Which trig ratio equals Adjacent / Hypotenuse?",
             [{"id":"a","text":"sin"},{"id":"b","text":"tan"},{"id":"c","text":"cos"},{"id":"d","text":"sec"}], "c"),
            ("tan(45°) = ?",
             [{"id":"a","text":"0"},{"id":"b","text":"0.5"},{"id":"c","text":"√3"},{"id":"d","text":"1"}], "d"),
            ("If hypotenuse = 10 and angle = 30°, the opposite side is?",
             [{"id":"a","text":"5"},{"id":"b","text":"8.66"},{"id":"c","text":"10"},{"id":"d","text":"3"}], "a"),
        ],
        "vector_decomposition": [
            ("Horizontal component of a vector uses which trig function?",
             [{"id":"a","text":"sin"},{"id":"b","text":"tan"},{"id":"c","text":"cos"},{"id":"d","text":"cot"}], "c"),
            ("A vector at 0° from horizontal has vertical component = ?",
             [{"id":"a","text":"Equal to full magnitude"},{"id":"b","text":"0"},{"id":"c","text":"Half the magnitude"},{"id":"d","text":"Undefined"}], "b"),
            ("If Fx = 30 N and Fy = 40 N, the magnitude of the resultant is?",
             [{"id":"a","text":"70 N"},{"id":"b","text":"35 N"},{"id":"c","text":"50 N"},{"id":"d","text":"10 N"}], "c"),
            ("Vertical component is calculated as F × ___.",
             [{"id":"a","text":"cos θ"},{"id":"b","text":"tan θ"},{"id":"c","text":"sin θ"},{"id":"d","text":"1/sin θ"}], "c"),
            ("A vector at 90° from horizontal has horizontal component = ?",
             [{"id":"a","text":"Full magnitude"},{"id":"b","text":"Half magnitude"},{"id":"c","text":"0"},{"id":"d","text":"Negative magnitude"}], "c"),
        ],
        "kinematic_equations": [
            ("Using v = u + at, find v when u = 10, a = 2, t = 3.",
             [{"id":"a","text":"12"},{"id":"b","text":"14"},{"id":"c","text":"16"},{"id":"d","text":"20"}], "c"),
            ("Using s = ut + ½at², find s when u = 0, a = 10, t = 2.",
             [{"id":"a","text":"10"},{"id":"b","text":"20"},{"id":"c","text":"40"},{"id":"d","text":"5"}], "b"),
            ("Time to reach peak height if Vy = 20 m/s and g = 10 m/s²?",
             [{"id":"a","text":"1 s"},{"id":"b","text":"2 s"},{"id":"c","text":"4 s"},{"id":"d","text":"10 s"}], "b"),
            ("Using v² = u² + 2as, find v when u = 0, a = 10, s = 5.",
             [{"id":"a","text":"5 m/s"},{"id":"b","text":"8 m/s"},{"id":"c","text":"10 m/s"},{"id":"d","text":"50 m/s"}], "c"),
            ("Total flight time T = 2Vy/g. If Vy = 15 m/s and g = 10, T = ?",
             [{"id":"a","text":"1 s"},{"id":"b","text":"1.5 s"},{"id":"c","text":"3 s"},{"id":"d","text":"5 s"}], "c"),
        ],
        "projectile_motion": [
            ("In projectile motion, which component remains constant?",
             [{"id":"a","text":"Vertical velocity"},{"id":"b","text":"Horizontal velocity"},{"id":"c","text":"Both"},{"id":"d","text":"Neither"}], "b"),
            ("At maximum height, vertical velocity equals?",
             [{"id":"a","text":"Maximum"},{"id":"b","text":"Half the initial"},{"id":"c","text":"0"},{"id":"d","text":"Negative of initial"}], "c"),
            ("Range = Vx × T. If Vx = 20 m/s and T = 3 s, range = ?",
             [{"id":"a","text":"23 m"},{"id":"b","text":"60 m"},{"id":"c","text":"40 m"},{"id":"d","text":"6 m"}], "b"),
            ("Maximum height depends on which component?",
             [{"id":"a","text":"Horizontal velocity (Vx)"},{"id":"b","text":"Vertical velocity (Vy)"},{"id":"c","text":"Both equally"},{"id":"d","text":"Launch angle only"}], "b"),
            ("Horizontal and vertical motions in projectile motion are ___.",
             [{"id":"a","text":"Dependent on each other"},{"id":"b","text":"Independent"},{"id":"c","text":"Equal in magnitude"},{"id":"d","text":"Always equal in time"}], "b"),
        ],
        "newtons_laws": [
            ("Newton's First Law states that a body at rest remains at rest unless acted on by ___.",
             [{"id":"a","text":"a balanced force"},{"id":"b","text":"an unbalanced (net) force"},{"id":"c","text":"gravity"},{"id":"d","text":"friction"}], "b"),
            ("F = ma. If F = 30 N and a = 5 m/s², what is m?",
             [{"id":"a","text":"150 kg"},{"id":"b","text":"25 kg"},{"id":"c","text":"6 kg"},{"id":"d","text":"35 kg"}], "c"),
            ("A 10 kg block accelerates at 3 m/s². Net force = ?",
             [{"id":"a","text":"10 N"},{"id":"b","text":"13 N"},{"id":"c","text":"30 N"},{"id":"d","text":"3 N"}], "c"),
            ("Newton's Third Law: every action has an equal and ___.",
             [{"id":"a","text":"larger reaction"},{"id":"b","text":"smaller reaction"},{"id":"c","text":"opposite reaction"},{"id":"d","text":"parallel reaction"}], "c"),
            ("If net force = 0, what happens to velocity?",
             [{"id":"a","text":"Increases steadily"},{"id":"b","text":"Decreases to zero"},{"id":"c","text":"Stays constant"},{"id":"d","text":"Reverses direction"}], "c"),
        ],
        "work_energy_power": [
            ("Work = F × d × cos θ. If θ = 90°, work = ?",
             [{"id":"a","text":"F × d"},{"id":"b","text":"F / d"},{"id":"c","text":"0"},{"id":"d","text":"2F × d"}], "c"),
            ("KE of a 2 kg ball moving at 5 m/s = ?",
             [{"id":"a","text":"10 J"},{"id":"b","text":"25 J"},{"id":"c","text":"50 J"},{"id":"d","text":"5 J"}], "b"),
            ("PE = mgh for m = 3 kg, g = 10 m/s², h = 10 m = ?",
             [{"id":"a","text":"30 J"},{"id":"b","text":"3 J"},{"id":"c","text":"300 J"},{"id":"d","text":"30 W"}], "c"),
            ("Power = Work / Time. If W = 500 J, t = 10 s, P = ?",
             [{"id":"a","text":"5000 W"},{"id":"b","text":"50 W"},{"id":"c","text":"5 W"},{"id":"d","text":"510 W"}], "b"),
            ("Total mechanical energy is conserved when ___.",
             [{"id":"a","text":"friction is present"},{"id":"b","text":"no friction or other losses"},{"id":"c","text":"only KE exists"},{"id":"d","text":"object is at rest"}], "b"),
        ],
        "gravitation": [
            ("Gravitational force F = ?",
             [{"id":"a","text":"Gm₁m₂ / r"},{"id":"b","text":"Gm₁m₂ / r²"},{"id":"c","text":"Gm₁ / r²"},{"id":"d","text":"m₁m₂ / r²"}], "b"),
            ("If distance between masses doubles, force becomes?",
             [{"id":"a","text":"Double"},{"id":"b","text":"Half"},{"id":"c","text":"One quarter"},{"id":"d","text":"Four times"}], "c"),
            ("Acceleration due to gravity on Earth ≈ ?",
             [{"id":"a","text":"9.8 m/s²"},{"id":"b","text":"10 m/s"},{"id":"c","text":"6.67 × 10⁻¹¹ m/s²"},{"id":"d","text":"1.6 m/s²"}], "a"),
            ("Weight = ?",
             [{"id":"a","text":"mass / g"},{"id":"b","text":"mass × g"},{"id":"c","text":"mass + g"},{"id":"d","text":"g / mass"}], "b"),
            ("Escape velocity from Earth depends on?",
             [{"id":"a","text":"Mass of planet only"},{"id":"b","text":"Radius only"},{"id":"c","text":"Both mass and radius"},{"id":"d","text":"Neither"}], "c"),
        ],
        "simple_harmonic_motion": [
            ("In SHM, acceleration is directly proportional to?",
             [{"id":"a","text":"Velocity"},{"id":"b","text":"Time"},{"id":"c","text":"Displacement from mean"},{"id":"d","text":"Square of displacement"}], "c"),
            ("At the mean position, velocity of SHM is?",
             [{"id":"a","text":"Zero"},{"id":"b","text":"Minimum"},{"id":"c","text":"Maximum"},{"id":"d","text":"Constant but not maximum"}], "c"),
            ("At extreme position, acceleration is?",
             [{"id":"a","text":"Zero"},{"id":"b","text":"Minimum"},{"id":"c","text":"Equal to gravity"},{"id":"d","text":"Maximum"}], "d"),
            ("Period of simple pendulum T = 2π√(L/g). If L doubles, T becomes?",
             [{"id":"a","text":"Doubles"},{"id":"b","text":"√2 times larger"},{"id":"c","text":"Halves"},{"id":"d","text":"Stays same"}], "b"),
            ("Frequency and period are?",
             [{"id":"a","text":"Equal"},{"id":"b","text":"Inversely proportional"},{"id":"c","text":"Both in Hertz"},{"id":"d","text":"Both in seconds"}], "b"),
        ],
        "wave_motion": [
            ("v = fλ. If f = 500 Hz and λ = 0.66 m, v ≈ ?",
             [{"id":"a","text":"330 m/s"},{"id":"b","text":"500 m/s"},{"id":"c","text":"660 m/s"},{"id":"d","text":"0.66 m/s"}], "a"),
            ("Particles vibrate perpendicular to direction of travel in?",
             [{"id":"a","text":"Longitudinal waves"},{"id":"b","text":"Sound waves"},{"id":"c","text":"Transverse waves"},{"id":"d","text":"All waves"}], "c"),
            ("Sound waves are?",
             [{"id":"a","text":"Transverse"},{"id":"b","text":"Longitudinal"},{"id":"c","text":"Electromagnetic"},{"id":"d","text":"Neither"}], "b"),
            ("Speed constant, wavelength doubles → frequency?",
             [{"id":"a","text":"Doubles"},{"id":"b","text":"Stays same"},{"id":"c","text":"Halves"},{"id":"d","text":"Quadruples"}], "c"),
            ("SI unit of frequency?",
             [{"id":"a","text":"m/s"},{"id":"b","text":"m"},{"id":"c","text":"s"},{"id":"d","text":"Hz"}], "d"),
        ],
        "current_electricity": [
            ("Ohm's law: V = ?",
             [{"id":"a","text":"I / R"},{"id":"b","text":"I × R"},{"id":"c","text":"I + R"},{"id":"d","text":"I²R"}], "b"),
            ("Three 6 Ω resistors in series. Total R = ?",
             [{"id":"a","text":"2 Ω"},{"id":"b","text":"6 Ω"},{"id":"c","text":"18 Ω"},{"id":"d","text":"3 Ω"}], "c"),
            ("Three 6 Ω resistors in parallel. Total R = ?",
             [{"id":"a","text":"18 Ω"},{"id":"b","text":"6 Ω"},{"id":"c","text":"3 Ω"},{"id":"d","text":"2 Ω"}], "d"),
            ("P = V × I. If V = 12 V and I = 3 A, P = ?",
             [{"id":"a","text":"4 W"},{"id":"b","text":"15 W"},{"id":"c","text":"36 W"},{"id":"d","text":"9 W"}], "c"),
            ("In metals, which particles carry current?",
             [{"id":"a","text":"Protons"},{"id":"b","text":"Neutrons"},{"id":"c","text":"Positive ions"},{"id":"d","text":"Electrons"}], "d"),
        ],
        "magnetic_fields": [
            ("Force on a moving charge in B field: F = ?",
             [{"id":"a","text":"qvB"},{"id":"b","text":"qvB sinθ"},{"id":"c","text":"qB / v"},{"id":"d","text":"qv + B"}], "b"),
            ("Force on a current-carrying wire in B field: F = ?",
             [{"id":"a","text":"BIL sinθ"},{"id":"b","text":"BIL / sinθ"},{"id":"c","text":"BI / L"},{"id":"d","text":"BL sinθ"}], "a"),
            ("If charge moves parallel to B, force = ?",
             [{"id":"a","text":"F = qvB"},{"id":"b","text":"F = qvB/2"},{"id":"c","text":"F = 0"},{"id":"d","text":"F = BIL"}], "c"),
            ("SI unit of magnetic field strength is?",
             [{"id":"a","text":"Weber"},{"id":"b","text":"Gauss"},{"id":"c","text":"Ampere"},{"id":"d","text":"Tesla"}], "d"),
            ("A current-carrying conductor placed in a magnetic field experiences a ___.",
             [{"id":"a","text":"Voltage"},{"id":"b","text":"Force"},{"id":"c","text":"Resistance"},{"id":"d","text":"Temperature rise only"}], "b"),
        ],
    }

    for slug, questions in diagnostic_bank.items():
        cid = concept_id_map.get(slug)
        if cid is None:
            continue
        for i, (q_text, choices, correct_id) in enumerate(questions):
            import json as _j
            dq = DiagnosticQuestion(
                concept_id=cid,
                question_text=q_text,
                expected_answer=correct_id,
                choices_json=_j.dumps(choices),
                source="manual",
                difficulty=min(i + 1, 5),
            )
            db.session.add(dq)
            count += 1

    db.session.commit()
    print(f"   ✓ {count} diagnostic questions seeded.\n")


# ===================================================================
# 5. Seed Simulations
# ===================================================================
def seed_simulations():
    """Seed one simulation row per supported simulation type."""
    print("── Seeding simulations …")

    SIMULATIONS = [
        {
            "concept_slug": "vector_decomposition",
            "simulation_type": "vector_decomposition",
            "title": "Vector Decomposition Simulator",
            "description": (
                "Drag the horizontal (Vx) and vertical (Vy) component arrows "
                "to match the given velocity vector. Builds intuition for SOH-CAH-TOA "
                "applied to 2D motion."
            ),
            "configuration": {
                "default_velocity": 25,
                "default_angle": 35,
                "tolerance_percent": 10,
            },
        },
        {
            "concept_slug": "trigonometry",
            "simulation_type": "function_graphing",
            "title": "Trigonometric Function Grapher",
            "description": (
                "Plot sin, cos, and tan functions and explore how amplitude, "
                "period, and phase shift affect the graph. Visualise SOH-CAH-TOA "
                "on the unit circle."
            ),
            "configuration": {
                "functions": ["sin", "cos", "tan"],
                "x_range": [-360, 360],
                "default_function": "sin",
            },
        },
        {
            "concept_slug": "area_under_curves",
            "simulation_type": "function_graphing",
            "title": "Area Under Curves Explorer",
            "description": (
                "Visualise definite integrals by shading the region between "
                "a curve and the x-axis. Adjust bounds and observe how the "
                "signed area changes."
            ),
            "configuration": {
                "functions": ["x^2", "x^3", "sin(x)", "cos(x)"],
                "default_fn": "x^2",
                "a": 0,
                "b": 1,
            },
        },
        {
            "concept_slug": "electrophilic_addition",
            "simulation_type": "molecular_structure",
            "title": "Electrophilic Addition Visualiser",
            "description": (
                "Build HBr addition to propene step-by-step. Identify the "
                "nucleophilic π bond, the electrophile, and apply Markovnikov's "
                "rule to predict the major product."
            ),
            "configuration": {
                "molecule": "propene",
                "reagent": "HBr",
                "expected_product": "2-bromopropane",
            },
        },
    ]

    count = 0
    for entry in SIMULATIONS:
        slug = entry["concept_slug"]
        cid = concept_id_map.get(slug)
        if cid is None:
            print(f"   ⚠ Concept slug '{slug}' not in concept_id_map — skipping simulation.")
            continue

        sim = Simulation(
            concept_id=cid,
            simulation_type=entry["simulation_type"],
            title=entry["title"],
            description=entry["description"],
            configuration=entry["configuration"],
        )
        db.session.add(sim)
        count += 1
        print(f"   + Simulation [{entry['simulation_type']}] → {entry['title']}")

    db.session.commit()
    print(f"   ✓ {count} simulations seeded.\n")


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
        seed_simulations()

        print("═" * 50)
        print("✅ Database seeded successfully!")
        print(f"   DB path: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print("═" * 50)


if __name__ == "__main__":
    main()
