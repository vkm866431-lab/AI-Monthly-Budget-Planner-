import csv
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def format_pdf_money(amount: float, currency: str = "INR") -> str:
    prefix = "Rs. " if currency == "INR" else f"{currency} "
    return f"{prefix}{amount:,.2f}"


def generate_csv_report(report: dict, currency: str = "INR") -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Monthly Budget Planner Financial Report", f"{report['period'].upper()} ({report['value']})", f"Currency: {currency}"])
    writer.writerow([])
    writer.writerow(["Summary Metric", "Value"])
    writer.writerow(["Total Income", f"{report['summary']['total_income']:.2f}"])
    writer.writerow(["Total Expenses", f"{report['summary']['total_expense']:.2f}"])
    writer.writerow(["Net Balance", f"{report['summary']['net_balance']:.2f}"])
    writer.writerow(["Savings Rate (%)", f"{report['summary']['savings_rate']}%"])
    writer.writerow([])
    writer.writerow(["Category", "Type", "Transactions", "Total Amount"])
    for c in report["category_breakdown"]:
        writer.writerow([c["category_name"], c["type"], c["tx_count"], f"{c['total']:.2f}"])
    writer.writerow([])
    writer.writerow(["Date", "Type", "Category", "Source / Payment Method", "Description", "Amount"])
    for tx in report["transactions"]:
        writer.writerow([
            tx["date"],
            tx["type"],
            tx["category_name"],
            tx["source_or_method"],
            tx["description"],
            f"{tx['amount']:.2f}",
        ])
    return output.getvalue()


def generate_pdf_report(report: dict, user_name: str, currency: str = "INR") -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Monthly Budget Planner — Financial Report", styles["Title"]))
    elements.append(
        Paragraph(
            f"Period: {report['period'].capitalize()} ({report['value']}) | Account: {user_name}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 14))

    summary = report["summary"]
    summary_table = Table(
        [
            ["Total Income", "Total Expenses", "Net Balance", "Savings Rate"],
            [
                format_pdf_money(summary["total_income"], currency),
                format_pdf_money(summary["total_expense"], currency),
                format_pdf_money(summary["net_balance"], currency),
                f"{summary['savings_rate']}%",
            ],
        ],
        colWidths=[125, 125, 125, 115],
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1528")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 18))

    elements.append(Paragraph("Category Breakdown", styles["Heading2"]))
    cat_rows = [["Category", "Type", "Entries", "Total"]] + [
        [c["category_name"], c["type"].capitalize(), str(c["tx_count"]), format_pdf_money(c["total"], currency)]
        for c in report["category_breakdown"]
    ]
    cat_table = Table(cat_rows, colWidths=[180, 90, 80, 140])
    cat_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(cat_table)
    doc.build(elements)
    return buffer.getvalue()
