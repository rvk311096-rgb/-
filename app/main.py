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

async def current_user(
    x_bx_token:  Optional[str] = Header(None),
    x_user_id:   Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
) -> UserCtx:
    if not API_KEY:
        raise HTTPException(500, "BITRIX_API_KEY не настроен")

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
        return UserCtx(user_id=uid, user_name=name, is_admin=name in ADMIN_NAMES)

    if x_user_id and x_user_name:
        return UserCtx(user_id=x_user_id, user_name=x_user_name,
                       is_admin=x_user_name in ADMIN_NAMES)

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
