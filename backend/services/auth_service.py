import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from database import get_connection


def hash_password(password: str) -> str:
    return generate_password_hash(password, method="pbkdf2:sha256")


def verify_password(password: str, stored_hash: str) -> bool:
    return check_password_hash(stored_hash, password)


def create_session(user_id: int) -> str:
    token = secrets.token_hex(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )
        conn.commit()
    finally:
        conn.close()
    return token


def delete_session(token: str) -> None:
    conn = get_connection()
    try:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
    finally:
        conn.close()


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        cookie_token = request.cookies.get("mbp_session")
        auth_header = request.headers.get("Authorization", "")
        bearer_token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else None
        token = cookie_token or bearer_token

        if not token:
            return jsonify({"error": "Authentication required. Please sign in."}), 401

        conn = get_connection()
        try:
            row = conn.execute(
                """
                SELECT u.id, u.full_name, u.email, u.role, u.created_at, s.expires_at
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token = ?
                """,
                (token,),
            ).fetchone()
            if not row:
                return jsonify({"error": "Session expired or invalid."}), 401

            g.current_user = {
                "id": row["id"],
                "full_name": row["full_name"],
                "email": row["email"],
                "role": row["role"],
                "created_at": row["created_at"],
            }
            g.session_token = token
        finally:
            conn.close()

        return fn(*args, **kwargs)

    return wrapper
