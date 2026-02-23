"""
Authentication routes — register / login / me.

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me          (JWT-protected)
"""

from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

from app.models import db, Student
from app.utils.response import success_response, error_response

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def handle_register():
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    errors = {}
    if not name:
        errors["name"] = "Name is required."
    if not email or "@" not in email:
        errors["email"] = "A valid email is required."
    if len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."
    if errors:
        return error_response("VALIDATION_ERROR", "Invalid input parameters.", errors, 400)
    if Student.query.filter_by(email=email).first():
        return error_response("CONFLICT", "Email already registered.", {"email": email}, 409)

    student = Student(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(student)
    db.session.commit()

    token = create_access_token(identity=str(student.id))

    return success_response({
            "student": student.to_dict(),
            "access_token": token,
        },
        status_code=201,
    )


@auth_bp.post("/login")
def handle_login():
    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return error_response("VALIDATION_ERROR", "Email and password are required.", {}, 400)

    student = Student.query.filter_by(email=email).first()
    if student is None or not check_password_hash(student.password_hash, password):
        return error_response("UNAUTHORIZED", "Invalid email or password.", {}, 401)

    token = create_access_token(identity=str(student.id))

    return success_response({
        "student": student.to_dict(),
        "access_token": token,
    })
