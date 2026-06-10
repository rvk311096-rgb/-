import os
from datetime import date, timedelta
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
import logging

from bitrix_client import BitrixClient

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Daily Manager Report", version="1.0.0")

BASE_URL = os.getenv("BITRIX_BASE_URL", "https://vibecode.bitrix24.tech/v1")
API_KEY = os.getenv("BITRIX_API_KEY", "")

client = BitrixClient(base_url=BASE_URL, api_key=API_KEY)

templates = Jinja2Templates(directory="/app/templates")
app.mount("/static", StaticFiles(directory="/app/static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/stats")
async def get_stats(
    target_date: str = Query(default=None, description="Date in YYYY-MM-DD format, defaults to today"),
):
    if target_date is None:
        target_date = date.today().isoformat()
    try:
        parsed_date = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    if not API_KEY:
        raise HTTPException(status_code=500, detail="BITRIX_API_KEY not configured")

    try:
        stats = await client.get_daily_stats(parsed_date)
        return stats
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=502, detail=f"Bitrix24 API error: {str(e)}")


@app.get("/api/health")
async def health():
    return {"status": "ok", "base_url": BASE_URL}
