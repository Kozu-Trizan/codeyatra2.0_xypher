"""
SikshyaMap AI - Flask Application Factory.

Creates and configures the Flask application with all extensions,
blueprints, and database setup.
"""

from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config, DevelopmentConfig, config as config_map

from app.models import db


jwt = JWTManager()


def create_app(config_name=None):
    """Application factory - creates and returns a fully configured Flask app."""

    app = Flask(__name__)

    # Support both string names and config class objects
    if config_name is None:
        cfg = DevelopmentConfig
    elif isinstance(config_name, str):
        cfg = config_map.get(config_name, DevelopmentConfig)
    else:
        cfg = config_name

    app.config.from_object(cfg)
    app.url_map.strict_slashes = False

    # --- extensions ---
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    from app.routes.auth import auth_bp
    from app.routes.concepts import concepts_bp
    from app.routes.problems import problems_bp
    from app.routes.sessions import sessions_bp
    from app.routes.resources import resources_bp
    from app.routes.diagnose import diagnose_bp
    from app.routes.progress import progress_bp
    from app.routes.simulations import simulations_bp
    from app.routes.students import student_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(concepts_bp, url_prefix="/api/concepts")
    app.register_blueprint(problems_bp, url_prefix="/api/problems")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(resources_bp, url_prefix="/api/resources")
    app.register_blueprint(diagnose_bp, url_prefix="/api/diagnose")
    app.register_blueprint(progress_bp, url_prefix="/api/progress")
    app.register_blueprint(simulations_bp, url_prefix="/api/simulations")
    app.register_blueprint(student_bp, url_prefix="/api/students")

    with app.app_context():
        db.create_all()

    return app
