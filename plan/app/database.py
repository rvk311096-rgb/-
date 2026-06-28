import sqlite3
import hashlib
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sections (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                name     TEXT NOT NULL,
                color    TEXT NOT NULL DEFAULT '#6366f1',
                password_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                section_id  INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
                title       TEXT NOT NULL,
                note        TEXT,
                start_date  DATE NOT NULL,
                due_date    DATE NOT NULL,
                status      TEXT NOT NULL DEFAULT 'planned',
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def check_password(password: str, stored_hash: str) -> bool:
    return hash_password(password) == stored_hash
