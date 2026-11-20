from flask import Blueprint, g, jsonify, make_response, request
from database import get_connection, seed_user_defaults
from services.auth_service import (
    create_session,
    delete_session,
    hash_password,
    require_auth,
    verify_password,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    full_name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    password = str(data.get("password", ""))
    role = str(data.get("role", "student")).strip() or "student"

    if len(full_name) < 2:
        return jsonify({"error": "Full name must be at least 2 characters."}), 400
    if "@" not in email or "." not in email:
        return jsonify({"error": "Please enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    conn = get_connection()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"error": "An account with this email already exists."}), 409

        cursor = conn.execute(
            "INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
            (full_name, email, phone, hash_password(password), role),
        )
        user_id = cursor.lastrowid
        seed_user_defaults(conn, user_id)

        user = dict(
            conn.execute(
                "SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        )
    finally:
        conn.close()

    return jsonify({"message": "Account created successfully.", "user": user}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, full_name, email, password_hash, role, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            return jsonify({"error": "Invalid email or password."}), 401

        user = {
            "id": row["id"],
            "full_name": row["full_name"],
            "email": row["email"],
            "role": row["role"],
            "created_at": row["created_at"],
        }
        settings_row = conn.execute(
            "SELECT currency, currency_symbol, date_format, theme FROM settings WHERE user_id = ?",
            (row["id"],),
        ).fetchone()
        settings = dict(settings_row) if settings_row else {}
    finally:
        conn.close()

    token = create_session(row["id"])
    resp = make_response(jsonify({"token": token, "user": user, "settings": settings}), 200)
    resp.set_cookie("mbp_session", token, httponly=True, samesite="Lax", max_age=7 * 86400)
    return resp


@auth_bp.post("/logout")
def logout():
    token = request.cookies.get("mbp_session")
    if token:
        delete_session(token)
    resp = make_response(jsonify({"message": "Signed out successfully."}), 200)
    resp.delete_cookie("mbp_session")
    return resp


@auth_bp.get("/me")
@require_auth
def me():
    conn = get_connection()
    try:
        settings_row = conn.execute(
            "SELECT currency, currency_symbol, date_format, theme FROM settings WHERE user_id = ?",
            (g.current_user["id"],),
        ).fetchone()
        settings = dict(settings_row) if settings_row else {}
    finally:
        conn.close()
    return jsonify({"user": g.current_user, "settings": settings})
