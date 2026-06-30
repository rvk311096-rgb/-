import os
from datetime import date
from fastapi import FastAPI, Query, HTTPException, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from dotenv import load_dotenv
import logging
from itsdangerous import URLSafeTimedSerializer, BadSignature

from app.bitrix_client import BitrixClient

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Daily Manager Report", version="1.0.0")

BASE_URL = os.getenv("BITRIX_BASE_URL", "https://vibecode.bitrix24.tech/v1")
API_KEY = os.getenv("BITRIX_API_KEY", "")
APP_PASSWORD = os.getenv("APP_PASSWORD", "admin")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
COOKIE_NAME = "session"
COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours

client = BitrixClient(base_url=BASE_URL, api_key=API_KEY)
signer = URLSafeTimedSerializer(SECRET_KEY)

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
templates = Jinja2Templates(directory=os.path.join(_BASE, "templates"))
_static_dir = os.path.join(_BASE, "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")


def _is_authenticated(request: Request) -> bool:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return False
    try:
        signer.loads(token, max_age=COOKIE_MAX_AGE)
        return True
    except BadSignature:
        return False


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html", {"error": ""})


@app.post("/login")
async def login(request: Request, password: str = Form(...)):
    if password == APP_PASSWORD:
        token = signer.dumps("authenticated")
        response = RedirectResponse(url="/", status_code=303)
        response.set_cookie(COOKIE_NAME, token, max_age=COOKIE_MAX_AGE, httponly=True, samesite="lax")
        return response
    return templates.TemplateResponse(request, "login.html", {"error": "Неверный пароль"}, status_code=401)


@app.get("/logout")
async def logout():
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie(COOKIE_NAME)
    return response


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    if not _is_authenticated(request):
        return RedirectResponse(url="/login", status_code=303)
    return templates.TemplateResponse(request, "index.html")


@app.get("/api/stats")
async def get_stats(
    request: Request,
    target_date: str = Query(default=None, description="Date in YYYY-MM-DD format, defaults to today"),
):
    if not _is_authenticated(request):
        raise HTTPException(status_code=401, detail="Not authenticated")

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
