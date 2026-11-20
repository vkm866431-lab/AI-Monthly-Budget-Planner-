"""Optional database seeder for academic demonstration (IIT Patna B.Tech Project)."""
from datetime import datetime
from database import get_connection, init_db, seed_user_defaults
from services.auth_service import hash_password


def run_seed():
    init_db()
    conn = get_connection()
    try:
        email = "aarav.sharma@iitp.ac.in"
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            print("Demo student user already exists.")
            return

        cur = conn.execute(
            "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            ("Aarav Sharma", email, hash_password("IITP@2026"), "B.Tech Student · IIT Patna"),
        )
        user_id = cur.lastrowid
        seed_user_defaults(conn, user_id)

        ym = datetime.now().strftime("%Y-%m")
        cats = {
            (r["type"], r["name"]): r["id"]
            for r in conn.execute("SELECT id, name, type FROM categories WHERE user_id = ?", (user_id,)).fetchall()
        }

        sample_txs = [
            ("income", cats[("income", "Scholarship")], 15000, f"{ym}-02", "IIT Patna Merit Scholarship", "Monthly stipend"),
            ("income", cats[("income", "Allowance")], 12000, f"{ym}-05", "Family Transfer", "Monthly hostel allowance"),
            ("expense", cats[("expense", "Rent")], 6500, f"{ym}-03", "Net Banking", "Hostel & mess fee"),
            ("expense", cats[("expense", "Food")], 4850, f"{ym}-09", "UPI", "Campus canteen & groceries"),
            ("expense", cats[("expense", "Education")], 2950, f"{ym}-11", "Debit Card", "Reference textbooks & lab printouts"),
            ("expense", cats[("expense", "Shopping")], 3400, f"{ym}-14", "Debit Card", "Winter jacket & study lamp"),
        ]
        for t_type, c_id, amt, dt, method, desc in sample_txs:
            conn.execute(
                "INSERT INTO transactions (user_id, category_id, type, amount, date, source_or_method, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, c_id, t_type, amt, dt, method, desc),
            )

        conn.execute(
            "INSERT INTO budgets (user_id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)",
            (user_id, cats[("expense", "Food")], ym, 5500),
        )
        conn.execute(
            "INSERT INTO budgets (user_id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)",
            (user_id, cats[("expense", "Shopping")], ym, 3000),
        )
        conn.execute(
            "INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, status) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, "New Coding Laptop Fund", 65000, 42500, "2027-05-15", "pending"),
        )
        conn.commit()
        print("Seeded demo student ledger successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    run_seed()
