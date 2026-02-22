#!/usr/bin/env python

from flask import Flask
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)

if __name__ == '__main__':
    app.run(port=int(os.getenv('PORT', 5000)))