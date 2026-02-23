"""
Simulation validation services.

Each simulation type has its own validator that checks student answers
and returns structured feedback with partial credit.
"""

import math
from typing import Dict, Any


class SimulationValidator:
    """Route to the appropriate validator based on simulation type."""

    VALIDATORS = {}  # populated at bottom of module

    @classmethod
    def validate(cls, simulation_type: str, student_answer: Dict, **kwargs) -> Dict:
        validator_cls = cls.VALIDATORS.get(simulation_type)
        if not validator_cls:
            return {"correct": False, "error": f"Unknown simulation type: {simulation_type}"}
        return validator_cls.validate(student_answer, **kwargs)


# ---------------------------------------------------------------------------
# Vector Decomposition
# ---------------------------------------------------------------------------

class VectorDecompositionValidator:
    TOLERANCE = 0.05  # 5 %

    @staticmethod
    def validate(student_answer: Dict, **_kwargs) -> Dict:
        v = student_answer["velocity"]
        theta = math.radians(student_answer["angle"])
        s_vx = student_answer["student_vx"]
        s_vy = student_answer["student_vy"]

        correct_vx = v * math.cos(theta)
        correct_vy = v * math.sin(theta)

        vx_err = abs(s_vx - correct_vx) / correct_vx if correct_vx else 0
        vy_err = abs(s_vy - correct_vy) / correct_vy if correct_vy else 0

        tol = VectorDecompositionValidator.TOLERANCE

        if vx_err < tol and vy_err < tol:
            return {
                "correct": True,
                "error_type": None,
                "feedback": "Perfect! You correctly decomposed the vector.",
                "partial_credit": 1.0,
            }

        # Common mistake: sin/cos swapped
        vx_with_sin = v * math.sin(theta)
        vy_with_cos = v * math.cos(theta)
        if abs(s_vx - vx_with_sin) < 1 and abs(s_vy - vy_with_cos) < 1:
            return {
                "correct": False,
                "error_type": "TRIG_FUNCTION_SWAP",
                "feedback": (
                    "You swapped sin and cos. "
                    "Horizontal uses cos(\u03b8), vertical uses sin(\u03b8)."
                ),
                "partial_credit": 0.2,
            }

        parts = []
        if vx_err >= tol:
            direction = "too large" if s_vx > correct_vx else "too small"
            parts.append(f"Horizontal component is {direction}.")
        if vy_err >= tol:
            direction = "too large" if s_vy > correct_vy else "too small"
            parts.append(f"Vertical component is {direction}.")

        vx_score = 1.0 - min(vx_err / 0.5, 1.0)
        vy_score = 1.0 - min(vy_err / 0.5, 1.0)

        return {
            "correct": False,
            "error_type": "MAGNITUDE_ERROR",
            "feedback": " ".join(parts) + " Try adjusting your vectors.",
            "partial_credit": round((vx_score + vy_score) / 2, 3),
        }


# ---------------------------------------------------------------------------
# Function Graphing
# ---------------------------------------------------------------------------

class FunctionGraphingValidator:
    @staticmethod
    def validate(student_answer: Dict, **_kwargs) -> Dict:
        params = student_answer.get("parameters", {})
        tasks = student_answer.get("tasks", [])  # list[dict] with 'id' & 'instruction'

        # Evaluate tasks
        task_checks = {
            "open_downward": lambda p: p.get("a", 1) < 0,
            "shift_up_5": lambda p: abs(p.get("c", 0) - 5) < 0.5,
            "wider": lambda p: 0 < abs(p.get("a", 1)) < 1,
        }

        completed = 0
        total = len(tasks) or 1
        for t in tasks:
            checker = task_checks.get(t.get("id"))
            if checker and checker(params):
                completed += 1

        return {
            "correct": completed == total,
            "tasks_completed": completed,
            "tasks_total": total,
            "feedback": (
                "All tasks completed!"
                if completed == total
                else f"{completed}/{total} tasks completed."
            ),
            "partial_credit": round(completed / total, 3),
        }


# ---------------------------------------------------------------------------
# Molecular Structure
# ---------------------------------------------------------------------------

class MolecularStructureValidator:
    @staticmethod
    def validate(student_answer: Dict, **_kwargs) -> Dict:
        answers = student_answer.get("answers", {})
        questions = student_answer.get("questions", [])

        correct_count = 0
        feedback: Dict[str, bool] = {}

        for q in questions:
            qid = q["id"]
            student = answers.get(qid)
            correct = q["correctAnswer"]

            if q.get("type") == "numeric":
                is_ok = (
                    student is not None
                    and abs(float(student) - float(correct)) <= 2
                )
            else:
                is_ok = (
                    student is not None
                    and str(student).lower() == str(correct).lower()
                )

            feedback[qid] = is_ok
            if is_ok:
                correct_count += 1

        total = len(questions) or 1
        return {
            "correct": correct_count == total,
            "questions_correct": correct_count,
            "questions_total": total,
            "feedback": feedback,
            "partial_credit": round(correct_count / total, 3),
        }


# ---------------------------------------------------------------------------
# Register validators
# ---------------------------------------------------------------------------

SimulationValidator.VALIDATORS = {
    "vector_decomposition": VectorDecompositionValidator,
    "function_graphing": FunctionGraphingValidator,
    "molecular_structure": MolecularStructureValidator,
}
