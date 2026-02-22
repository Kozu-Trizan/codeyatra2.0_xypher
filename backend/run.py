#!/usr/bin/env python
"""
SikshyaMap AI — Development server entry point.

Usage:
    python run.py
"""

import os
from app import create_app

env = os.getenv("FLASK_ENV", "development")
app = create_app(env)

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=app.config.get("DEBUG", True),
    )
