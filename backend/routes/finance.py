from datetime import datetime
from flask import Blueprint, Response, g, jsonify, request
from database import get_connection
from services.auth_service import hash_password, require_auth, verify_password
from services.report_service import generate_csv_report, generate_pdf_report

finance_bp = Blueprint("finance", __name__, url_prefix="/api")


def default_month() -> str:
    return datetime.now().strftime("%Y-%m")


@finance_bp.get("/transactions")
@require_auth
def list_transactions():
    user_id = g.current_user["id"]
    tx_type = request.args.get("type", "")
    category_id = request.args.get("category_id", type=int)
    month = request.args.get("month", "")
    search = request.args.get("search", "").strip().lower()
    sort_by = "t.amount" if request.args.get("sort_by") == "amount" else "t.date"
    sort_order = "ASC" if request.args.get("sort_order") == "asc" else "DESC"
    page = max(1, request.args.get("page", default=1, type=int))
    limit = min(100, max(1, request.args.get("limit", default=20, type=int)))
    offset = (page - 1) * limit

    conditions = ["t.user_id = ?"]
    params = [user_id]
    if tx_type in ("income", "expense"):
        conditions.append("t.type = ?")
        params.append(tx_type)
    if category_id:
        conditions.append("t.category_id = ?")
        params.append(category_id)
    if len(month) == 7:
        conditions.append("substr(t.date, 1, 7) = ?")
        params.append(month)
    if search:
        conditions.append("(LOWER(t.description) LIKE ? OR LOWER(t.source_or_method) LIKE ? OR LOWER(c.name) LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like, like])

    where_sql = " AND ".join(conditions)
    conn = get_connection()
    try:
        summary = conn.execute(
            f"""
            SELECT COUNT(*) as total,
                   COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END), 0) as total_income,
                   COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) as total_expense
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE {where_sql}
            """,
            params,
        ).fetchone()

        rows = conn.execute(
            f"""
            SELECT t.*, c.name as category_name, c.color as category_color
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE {where_sql}
            ORDER BY {sort_by} {sort_order}, t.id DESC
            LIMIT ? OFFSET ?
            """,
            params + [limit, offset],
        ).fetchall()
    finally:
        conn.close()

    total = summary["total"]
    return jsonify({
        "transactions": [dict(r) for r in rows],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": max(1, (total + limit - 1) // limit),
        },
        "summary": {
            "total_income": summary["total_income"],
            "total_expense": summary["total_expense"],
        },
    })


@finance_bp.post("/transactions")
@require_auth
def create_transaction():
    user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}
    tx_type = data.get("type")
    category_id = data.get("category_id")
    amount = float(data.get("amount", 0) or 0)
    date = str(data.get("date", "")).strip()
    source_or_method = str(data.get("source_or_method", "")).strip()
    description = str(data.get("description", "")).strip()

    if tx_type not in ("income", "expense"):
        return jsonify({"error": "Invalid transaction type."}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero."}), 400

    conn = get_connection()
    try:
        cat = conn.execute(
            "SELECT id, type FROM categories WHERE id = ? AND user_id = ?",
            (category_id, user_id),
        ).fetchone()
        if not cat or cat["type"] != tx_type:
            return jsonify({"error": "Invalid category selected."}), 400

        cur = conn.execute(
            """
            INSERT INTO transactions (user_id, category_id, type, amount, date, source_or_method, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, category_id, tx_type, round(amount, 2), date, source_or_method, description),
        )
        conn.commit()
        created = conn.execute(
            """
            SELECT t.*, c.name as category_name, c.color as category_color
            FROM transactions t JOIN categories c ON c.id = t.category_id
            WHERE t.id = ?
            """,
            (cur.lastrowid,),
        ).fetchone()
    finally:
        conn.close()

    return jsonify({"transaction": dict(created)}), 201


@finance_bp.put("/transactions/<int:tx_id>")
@require_auth
def update_transaction(tx_id: int):
    user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}
    amount = float(data.get("amount", 0) or 0)
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero."}), 400

    conn = get_connection()
    try:
        cur = conn.execute(
            """
            UPDATE transactions
            SET category_id = ?, type = ?, amount = ?, date = ?, source_or_method = ?, description = ?,
                updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
            """,
            (
                data.get("category_id"),
                data.get("type"),
                round(amount, 2),
                data.get("date"),
                data.get("source_or_method", ""),
                data.get("description", ""),
                tx_id,
                user_id,
            ),
        )
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "Transaction not found."}), 404
    finally:
        conn.close()
    return jsonify({"message": "Transaction updated."})


@finance_bp.delete("/transactions/<int:tx_id>")
@require_auth
def delete_transaction(tx_id: int):
    user_id = g.current_user["id"]
    conn = get_connection()
    try:
        cur = conn.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "Transaction not found."}), 404
    finally:
        conn.close()
    return jsonify({"message": "Transaction deleted."})


@finance_bp.get("/budgets")
@require_auth
def list_budgets():
    user_id = g.current_user["id"]
    month = request.args.get("month", default_month())
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT b.*, c.name as category_name, c.color as category_color,
                   COALESCE(SUM(t.amount), 0) as spent_amount
            FROM budgets b
            JOIN categories c ON c.id = b.category_id
            LEFT JOIN transactions t ON t.category_id = b.category_id
                 AND t.user_id = b.user_id AND t.type = 'expense' AND substr(t.date, 1, 7) = b.month
            WHERE b.user_id = ? AND b.month = ?
            GROUP BY b.id
            """,
            (user_id, month),
        ).fetchall()
    finally:
        conn.close()

    budgets = []
    for r in rows:
        limit = float(r["limit_amount"])
        spent = float(r["spent_amount"])
        util = round((spent / limit) * 100, 1) if limit > 0 else 0
        status = "exceeded" if util > 100 else ("warning" if util >= 80 else "normal")
        item = dict(r)
        item["remaining_amount"] = round(limit - spent, 2)
        item["utilization_percent"] = util
        item["status"] = status
        budgets.append(item)

    return jsonify({"month": month, "budgets": budgets})


@finance_bp.post("/budgets")
@require_auth
def save_budget():
    user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}
    limit_amount = float(data.get("limit_amount", 0) or 0)
    if limit_amount <= 0:
        return jsonify({"error": "Budget limit must be greater than zero."}), 400

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO budgets (user_id, category_id, month, limit_amount)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, category_id, month)
            DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = datetime('now')
            """,
            (user_id, data.get("category_id"), data.get("month"), round(limit_amount, 2)),
        )
        conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Monthly budget saved."}), 201


@finance_bp.get("/savings")
@require_auth
def list_savings():
    user_id = g.current_user["id"]
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM savings_goals WHERE user_id = ? ORDER BY target_date ASC",
            (user_id,),
        ).fetchall()
    finally:
        conn.close()
    goals = []
    for r in rows:
        g_dict = dict(r)
        target = float(r["target_amount"])
        current = float(r["current_amount"])
        g_dict["progress_percent"] = min(100.0, round((current / target) * 100, 1)) if target > 0 else 0.0
        goals.append(g_dict)
    return jsonify({"goals": goals})


@finance_bp.get("/analytics/report/csv")
@require_auth
def export_csv():
    user_id = g.current_user["id"]
    period = "yearly" if request.args.get("period") == "yearly" else "monthly"
    value = request.args.get("value", default_month()[:4] if period == "yearly" else default_month())
    report = _build_report_dict(user_id, period, value)
    csv_text = generate_csv_report(report)
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=budget-report-{period}-{value}.csv"},
    )


@finance_bp.get("/analytics/report/pdf")
@require_auth
def export_pdf():
    user_id = g.current_user["id"]
    period = "yearly" if request.args.get("period") == "yearly" else "monthly"
    value = request.args.get("value", default_month()[:4] if period == "yearly" else default_month())
    report = _build_report_dict(user_id, period, value)
    pdf_bytes = generate_pdf_report(report, g.current_user["full_name"])
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=budget-report-{period}-{value}.pdf"},
    )


def _build_report_dict(user_id: int, period: str, value: str) -> dict:
    date_expr = "substr(t.date, 1, 4) = ?" if period == "yearly" else "substr(t.date, 1, 7) = ?"
    conn = get_connection()
    try:
        totals = conn.execute(
            f"""
            SELECT COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END), 0) as total_income,
                   COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) as total_expense,
                   COUNT(*) as transaction_count
            FROM transactions t WHERE t.user_id = ? AND {date_expr}
            """,
            (user_id, value),
        ).fetchone()
        categories = conn.execute(
            f"""
            SELECT c.name as category_name, c.type, c.color as category_color,
                   COALESCE(SUM(t.amount), 0) as total, COUNT(t.id) as tx_count
            FROM transactions t JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = ? AND {date_expr}
            GROUP BY c.id, t.type ORDER BY t.type ASC, total DESC
            """,
            (user_id, value),
        ).fetchall()
        txs = conn.execute(
            f"""
            SELECT t.id, t.type, t.amount, t.date, t.source_or_method, t.description, c.name as category_name
            FROM transactions t JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = ? AND {date_expr}
            ORDER BY t.date DESC
            """,
            (user_id, value),
        ).fetchall()
    finally:
        conn.close()

    inc = float(totals["total_income"])
    exp = float(totals["total_expense"])
    return {
        "period": period,
        "value": value,
        "summary": {
            "total_income": inc,
            "total_expense": exp,
            "net_balance": round(inc - exp, 2),
            "savings_rate": round(((inc - exp) / inc) * 100, 1) if inc > 0 else 0.0,
            "transaction_count": totals["transaction_count"],
        },
        "category_breakdown": [dict(c) for c in categories],
        "transactions": [dict(t) for t in txs],
    }


@finance_bp.put("/settings/password")
@require_auth
def change_password():
    user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}
    current_pw = str(data.get("current_password", ""))
    new_pw = str(data.get("new_password", ""))
    if len(new_pw) < 6:
        return jsonify({"error": "New password must be at least 6 characters."}), 400
    conn = get_connection()
    try:
        row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row or not verify_password(current_pw, row["password_hash"]):
            return jsonify({"error": "Current password is incorrect."}), 400
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(new_pw), user_id))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Password updated successfully."})
