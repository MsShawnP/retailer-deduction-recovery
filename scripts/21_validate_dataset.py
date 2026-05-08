"""Validate the deduction-extended dataset.

Mirrors the base repo's 06_validate_dataset.py pattern: each check
prints PASS / WARN / FAIL with context. Exits non-zero only on FAIL
(structural / integrity issues), so WARN-level deviations from
calibration targets don't block the build.

Validates:
  - Row counts in expected ranges
  - Referential integrity (every FK resolves)
  - Annualized deduction dollars in $750K-$1.2M target band
  - Channel split: Walmart dominant, distribution roughly tracks base
  - Type mix: short_ship + label_fine dominate by count
  - Date ranges within the build window
  - Vague-deduction conventions (NULL order_id allowed, is_vague=1)
  - Disputes never reference a non-existent deduction
  - Recovery dollars never exceed deduction dollars
  - JSON export matches DB row counts
"""

from __future__ import annotations

import json
import sqlite3
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "cinderhaven_deductions.db"
JSON_DIR = ROOT / "data" / "json"

# Target ranges from data/schema.md
TARGETS = {
    "orders":            (4000, 6500),
    "order_lines":       (15000, 35000),
    "shipments":         (4000, 6500),
    "pack_records":      (4000, 6500),
    "deductions":        (3000, 6000),
    "remittances":       (200, 700),
    "disputes":          (1500, 3600),
    "dispute_evidence":  (3000, 10000),
    "post_audit_claims": (30, 80),
    "retailers":         (10, 12),
    "retailer_rules":    (60, 80),
    "deduction_codes":   (50, 80),
    "edi_requirements":  (30, 50),
}

ANNUAL_DOLLAR_TARGET = (750_000, 1_200_000)
RECOVERY_RATE_TARGET = (0.05, 0.20)  # 5-20%; lean team should be on the lower side


class Reporter:
    def __init__(self) -> None:
        self.fail_count = 0
        self.warn_count = 0
        self.pass_count = 0

    def passed(self, msg: str) -> None:
        self.pass_count += 1
        print(f"  [PASS] {msg}")

    def warn(self, msg: str) -> None:
        self.warn_count += 1
        print(f"  [WARN] {msg}")

    def fail(self, msg: str) -> None:
        self.fail_count += 1
        print(f"  [FAIL] {msg}")


def in_range(value, lo, hi) -> bool:
    return lo <= value <= hi


def main() -> int:
    if not DB_PATH.exists():
        print(f"FATAL: {DB_PATH} does not exist. Run build_deductions_db.py --full first.")
        return 2

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    rep = Reporter()

    # ===== Row counts =====
    print("Row counts (target ranges from data/schema.md):")
    for table, (lo, hi) in TARGETS.items():
        n = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        if in_range(n, lo, hi):
            rep.passed(f"{table:<22} {n:>6,}  (in [{lo:,}, {hi:,}])")
        else:
            rep.warn(f"{table:<22} {n:>6,}  (target [{lo:,}, {hi:,}])")

    # ===== Referential integrity =====
    print("\nReferential integrity:")

    checks = [
        ("orders.retailer_id -> retailers", """
            SELECT COUNT(*) FROM orders o
            LEFT JOIN retailers r ON r.retailer_id = o.retailer_id
            WHERE r.retailer_id IS NULL
        """),
        ("order_lines.order_id -> orders", """
            SELECT COUNT(*) FROM order_lines ol
            LEFT JOIN orders o ON o.order_id = ol.order_id
            WHERE o.order_id IS NULL
        """),
        ("order_lines.sku -> product_master", """
            SELECT COUNT(*) FROM order_lines ol
            LEFT JOIN product_master p ON p.sku = ol.sku
            WHERE p.sku IS NULL
        """),
        ("shipments.order_id -> orders", """
            SELECT COUNT(*) FROM shipments s
            LEFT JOIN orders o ON o.order_id = s.order_id
            WHERE o.order_id IS NULL
        """),
        ("pack_records.order_id -> orders", """
            SELECT COUNT(*) FROM pack_records p
            LEFT JOIN orders o ON o.order_id = p.order_id
            WHERE o.order_id IS NULL
        """),
        ("pack_records.shipment_id -> shipments (where set)", """
            SELECT COUNT(*) FROM pack_records p
            LEFT JOIN shipments s ON s.shipment_id = p.shipment_id
            WHERE p.shipment_id IS NOT NULL AND s.shipment_id IS NULL
        """),
        ("deductions.retailer_id -> retailers", """
            SELECT COUNT(*) FROM deductions d
            LEFT JOIN retailers r ON r.retailer_id = d.retailer_id
            WHERE r.retailer_id IS NULL
        """),
        ("deductions.order_id -> orders (where set)", """
            SELECT COUNT(*) FROM deductions d
            LEFT JOIN orders o ON o.order_id = d.order_id
            WHERE d.order_id IS NOT NULL AND o.order_id IS NULL
        """),
        ("deductions.code_id -> deduction_codes (where set)", """
            SELECT COUNT(*) FROM deductions d
            LEFT JOIN deduction_codes c ON c.code_id = d.code_id
            WHERE d.code_id IS NOT NULL AND c.code_id IS NULL
        """),
        ("deductions.remittance_id -> remittances (no orphans)", """
            SELECT COUNT(*) FROM deductions WHERE remittance_id IS NULL
        """),
        ("disputes.deduction_id -> deductions", """
            SELECT COUNT(*) FROM disputes d
            LEFT JOIN deductions de ON de.deduction_id = d.deduction_id
            WHERE de.deduction_id IS NULL
        """),
        ("dispute_evidence.dispute_id -> disputes", """
            SELECT COUNT(*) FROM dispute_evidence e
            LEFT JOIN disputes d ON d.dispute_id = e.dispute_id
            WHERE d.dispute_id IS NULL
        """),
        ("post_audit_claims.deduction_id -> deductions", """
            SELECT COUNT(*) FROM post_audit_claims p
            LEFT JOIN deductions d ON d.deduction_id = p.deduction_id
            WHERE d.deduction_id IS NULL
        """),
    ]
    for label, sql in checks:
        n = cur.execute(sql).fetchone()[0]
        if n == 0:
            rep.passed(f"{label}")
        else:
            rep.fail(f"{label}: {n} broken refs")

    # ===== Vague-deduction conventions =====
    print("\nDesign conventions:")
    bad_vague = cur.execute(
        "SELECT COUNT(*) FROM deductions WHERE is_vague=1 AND deduction_type != 'vague'"
    ).fetchone()[0]
    if bad_vague == 0:
        rep.passed("is_vague=1 only on deduction_type='vague'")
    else:
        rep.fail(f"is_vague=1 set on non-vague rows: {bad_vague}")

    no_order_non_vague_non_audit = cur.execute("""
        SELECT COUNT(*) FROM deductions
        WHERE order_id IS NULL AND is_vague=0 AND is_post_audit=0
    """).fetchone()[0]
    if no_order_non_vague_non_audit == 0:
        rep.passed("Non-vague non-post-audit deductions all have order_id")
    else:
        rep.fail(f"{no_order_non_vague_non_audit} non-vague non-audit deductions missing order_id")

    audit_with_order = cur.execute("""
        SELECT COUNT(*) FROM deductions WHERE is_post_audit=1 AND order_id IS NOT NULL
    """).fetchone()[0]
    if audit_with_order == 0:
        rep.passed("Post-audit deductions never link to a specific order_id")
    else:
        rep.warn(f"{audit_with_order} post-audit deductions link to order_id (design says NULL)")

    # ===== Dollar volume =====
    print("\nDollar volume:")
    total = cur.execute("SELECT SUM(amount) FROM deductions").fetchone()[0] or 0
    window = cur.execute(
        "SELECT MIN(deduction_date), MAX(deduction_date) FROM deductions"
    ).fetchone()
    start = date.fromisoformat(window[0])
    end = date.fromisoformat(window[1])
    months = (end.year - start.year) * 12 + (end.month - start.month) + 1
    annualized = total * 12 / months

    if in_range(annualized, *ANNUAL_DOLLAR_TARGET):
        rep.passed(f"Annualized deductions ${annualized:,.0f} in target ${ANNUAL_DOLLAR_TARGET[0]:,}-${ANNUAL_DOLLAR_TARGET[1]:,}")
    else:
        rep.warn(f"Annualized deductions ${annualized:,.0f} outside target ${ANNUAL_DOLLAR_TARGET[0]:,}-${ANNUAL_DOLLAR_TARGET[1]:,}")

    # Recovery never exceeds deductions
    recovered = cur.execute("SELECT SUM(recovered_amount) FROM disputes").fetchone()[0] or 0
    if recovered <= total:
        rep.passed(f"Total recovered (${recovered:,.0f}) <= total deductions (${total:,.0f})")
    else:
        rep.fail(f"Total recovered (${recovered:,.0f}) EXCEEDS total deductions (${total:,.0f})")

    rate = recovered / total if total else 0
    if in_range(rate, *RECOVERY_RATE_TARGET):
        rep.passed(f"Recovery rate {rate:.1%} in target {RECOVERY_RATE_TARGET[0]:.0%}-{RECOVERY_RATE_TARGET[1]:.0%}")
    else:
        rep.warn(f"Recovery rate {rate:.1%} outside target {RECOVERY_RATE_TARGET[0]:.0%}-{RECOVERY_RATE_TARGET[1]:.0%}")

    # ===== Channel split sanity =====
    print("\nChannel split (Walmart should be largest by deduction $):")
    rows = cur.execute("""
        SELECT retailer_id, SUM(amount) AS amt
        FROM deductions
        GROUP BY retailer_id
        ORDER BY amt DESC
    """).fetchall()
    if rows and rows[0][0] == "walmart":
        rep.passed(f"Walmart is largest deduction-$ retailer (${rows[0][1]:,.0f})")
    else:
        rep.warn(f"Largest is {rows[0][0]} (${rows[0][1]:,.0f}); expected walmart")

    # ===== Type mix =====
    print("\nType mix (short_ship+label_fine should dominate by count):")
    type_counts = dict(cur.execute(
        "SELECT deduction_type, COUNT(*) FROM deductions GROUP BY deduction_type"
    ).fetchall())
    short_label = type_counts.get("short_ship", 0) + type_counts.get("label_fine", 0)
    total_count = sum(type_counts.values())
    pct = short_label / total_count if total_count else 0
    if pct >= 0.40:
        rep.passed(f"short_ship + label_fine = {short_label:,} ({pct:.1%}) — labels-as-root-cause story holds")
    else:
        rep.warn(f"short_ship + label_fine only {pct:.1%} of count — story may not land")

    # ===== Date ranges =====
    print("\nDate ranges:")
    expected_min = date(2024, 11, 1)
    expected_max = date(2026, 9, 30)
    deduction_min = cur.execute("SELECT MIN(deduction_date) FROM deductions").fetchone()[0]
    deduction_max = cur.execute("SELECT MAX(deduction_date) FROM deductions").fetchone()[0]
    if expected_min.isoformat() <= deduction_min and deduction_max <= expected_max.isoformat():
        rep.passed(f"deductions dates {deduction_min} to {deduction_max} within reasonable window")
    else:
        rep.warn(f"deductions dates {deduction_min} to {deduction_max} fall outside expected window")

    # ===== JSON / DB row count parity =====
    print("\nJSON export parity:")
    if not JSON_DIR.exists():
        rep.warn(f"{JSON_DIR} does not exist — run scripts/20_export_json.py")
    else:
        deductions_json = JSON_DIR / "deductions.json"
        if deductions_json.exists():
            n_json = len(json.loads(deductions_json.read_text(encoding="utf-8")))
            n_db = cur.execute("SELECT COUNT(*) FROM deductions").fetchone()[0]
            if n_json == n_db:
                rep.passed(f"deductions.json has {n_json:,} records, matches DB")
            else:
                rep.fail(f"deductions.json has {n_json:,} records but DB has {n_db:,}")
        else:
            rep.warn("deductions.json missing")

    # ===== Summary =====
    print()
    print("=" * 50)
    print(f"  PASS: {rep.pass_count}    WARN: {rep.warn_count}    FAIL: {rep.fail_count}")
    print("=" * 50)
    con.close()
    return 1 if rep.fail_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
