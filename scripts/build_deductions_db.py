"""Build the deduction-extended SQLite database.

Pipeline:
  0. Copy the base cinderhaven_product_master.db (built by the
     cinderhaven-data repo) into ./data/cinderhaven_deductions.db.
     This isolates our extensions from the base.
  1. Apply seed_deduction_schema.sql — DDL for the 13 new tables.
  2. Apply seed_deduction_static.sql — retailers, retailer_rules,
     deduction_codes, edi_requirements.
  3. Run dynamic generators in dependency order via subprocess.

Usage:
  python scripts/build_deductions_db.py             # build if missing, schema+seeds only
  python scripts/build_deductions_db.py --force     # rebuild fresh, schema+seeds only
  python scripts/build_deductions_db.py --full      # also run all dynamic generators

Expects the base repo at `../cinderhaven-data/` (sibling of this repo).
"""

from __future__ import annotations

import argparse
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
DATA = ROOT / "data"

BASE_DB = ROOT.parent / "cinderhaven-data" / "data" / "cinderhaven_product_master.db"
TARGET_DB = DATA / "cinderhaven_deductions.db"

SCHEMA_SQL = SCRIPTS / "seed_deduction_schema.sql"
STATIC_SQL = SCRIPTS / "seed_deduction_static.sql"

# Dynamic generators in dependency order. post_audit_claims runs before
# remittances/disputes so those scripts pick up post-audit deductions too.
DYNAMIC_PIPELINE = [
    "10_generate_orders.py",
    "11_generate_pack_records.py",
    "12_generate_shipments.py",
    "13_generate_deductions.py",
    "13b_generate_post_audit_claims.py",
    "14_generate_remittances.py",
    "15_generate_disputes.py",
]


def ensure_base_db_exists() -> None:
    if not BASE_DB.exists():
        sys.exit(
            f"Base database not found at {BASE_DB}.\n"
            f"Clone https://github.com/MsShawnP/cinderhaven-data as a "
            f"sibling and run `python scripts/build_db.py` there first."
        )


def copy_base_db() -> None:
    DATA.mkdir(exist_ok=True)
    if TARGET_DB.exists():
        TARGET_DB.unlink()
    shutil.copy2(BASE_DB, TARGET_DB)
    print(f"  [OK] Copied base DB to {TARGET_DB} ({TARGET_DB.stat().st_size / 1_048_576:.1f} MB)")


def apply_sql(con: sqlite3.Connection, sql_path: Path, label: str) -> None:
    sql = sql_path.read_text(encoding="utf-8")
    con.executescript(sql)
    con.commit()
    print(f"  [OK] Applied {label}")


def report(con: sqlite3.Connection) -> None:
    cur = con.cursor()
    new_tables = [
        "retailers", "retailer_rules", "deduction_codes",
        "orders", "order_lines", "shipments", "pack_records",
        "remittances", "deductions", "disputes", "dispute_evidence",
        "edi_requirements", "post_audit_claims",
    ]
    print("\nNew table row counts:")
    for t in new_tables:
        n = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  {t:<22} {n:>6,}")

    print("\nBase tables (untouched, sanity check):")
    for t in ["product_master", "stores", "distribution_log", "chargebacks"]:
        n = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  {t:<22} {n:>6,}")


def run_generator(name: str) -> None:
    script = SCRIPTS / name
    if not script.exists():
        sys.exit(f"Generator script not found: {script}")
    print(f"\n--> Running {name}")
    res = subprocess.run([sys.executable, str(script)], cwd=ROOT)
    if res.returncode != 0:
        sys.exit(f"Generator {name} failed (exit {res.returncode}).")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true",
                        help="Rebuild target DB from base even if it exists")
    parser.add_argument("--full", action="store_true",
                        help="Also run all dynamic generators after schema + seeds")
    args = parser.parse_args()

    ensure_base_db_exists()

    if TARGET_DB.exists() and not args.force and not args.full:
        print(f"Target DB already exists at {TARGET_DB}. Use --force to rebuild "
              "or --full to keep schema and (re)run dynamic generators.")
        return

    if not TARGET_DB.exists() or args.force:
        print("Building cinderhaven_deductions.db...")
        print("Step 0: copy base DB")
        copy_base_db()

        con = sqlite3.connect(TARGET_DB)
        try:
            print("Step 1: schema DDL")
            apply_sql(con, SCHEMA_SQL, "seed_deduction_schema.sql")

            print("Step 2: static seeds")
            apply_sql(con, STATIC_SQL, "seed_deduction_static.sql")
        finally:
            con.close()

    if args.full:
        print("\nStep 3: dynamic generators")
        for name in DYNAMIC_PIPELINE:
            run_generator(name)

    con = sqlite3.connect(TARGET_DB)
    try:
        report(con)
    finally:
        con.close()

    print(f"\nBuild complete. {TARGET_DB.name} at {TARGET_DB.parent}.")


if __name__ == "__main__":
    main()
