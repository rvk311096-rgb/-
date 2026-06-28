import os
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional

from .database import get_db, init_db, hash_password, check_password

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Plan")
app.mount("/static", StaticFiles(directory=os.path.join(BASE, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE, "templates"))


@app.on_event("startup")
def startup():
    init_db()


# ── Pages ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request, "index.html")


# ── Sections API ─────────────────────────────────────────────────────────────

@app.get("/api/sections")
def list_sections():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, color, (password_hash IS NOT NULL) as locked, created_at FROM sections ORDER BY id"
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/sections")
async def create_section(request: Request):
    data = await request.json()
    name = data.get("name", "").strip()
    color = data.get("color", "#6366f1")
    password = data.get("password", "").strip()
    if not name:
        raise HTTPException(400, "name required")
    ph = hash_password(password) if password else None
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO sections (name, color, password_hash) VALUES (?,?,?) RETURNING id, name, color, (password_hash IS NOT NULL) as locked",
            (name, color, ph)
        )
        row = cur.fetchone()
        conn.commit()
    return dict(row)


@app.put("/api/sections/{sid}")
async def update_section(sid: int, request: Request):
    data = await request.json()
    name = data.get("name", "").strip()
    color = data.get("color")
    new_password = data.get("new_password")  # None = don't change, "" = remove lock
    if not name:
        raise HTTPException(400, "name required")
    with get_db() as conn:
        existing = conn.execute("SELECT password_hash FROM sections WHERE id=?", (sid,)).fetchone()
        if not existing:
            raise HTTPException(404)
        if new_password is None:
            ph = existing["password_hash"]
        elif new_password == "":
            ph = None
        else:
            ph = hash_password(new_password)
        conn.execute(
            "UPDATE sections SET name=?, color=?, password_hash=? WHERE id=?",
            (name, color, ph, sid)
        )
        conn.commit()
    return {"ok": True}


@app.delete("/api/sections/{sid}")
async def delete_section(sid: int, request: Request):
    data = await request.json()
    password = data.get("password", "")
    with get_db() as conn:
        row = conn.execute("SELECT password_hash FROM sections WHERE id=?", (sid,)).fetchone()
        if not row:
            raise HTTPException(404)
        if row["password_hash"] and not check_password(password, row["password_hash"]):
            raise HTTPException(403, "wrong password")
        conn.execute("DELETE FROM sections WHERE id=?", (sid,))
        conn.commit()
    return {"ok": True}


@app.post("/api/sections/{sid}/verify")
async def verify_section_password(sid: int, request: Request):
    data = await request.json()
    password = data.get("password", "")
    with get_db() as conn:
        row = conn.execute("SELECT password_hash FROM sections WHERE id=?", (sid,)).fetchone()
        if not row:
            raise HTTPException(404)
        if not row["password_hash"]:
            return {"ok": True}
        if check_password(password, row["password_hash"]):
            return {"ok": True}
        raise HTTPException(403, "wrong password")


# ── Items API ─────────────────────────────────────────────────────────────────

@app.get("/api/sections/{sid}/items")
async def list_items(sid: int, password: str = ""):
    with get_db() as conn:
        section = conn.execute("SELECT password_hash FROM sections WHERE id=?", (sid,)).fetchone()
        if not section:
            raise HTTPException(404)
        if section["password_hash"] and not check_password(password, section["password_hash"]):
            raise HTTPException(403, "wrong password")
        rows = conn.execute(
            "SELECT * FROM items WHERE section_id=? ORDER BY start_date, due_date",
            (sid,)
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/sections/{sid}/items-list")
async def list_items_post(sid: int, request: Request):
    data = await request.json()
    password = data.get("password", "")
    with get_db() as conn:
        section = conn.execute("SELECT password_hash FROM sections WHERE id=?", (sid,)).fetchone()
        if not section:
            raise HTTPException(404)
        if section["password_hash"] and not check_password(password, section["password_hash"]):
            raise HTTPException(403, "wrong password")
        rows = conn.execute(
            "SELECT * FROM items WHERE section_id=? ORDER BY start_date, due_date",
            (sid,)
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/sections/{sid}/items")
async def create_item(sid: int, request: Request):
    data = await request.json()
    password = data.get("password", "")
    with get_db() as conn:
        section = conn.execute("SELECT password_hash FROM sections WHERE id=?", (sid,)).fetchone()
        if not section:
            raise HTTPException(404)
        if section["password_hash"] and not check_password(password, section["password_hash"]):
            raise HTTPException(403, "wrong password")
        cur = conn.execute(
            "INSERT INTO items (section_id, title, note, start_date, due_date, status) VALUES (?,?,?,?,?,?) RETURNING *",
            (sid, data["title"], data.get("note", ""), data["start_date"], data["due_date"], data.get("status", "planned"))
        )
        row = cur.fetchone()
        conn.commit()
    return dict(row)


@app.put("/api/items/{iid}")
async def update_item(iid: int, request: Request):
    data = await request.json()
    password = data.get("password", "")
    with get_db() as conn:
        item = conn.execute("SELECT section_id FROM items WHERE id=?", (iid,)).fetchone()
        if not item:
            raise HTTPException(404)
        section = conn.execute("SELECT password_hash FROM sections WHERE id=?", (item["section_id"],)).fetchone()
        if section["password_hash"] and not check_password(password, section["password_hash"]):
            raise HTTPException(403, "wrong password")
        conn.execute(
            "UPDATE items SET title=?, note=?, start_date=?, due_date=?, status=? WHERE id=?",
            (data["title"], data.get("note", ""), data["start_date"], data["due_date"], data.get("status", "planned"), iid)
        )
        conn.commit()
    return {"ok": True}


@app.delete("/api/items/{iid}")
async def delete_item(iid: int, request: Request):
    data = await request.json()
    password = data.get("password", "")
    with get_db() as conn:
        item = conn.execute("SELECT section_id FROM items WHERE id=?", (iid,)).fetchone()
        if not item:
            raise HTTPException(404)
        section = conn.execute("SELECT password_hash FROM sections WHERE id=?", (item["section_id"],)).fetchone()
        if section["password_hash"] and not check_password(password, section["password_hash"]):
            raise HTTPException(403, "wrong password")
        conn.execute("DELETE FROM items WHERE id=?", (iid,))
        conn.commit()
    return {"ok": True}


# ── Cross-section timeline ────────────────────────────────────────────────────

@app.post("/api/timeline")
async def get_timeline(request: Request):
    """Accepts {sections: [{id, password}]} — returns items from all unlocked sections."""
    data = await request.json()
    requested = data.get("sections", [])
    result = []
    locked_sections = []

    with get_db() as conn:
        for entry in requested:
            sid = entry["id"]
            password = entry.get("password", "")
            section = conn.execute(
                "SELECT id, name, color, password_hash FROM sections WHERE id=?", (sid,)
            ).fetchone()
            if not section:
                continue
            if section["password_hash"] and not check_password(password, section["password_hash"]):
                locked_sections.append({"id": sid, "name": section["name"]})
                continue
            items = conn.execute(
                "SELECT * FROM items WHERE section_id=? ORDER BY start_date", (sid,)
            ).fetchall()
            for item in items:
                result.append({**dict(item), "section_name": section["name"], "section_color": section["color"]})

    return {"items": result, "locked": locked_sections}
