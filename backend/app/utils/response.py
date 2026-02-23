"""
Standardised API response helpers.

Every endpoint should use these to maintain consistent response shape:
  { success: bool, data: {...}, meta: {...} }
  { success: bool, error: {...}, meta: {...} }
"""

from datetime import datetime, timezone
import uuid

from flask import jsonify

def success_response(data, status_code=200, meta=None):
    """Return a standardised success JSON response."""
    envelope = {
        "success": True,
        "data": data,
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": str(uuid.uuid4()),
            **(meta or {}),
        },
    }
    return jsonify(envelope), status_code


def error_response(code, message, details=None, status_code=400):
    """Return a standardised error JSON response."""
    envelope = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": str(uuid.uuid4()),
        },
    }
    return jsonify(envelope), status_code
