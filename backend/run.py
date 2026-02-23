#!/usr/bin/env python

from flask import Flask
from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    app.run(port=int(os.getenv('PORT', 5000)))
