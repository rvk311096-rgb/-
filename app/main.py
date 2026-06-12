import os
import logging
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

from app.bitrix_client import BitrixClient

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Банк идей", version="1.0.0")

BASE_URL = os.getenv("BITRIX_BASE_URL", "https://vibecode.bitrix24.tech/v1")
API_KEY  = os.getenv("BITRIX_API_KEY", "")

ADMIN_NAMES = {"Вадим Алхилов", "Виктория Радван", "Анастасия Тищенко"}

client = BitrixClient(base_url=BASE_URL, api_key=API_KEY)

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
templates = Jinja2Templates(directory=os.path.join(_BASE, "templates"))
_static = os.path.join(_BASE, "static")
if os.path.isdir(_static):
    app.mount("/static", StaticFiles(directory=_static), name="static")


# ── Models ───────────────────────────────────────────────────────────────────

class IdeaCreate(BaseModel):
    title: str
    category: str
    description: str = ""

class StatusUpdate(BaseModel):
    status: str
    admin_comment: str = ""

class UserCtx(BaseModel):
    user_id: str
    user_name: str
    is_admin: bool


# ── Auth ─────────────────────────────────────────────────────────────────────

def _norm_name(name: str) -> frozenset:
    return frozenset(w for w in name.lower().split() if w)

_ADMIN_KEYS = {_norm_name(n) for n in ADMIN_NAMES}

def _decode_header_name(raw: str) -> str:
    """Gateway may send the name URL-encoded or base64-encoded."""
    import urllib.parse, base64, re
    if not raw:
        return ""
    if "%" in raw:
        try:
            return urllib.parse.unquote(raw)
        except Exception:
            pass
    if re.fullmatch(r"[A-Za-z0-9+/=]+", raw):
        try:
            decoded = base64.b64decode(raw).decode("utf-8")
            if decoded.strip():
                return decoded
        except Exception:
            pass
    return raw

_me_cache: dict = {}  # vibe_user_id -> user name

async def current_user(
    request:     Request,
    x_bx_token:  Optional[str] = Header(None),
    x_user_id:   Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
) -> UserCtx:
    if not API_KEY:
        raise HTTPException(500, "BITRIX_API_KEY не настроен")

    # ── 1. VibeCode gateway identity headers (direct-link access) ──
    vibe_uid  = request.headers.get("x-vibe-user-id") if request else None
    if vibe_uid:
        name = _decode_header_name(
            request.headers.get("x-vibe-user-name-encoded", "")
            or request.headers.get("x-vibe-user-name", "")
        ).strip()

        if not name:
            name = _me_cache.get(vibe_uid, "")

        if not name:
            vibe_auth = request.headers.get("x-vibe-authorization", "")
            if vibe_auth:
                try:
                    me = await client.vibe_me(vibe_auth)
                    cu = (me.get("data") or {}).get("currentUser") or {}
                    name = (cu.get("name")
                            or f"{cu.get('lastName','')} {cu.get('firstName','')}".strip()
                            or "")
                    if name:
                        _me_cache[vibe_uid] = name
                except Exception as e:
                    logger.warning(f"/v1/me lookup failed: {e}")

        if not name:
            name = f"user_{vibe_uid[:8]}"

        return UserCtx(user_id=vibe_uid, user_name=name,
                       is_admin=_norm_name(name) in _ADMIN_KEYS)

    # ── 2. BX24 user token (app opened inside Bitrix24 iframe) ──
    if x_bx_token:
        try:
            u = await client.user_current(x_bx_token)
        except Exception as e:
            logger.warning(f"token validation failed: {e}")
            raise HTTPException(401, "Не удалось проверить токен Bitrix24")

        if not u.get("ACTIVE", True):
            raise HTTPException(403, "Учётная запись деактивирована")

        uid  = str(u["ID"])
        name = f"{u.get('LAST_NAME','')} {u.get('NAME','')}".strip() or f"user_{uid}"
        return UserCtx(user_id=uid, user_name=name,
                       is_admin=_norm_name(name) in _ADMIN_KEYS)

    if x_user_id and x_user_name:
        return UserCtx(user_id=x_user_id, user_name=x_user_name,
                       is_admin=_norm_name(x_user_name) in _ADMIN_KEYS)

    raise HTTPException(401, "Требуется авторизация (x-bx-token или x-user-id + x-user-name)")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/api/me")
async def me(user: UserCtx = Depends(current_user)):
    return user.model_dump()


@app.get("/api/ideas")
async def list_ideas(user: UserCtx = Depends(current_user)):
    uid = None if user.is_admin else user.user_id
    return await client.get_ideas(user_id=uid)


@app.post("/api/ideas", status_code=201)
async def create_idea(body: IdeaCreate, user: UserCtx = Depends(current_user)):
    return await client.create_idea(
        user_id=user.user_id,
        user_name=user.user_name,
        title=body.title,
        category=body.category,
        description=body.description,
    )


@app.patch("/api/ideas/{idea_id}")
async def update_status(idea_id: str, body: StatusUpdate,
                        user: UserCtx = Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(403, "Только администраторы меняют статус")
    return await client.update_idea(idea_id, body.status, body.admin_comment)


@app.delete("/api/ideas/{idea_id}", status_code=204)
async def delete_idea(idea_id: str, user: UserCtx = Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(403, "Только администраторы удаляют идеи")
    await client.delete_idea(idea_id)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/echo")
async def echo(request: Request):
    headers = {}
    for k, v in request.headers.items():
        if k.lower() == "authorization":
            v = v[:24] + "…" if len(v) > 24 else v
        headers[k] = v
    return {
        "headers": headers,
        "cookies": {k: (v[:24] + "…" if len(v) > 24 else v)
                    for k, v in request.cookies.items()},
        "client": str(request.client),
    }
