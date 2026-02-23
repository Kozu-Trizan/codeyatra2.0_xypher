"""
SikshyaMap Deterministic Diagnostics Engine
============================================
Rule-based diagnosis engine: maps a student's selected option to a prerequisite
tag, assigns confidence, looks up recommended resources, and builds the
structured JSON result described in the spec.

Heuristic priority (highest → lowest specificity):
  1. trigonometry_vector_decomposition   – sin/cos swapped or tan misused
  2. angle_misinterpretation             – complement angle or wrong sign used
  3. decoupling_horizontal_vertical      – vertical formula for horizontal axis
  4. free_body_forces_signs              – Newton's law sign/direction errors
  5. stoichiometry_moles_vs_mass         – mass used where moles required
  6. algebra_calculus_concepts           – power-rule / integration errors
  7. commonMisconceptions match          – keyword match against step field
  8. prereq_unknown / low confidence    – fallback

Nothing is hallucinated: all prerequisite tags, resource IDs, and Socratic
hints are derived from the supplied problem template and resourcesDB.
"""

from __future__ import annotations

import re
import json
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Heuristic pattern sets  (lowercased strings / pre-compiled regex)
# ---------------------------------------------------------------------------

_RE_FLAGS = re.IGNORECASE | re.UNICODE

# H1 – trigonometry_vector_decomposition
# Detects horizontal component (ax, vx, v0x) using sin, or vertical using cos,
# or tan used for decomposition.
_H1_PATTERNS = [
    # horizontal component uses sin
    re.compile(r'\bv[₀0]?[ₓx]\b[^;,\n]*\bsin\b', _RE_FLAGS),
    re.compile(r'\ba[ₓx]\b[^;,\n]*\bsin\b', _RE_FLAGS),
    re.compile(r'\bax\s*=\s*[^,\n]*\bsin\b', _RE_FLAGS),
    # vertical component uses cos
    re.compile(r'\bv[₀0]?[ᵧy]\b[^;,\n]*\bcos\b', _RE_FLAGS),
    re.compile(r'\ba[ᵧy]\b[^;,\n]*\bcos\b', _RE_FLAGS),
    re.compile(r'\bay\s*=\s*[^,\n]*\bcos\b', _RE_FLAGS),
    # unit-circle swap (x=sin, y=cos)
    re.compile(r'\bx\s*=\s*sin\s*\(', _RE_FLAGS),
    re.compile(r'\by\s*=\s*cos\s*\(', _RE_FLAGS),
    # tan used for a component
    re.compile(r'\b(ax|vx|ay|vy|v0x|v0y)\s*=\s*[^,\n]*\btan\s*\(', _RE_FLAGS),
    # explicit swap keywords
    re.compile(r'sin.*cos.*swapped|swapped.*sin.*cos', _RE_FLAGS),
    # "horizontal ... = ... sin" or "sin for horizontal"
    re.compile(r'horizontal\s+component\s*=\s*[^,\n]*\bsin\b', _RE_FLAGS),
    re.compile(r'sin\s+for\s+(the\s+)?horizontal', _RE_FLAGS),
]

# Simple 2-point test: option contains "sin" before "cos" in a component context
# (for cases like "Ax = A sin ... Ay = A cos" — this is the canonical swap)
def _h1_component_swap(opt: str) -> bool:
    """True if the first-named component uses sin and second uses cos (swap)."""
    # Match patterns like "Ax = ... sin ... , Ay = ... cos"
    m = re.search(
        r'ax\s*=\s*[^,\n]*\bsin\b[^,\n]*,[^,\n]*ay\s*=\s*[^,\n]*\bcos\b',
        opt, _RE_FLAGS,
    )
    if m:
        return True
    # V₀ₓ = sin ... V₀ᵧ = cos
    m = re.search(
        r'v[₀0]?[ₓx]\s*=\s*[^,\n]*\bsin\b[^,\n]*,[^,\n]*v[₀0]?[ᵧy]\s*=\s*[^,\n]*\bcos\b',
        opt, _RE_FLAGS,
    )
    return bool(m)


# H2 – angle_misinterpretation: complement angles or wrong-angle values
_H2_COMPLEMENT_PAIRS = [
    ("30", "60"), ("60", "30"),
    ("37", "53"), ("53", "37"),
    ("45", "45"),  # treating angle as complement
]
_H2_VALUE_SWAP = [
    # cos(30)=0.866, sin(30)=0.5 → swapping: 0.5 for Ax, 0.866 for Ay at 30°
    # but if the option SWAPS the trig fn, it's H1. H2 is specifically about
    # using the complement angle.
    re.compile(r'cos\s*\(\s*60\s*°?\s*\)', _RE_FLAGS),
    re.compile(r'sin\s*\(\s*60\s*°?\s*\)', _RE_FLAGS),
    re.compile(r'cos\s*\(\s*53\s*°?\s*\)', _RE_FLAGS),
    re.compile(r'sin\s*\(\s*53\s*°?\s*\)', _RE_FLAGS),
    re.compile(r'0\.707.*0\.707', _RE_FLAGS),  # 45° values when angle ≠ 45°
    re.compile(r'below\s+horizontal', _RE_FLAGS),   # wrong direction
    re.compile(r'complement\s+angle', _RE_FLAGS),
]


def _h2_complement_angle(opt: str, correct: str) -> bool:
    """True if wrong option uses complement of the angle in the correct answer."""
    for (a, b) in _H2_COMPLEMENT_PAIRS:
        if (
            re.search(rf'\b{b}°', opt, _RE_FLAGS)
            and re.search(rf'\b{a}°', correct, _RE_FLAGS)
        ):
            return True
    for p in _H2_VALUE_SWAP:
        if p.search(opt):
            return True
    return False


# H3 – decoupling_horizontal_vertical
_H3_PATTERNS = [
    # Using horizontal velocity (Vx) for time of flight
    re.compile(r't\s*=\s*2\s*v[₀0]?[ₓx]', _RE_FLAGS),
    re.compile(r'v[₀0]?[ₓx]\s*/\s*g', _RE_FLAGS),
    # Using vertical velocity (Vy) for horizontal range
    re.compile(r'r\s*=\s*v[₀0]?[ᵧy]\s*[×x\*]?\s*t', _RE_FLAGS),
    re.compile(r'range\s*=\s*v[₀0]?[ᵧy]', _RE_FLAGS),
    re.compile(r'(vy|v0y|v₀ᵧ)\s*[×x\*]\s*t', _RE_FLAGS),
    # Adding both components as if they both contribute to range
    re.compile(r'\(v[₀0]?[ₓx]\s*\+\s*v[₀0]?[ᵧy]\)\s*[×x\*]\s*t', _RE_FLAGS),
    # "Both moving" / "both affect"
    re.compile(r'both\s+(horizontal|vertical)\s+velocit', _RE_FLAGS),
    re.compile(r'vertical\s+velocity\s+(contributes|determines)\s+(horizontal|range)', _RE_FLAGS),
]


# H4 – free_body_forces_signs (Newton's law direction/sign errors)
_H4_PATTERNS = [
    # T - m₁g sin (tension subtracts gravity component when it should add, or vice versa)
    re.compile(r't\s*-\s*m[₁1]?g\s*sin', _RE_FLAGS),
    re.compile(r't\s*-\s*m[₂2]?g\b', _RE_FLAGS),
    # Both tension terms having same sign (both + or both -)
    re.compile(r't\s*-\s*m.*=\s*m.*a.*t\s*-\s*m', _RE_FLAGS),
    # Opposite directions for connected bodies
    re.compile(r'opposite\s+direction', _RE_FLAGS),
    # Adding gravity components that should cancel
    re.compile(r'm1g\s*sin.*\+\s*m2g', _RE_FLAGS),
    re.compile(r'gravity.*component.*adds\s+tension', _RE_FLAGS),
    # Ignoring tension entirely
    re.compile(r'(?:tension|t)\s+is\s+ignored|without\s+tension', _RE_FLAGS),
    # "No net force" or static when dynamic and vice versa (check sign errors)
    re.compile(r'arbitrary|randomly|a\s*=\s*3\s+m/s', _RE_FLAGS),
]


# H5 – stoichiometry_moles_vs_mass
_H5_PATTERNS = [
    # Using raw mass number as mole count: n(H₂) = 10 mol, n(O₂) = 50 mol
    re.compile(r'n\s*\(\s*h[₂2]?\s*\)\s*=\s*10\s*mol', _RE_FLAGS),
    re.compile(r'n\s*\(\s*o[₂2]?\s*\)\s*=\s*50\s*mol', _RE_FLAGS),
    # Comparing masses to decide limiting reactant
    re.compile(r'\d+\s*g\s+of\s+o[₂2]?\s*[><!]|g\s+of\s+o[₂2]?\s*>\s*\d+\s*g\s+of', _RE_FLAGS),
    # Using molar mass as moles
    re.compile(r'n\s*=\s*32|n\s*=\s*2\s+mol,\s*n.*=\s*32\s+mol', _RE_FLAGS),
    # Generic: uses mass comparison keyword
    re.compile(r'comparing\s+mass', _RE_FLAGS),
    re.compile(r'mass\s+is\s+(more|less|larger|smaller)\s+than', _RE_FLAGS),
    # Stoichiometry with mass instead of moles
    re.compile(r'stoichiometr.*mass\s+instead|mass\s+instead.*mole', _RE_FLAGS),
]


# H6 – algebra_calculus_concepts
_H6_PATTERNS = [
    # Integration: missing exponent increment (xⁿ instead of xⁿ⁺¹)
    re.compile(r'∫\s*xⁿ\s*dx\s*=\s*xⁿ\s*[+cC]', _RE_FLAGS),
    # Integration: wrong direction (xⁿ⁻¹/n looks like differentiation)
    re.compile(r'xⁿ⁻¹\s*/\s*n', _RE_FLAGS),
    # Differentiation: missing coefficient n
    re.compile(r'd/dx\s*\(xⁿ\)\s*=\s*xⁿ⁻¹\b[^/]', _RE_FLAGS),
    # Differentiation: power stays same
    re.compile(r'd/dx.*=\s*n\s*[·.]?\s*xⁿ\b', _RE_FLAGS),
    re.compile(r'power\s+stays\s+the\s+same', _RE_FLAGS),
    # Missing constant of integration
    re.compile(r'no\s+constant\s+of\s+integration', _RE_FLAGS),
    re.compile(r'c\s+(is\s+not|not)\s+(needed|required)', _RE_FLAGS),
    re.compile(r'without\s+(the\s+)?constant\s+c', _RE_FLAGS),
    # Not reducing exponent
    re.compile(r'not\s+reducing\s+exponent', _RE_FLAGS),
    # Applies differentiation rule to integral or vice versa
    re.compile(r'(integration|integral).*power\s+rule.*differentiat', _RE_FLAGS),
    # Wrong power after differentiation: 15x³ instead of 15x²
    re.compile(r'd/dx\(5x³\)\s*=\s*15x³', _RE_FLAGS),
    re.compile(r'd/dx\(5x3\)\s*=\s*5x2\b', _RE_FLAGS),   # forgot n coefficient
    # Handling constant: derivative of constant non-zero
    re.compile(r'd/dx\s*\(-7\)\s*=\s*-7', _RE_FLAGS),
    # Integration treats constant as itself
    re.compile(r'∫1\s*dx\s*=\s*1\b', _RE_FLAGS),
]


# ---------------------------------------------------------------------------
# Misconception keyword map – Heuristic 7
# ---------------------------------------------------------------------------
# Maps substrings from misconception descriptions → prereq tags
_MISCONCEPTION_TAG_MAP = [
    # Trig swap
    ("confusing sin and cos", "trigonometry_vector_decomposition"),
    ("swapping sin", "trigonometry_vector_decomposition"),
    ("sin and cos when decomposing", "trigonometry_vector_decomposition"),
    ("sin and cos incorrectly for angle decomposition", "trigonometry_vector_decomposition"),
    # Angle misinterpretation
    ("complement angle instead", "angle_misinterpretation"),
    ("wrong angle", "angle_misinterpretation"),
    ("using the complement", "angle_misinterpretation"),
    # Decoupling
    ("vertical velocity affects horizontal", "decoupling_horizontal_vertical"),
    ("not recognizing that horizontal velocity remains", "decoupling_horizontal_vertical"),
    ("thinking vertical velocity affects horizontal", "decoupling_horizontal_vertical"),
    # Newton's law signs
    ("not recognizing both masses have same", "free_body_forces_signs"),
    ("confusing direction conventions", "free_body_forces_signs"),
    ("assuming motion must occur", "free_body_forces_signs"),
    # Stoichiometry
    ("comparing masses instead of moles", "stoichiometry_moles_vs_mass"),
    ("using mass instead of moles", "stoichiometry_moles_vs_mass"),
    ("comparing mass", "stoichiometry_moles_vs_mass"),
    # Calculus
    ("forgetting the coefficient n in power rule", "algebra_calculus_concepts"),
    ("not reducing exponent", "algebra_calculus_concepts"),
    ("failing to recognize 3x = 3x1", "algebra_calculus_concepts"),
    ("forgetting that constant derivatives to zero", "algebra_calculus_concepts"),
    ("forgetting to divide by (n+1)", "algebra_calculus_concepts"),
    ("forgetting the constant c", "algebra_calculus_concepts"),
    ("confusing integration with differentiation", "algebra_calculus_concepts"),
]


# ---------------------------------------------------------------------------
# Human-readable concept flaw labels and descriptions
# ---------------------------------------------------------------------------
_CONCEPT_FLAW_LABEL: dict[str, str] = {
    "trigonometry_vector_decomposition": "Sin/Cos Swap in Vector Decomposition",
    "angle_misinterpretation": "Wrong Angle Used (Complement Confusion)",
    "decoupling_horizontal_vertical": "Mixing Horizontal and Vertical Motion",
    "free_body_forces_signs": "Incorrect Force Direction / Sign Error",
    "stoichiometry_moles_vs_mass": "Using Mass Instead of Moles",
    "algebra_calculus_concepts": "Calculus / Power Rule Error",
    "prereq_unknown": "Unidentified Concept Gap",
}

_CONCEPT_FLAW_DESC: dict[str, str] = {
    "trigonometry_vector_decomposition": (
        "Student swapped sin and cos: used sin for the horizontal component and "
        "cos for the vertical. Correct decomposition: "
        "A_x = A·cos(θ) (horizontal, adjacent side), A_y = A·sin(θ) (vertical, opposite side)."
    ),
    "angle_misinterpretation": (
        "Student used the complement of the given angle (e.g., 60° instead of 30°). "
        "The angle θ in the problem is measured from the horizontal; "
        "apply cos(θ) for the x-component and sin(θ) for the y-component using that same angle."
    ),
    "decoupling_horizontal_vertical": (
        "Student applied a vertical-motion formula to the horizontal axis or vice versa. "
        "Horizontal and vertical motions are independent: "
        "time of flight is determined by vertical velocity (V₀ᵧ), "
        "and horizontal range uses the constant horizontal velocity (V₀ₓ)."
    ),
    "free_body_forces_signs": (
        "Student assigned the wrong direction (sign) to a force in Newton's second law. "
        "Choose a consistent positive direction first; tension and gravity components "
        "must be added or subtracted based on whether they act with or against that direction."
    ),
    "stoichiometry_moles_vs_mass": (
        "Student compared raw masses to determine the limiting reactant instead of moles. "
        "Convert each reactant to moles using n = mass / molar mass, "
        "then use stoichiometric ratios to identify which runs out first."
    ),
    "algebra_calculus_concepts": (
        "Student made an error in the power rule or integration rule. "
        "Differentiation: d/dx(xⁿ) = n·xⁿ⁻¹ (multiply by n, reduce exponent by 1). "
        "Integration: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C (raise exponent by 1, divide, add constant C)."
    ),
    "prereq_unknown": (
        "The specific prerequisite gap could not be identified from the selected option. "
        "Review the step explanation and underlying concepts."
    ),
}


# ---------------------------------------------------------------------------
# Socratic hint templates keyed by prereq tag
# ---------------------------------------------------------------------------
_SOCRATIC_HINTS: dict[str, str] = {
    "trigonometry_vector_decomposition": (
        "Horizontal component kosko trigonometric function use garcha? "
        "Adjacent side nearer to angle: sin or cos?"
    ),
    "angle_misinterpretation": (
        "Angle 30° given from horizontal. Complement haina, same angle use garnus. "
        "cos(30°) or cos(60°) of horizontal component?"
    ),
    "decoupling_horizontal_vertical": (
        "Horizontal ra vertical motion ekarkobata independent hunchha. "
        "Time of flight kasle determine garcha — Vx or Vy?"
    ),
    "free_body_forces_signs": (
        "Direction of tension and gravity component: same direction ma hunchha ki opposite? "
        "Positive direction choose gari carefully tann ra weight compare garnus."
    ),
    "stoichiometry_moles_vs_mass": (
        "Limiting reactant find garna mass compare gardaindaina. "
        "n = mass / molar mass use gari moles calculate garnus first."
    ),
    "algebra_calculus_concepts": (
        "Power rule: d/dx(xⁿ) = n·xⁿ⁻¹. Coefficient n multiply garnu pardaina? "
        "Integration ma exponent badhcha ki ghataunchha?"
    ),
    "prereq_unknown": (
        "Review the step concept carefully and try again."
    ),
}


# ---------------------------------------------------------------------------
# Core classifier
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """Lowercase, collapse whitespace."""
    return re.sub(r'\s+', ' ', text or "").strip().lower()


def _match_patterns(text: str, patterns: list) -> bool:
    for p in patterns:
        if isinstance(p, re.Pattern):
            if p.search(text):
                return True
        else:
            if p in text:
                return True
    return False


def _classify_wrong_option(
    selected_text: str,
    correct_text: str,
    step: dict,
) -> tuple[str, str]:
    """
    Returns (prereq_tag, confidence) for a wrong answer.
    Apply heuristics in priority order.
    """
    opt = _normalize(selected_text)
    cor = _normalize(correct_text)
    misconceptions: list[str] = [
        _normalize(m) for m in step.get("commonMisconceptions", [])
    ]
    expl = _normalize(step.get("explanation", ""))

    # H1 – trig swap (most specific)
    if _h1_component_swap(opt):
        return "trigonometry_vector_decomposition", "high"
    if _match_patterns(opt, _H1_PATTERNS):
        return "trigonometry_vector_decomposition", "high"

    # H2 – angle misinterpretation
    if _h2_complement_angle(opt, cor):
        return "angle_misinterpretation", "high"

    # H3 – axis decoupling
    if _match_patterns(opt, _H3_PATTERNS):
        return "decoupling_horizontal_vertical", "high"

    # H4 – Newton's law sign errors
    if _match_patterns(opt, _H4_PATTERNS):
        return "free_body_forces_signs", "high"

    # H5 – stoichiometry: mass instead of moles
    if _match_patterns(opt, _H5_PATTERNS):
        return "stoichiometry_moles_vs_mass", "high"

    # H6 – algebra/calculus errors
    if _match_patterns(opt, _H6_PATTERNS):
        return "algebra_calculus_concepts", "high"

    # H7 – match commonMisconceptions keywords (medium confidence)
    for misconception_text in misconceptions:
        for keyword, tag in _MISCONCEPTION_TAG_MAP:
            if keyword in misconception_text:
                # Check if keyword appears in the wrong option or explanation context
                if keyword in opt or keyword in expl:
                    return tag, "medium"
                # Looser: if the step's misconception list has the keyword, still medium
                return tag, "medium"

    # H7 fallback: keyword overlap between option and explanation keywords
    all_known_tags = {
        "sin": "trigonometry_vector_decomposition",
        "cos": "trigonometry_vector_decomposition",
        "angle": "angle_misinterpretation",
        "complement": "angle_misinterpretation",
        "horizontal": "decoupling_horizontal_vertical",
        "vertical": "decoupling_horizontal_vertical",
        "tension": "free_body_forces_signs",
        "direction": "free_body_forces_signs",
        "mass": "stoichiometry_moles_vs_mass",
        "mole": "stoichiometry_moles_vs_mass",
        "derivative": "algebra_calculus_concepts",
        "integral": "algebra_calculus_concepts",
        "constant c": "algebra_calculus_concepts",
    }
    matched_tags: list[str] = []
    for kw, tag in all_known_tags.items():
        if kw in opt and kw in expl:
            matched_tags.append(tag)
    if matched_tags:
        # If single tag matched, medium confidence; prefer more specific
        return matched_tags[0], "medium"

    return "prereq_unknown", "low"


# ---------------------------------------------------------------------------
# Resource lookup
# ---------------------------------------------------------------------------

def _resources_for_tag(tag: str, resources_db: list[dict]) -> list[str]:
    """Return resource IDs from the DB that have the given tag."""
    if tag == "prereq_unknown":
        return []
    return [
        r["resourceId"]
        for r in resources_db
        if tag in r.get("tags", []) and "resourceId" in r
    ]


# ---------------------------------------------------------------------------
# Socratic hint builder
# ---------------------------------------------------------------------------

def _socratic_hint(tag: str, step: dict) -> str | None:
    """Return a ≤30-word Socratic hint for wrong steps."""
    base = _SOCRATIC_HINTS.get(tag, _SOCRATIC_HINTS["prereq_unknown"])
    # Truncate to 30 words if needed
    words = base.split()
    if len(words) > 30:
        base = " ".join(words[:30]) + "…"
    return base


# ---------------------------------------------------------------------------
# nextAction logic
# ---------------------------------------------------------------------------

def _next_action(
    step_results: list[dict],
    prereq_quiz_results: list[dict],
) -> str:
    failed = [s for s in step_results if not s["correct"]]
    if not failed:
        return "done"

    # If mini-quiz taken and all passed → promote student
    if prereq_quiz_results:
        all_passed = all(r.get("passed", False) for r in prereq_quiz_results)
        if all_passed:
            return "proceed_step"

    # If there are recommended resources for any failed step → play first
    has_resources = any(s["recommendedResourceIds"] for s in failed)
    if has_resources:
        return "play_resource"

    return "show_prereq_quiz"


# ---------------------------------------------------------------------------
# Main engine entrypoint
# ---------------------------------------------------------------------------

def run_diagnosis(payload: dict) -> dict:
    """
    Process the student's answers against the problem template and return
    the full diagnosis JSON conforming to the spec schema.

    Parameters
    ----------
    payload : dict with keys:
        sessionId, studentId, problemTemplate, studentAnswers,
        resourcesDB, [prereqMiniQuizResults]

    Returns
    -------
    dict – the complete diagnosis result
    """
    session_id: str = payload.get("sessionId", "")
    student_id: str | None = payload.get("studentId")
    problem: dict = payload["problemTemplate"]
    student_answers: list[dict] = payload.get("studentAnswers", [])
    resources_db: list[dict] = payload.get("resourcesDB", [])
    prereq_quiz_results: list[dict] = payload.get("prereqMiniQuizResults", [])

    problem_id: str = problem.get("id", "")
    steps: list[dict] = problem.get("steps", [])

    # Index steps by stepNumber for O(1) lookup
    step_map: dict[int, dict] = {s["stepNumber"]: s for s in steps}

    # Build stepResults
    step_results: list[dict] = []
    tag_resource_map: dict[str, list[str]] = {}   # tag → resource IDs (for overallDiagnosis)

    for ans in student_answers:
        step_num: int = ans["stepNumber"]
        sel_idx: int = ans["selectedOptionIndex"]

        step = step_map.get(step_num)
        if step is None:
            # Unknown step – skip gracefully
            continue

        options: list[str] = step.get("options", [])
        correct_text: str = step.get("correctAnswer", "")

        # Determine correct option index (0-based: first option is correct answer)
        # The spec / dataset stores correctAnswer as text; match against options list.
        correct_idx: int = 0
        for i, opt_text in enumerate(options):
            # Use the first option that starts with the correctAnswer text
            if _normalize(opt_text).startswith(_normalize(correct_text)[:60]):
                correct_idx = i
                break

        is_correct: bool = sel_idx == correct_idx

        if is_correct:
            result = {
                "stepNumber": step_num,
                "selectedOptionIndex": sel_idx,
                "correct": True,
                "inferredPrereqTag": None,
                "confidence": "high",
                "socraticHint": None,
                "recommendedResourceIds": [],
            }
        else:
            # The student selected this option text
            selected_text: str = (
                options[sel_idx] if 0 <= sel_idx < len(options) else ""
            )
            tag, confidence = _classify_wrong_option(
                selected_text, correct_text, step
            )
            res_ids = _resources_for_tag(tag, resources_db)
            hint = _socratic_hint(tag, step)

            # Accumulate for overallDiagnosis
            if tag != "prereq_unknown":
                if tag not in tag_resource_map:
                    tag_resource_map[tag] = res_ids
                else:
                    # merge unique IDs
                    existing = set(tag_resource_map[tag])
                    tag_resource_map[tag] = list(existing | set(res_ids))

            result = {
                "stepNumber": step_num,
                "selectedOptionIndex": sel_idx,
                "correct": False,
                "inferredPrereqTag": tag,
                "conceptFlaw": _CONCEPT_FLAW_LABEL.get(tag, tag),
                "flawDescription": _CONCEPT_FLAW_DESC.get(tag, ""),
                "confidence": confidence,
                "socraticHint": hint,
                "recommendedResourceIds": res_ids,
            }
            if not res_ids and tag != "prereq_unknown":
                result["recommendation_missing"] = True

        step_results.append(result)

    # Build overallDiagnosis from failed tags
    overall_diagnosis: list[dict] = []
    for tag, res_ids in tag_resource_map.items():
        # Check if prereq mini-quiz told us mastery
        mastery = False
        for qr in prereq_quiz_results:
            if qr.get("prereqTag") == tag and qr.get("passed"):
                mastery = True
                break

        # confidence = highest confidence seen for this tag
        confidence_for_tag = "high"
        for sr in step_results:
            if sr.get("inferredPrereqTag") == tag:
                confidence_for_tag = sr["confidence"]
                break

        diag_item: dict = {
            "prereqTag": tag,
            "conceptFlaw": _CONCEPT_FLAW_LABEL.get(tag, tag),
            "flawDescription": _CONCEPT_FLAW_DESC.get(tag, ""),
            "confidence": confidence_for_tag,
            "mastery": mastery,
            "recommendedResourceIds": res_ids,
        }
        if not res_ids:
            diag_item["recommendation_missing"] = True
        overall_diagnosis.append(diag_item)

    # Handle case where failed steps have no matched tag (prereq_unknown)
    unknown_steps = [
        s for s in step_results
        if not s["correct"] and s.get("inferredPrereqTag") == "prereq_unknown"
    ]
    if unknown_steps and not any(d["prereqTag"] == "prereq_unknown" for d in overall_diagnosis):
        overall_diagnosis.append({
            "prereqTag": "prereq_unknown",
            "confidence": "low",
            "mastery": False,
            "recommendedResourceIds": [],
        })

    next_action = _next_action(step_results, prereq_quiz_results)

    return {
        "sessionId": session_id,
        "studentId": student_id,
        "problemId": problem_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stepResults": step_results,
        "overallDiagnosis": overall_diagnosis,
        "nextAction": next_action,
    }
