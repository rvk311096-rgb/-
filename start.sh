#!/bin/bash
set -e
cd /opt/app
pip install -r requirements.txt -q
uvicorn app.main:app --host 0.0.0.0 --port 3000
