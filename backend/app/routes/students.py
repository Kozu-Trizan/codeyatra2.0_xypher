from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.student import Student
from app.utils.response import error_response, success_response
from app.models import db

student_bp = Blueprint("students", __name__)

@student_bp.get("/about-me")
@jwt_required()
def handle_about_me():
    student_id = int(get_jwt_identity())
    student = Student.query.get(student_id)
    if student is None:
        return error_response("NOT_FOUND", "Student not found.", {}, 404)
    return success_response({"student": student.to_dict()})

@student_bp.post("/edit-me")
@jwt_required()
def edit_about_me():
    student_id = int(get_jwt_identity())
    student = Student.query.get(student_id)
    if student is None:
        return error_response("NOT_FOUND", "Student not found.", {}, 404)
    data = request.get_json()
    if 'name' in data:
        student.name = data['name']
    if 'email' in data:
        student.email = data['email']
    try:
        db.session.commit()
        return success_response({
            "student": student.to_dict(),
            "message": "Profile updated successfully"
        })
    except Exception as e:
        db.session.rollback()
        return error_response("UPDATE_FAILED", str(e), {}, 500)
