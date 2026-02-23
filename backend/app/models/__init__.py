from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from app.models.concept import Concept, ConceptPrerequisite
from app.models.problem import Problem, Step, StepOption, ErrorPattern
from app.models.student import Student, StudentProgress
from app.models.resource import Resource
from app.models.diagnostic import DiagnosticQuestion, DiagnosticSession, DiagnosticAnswer
