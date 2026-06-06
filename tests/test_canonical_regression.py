"""Cinderhaven canonical data regression tests for retailer-deduction-recovery.

Verifies the baked data artifacts (SQLite + exported JSON) match the
Cinderhaven data contract.

Canonical contract (target):
    - 50 SKUs, 5 product lines, 6 retailers
    - Retailers: Walmart, Costco, Whole Foods, Sprouts, Kroger, Regional Group

Current state (this repo):
    - 90 SKUs across 3 product lines (shared product_master from velocity tool).
    - 9 trade partners in summary JSON (6 retailers + 3 distributors).
    - ~$1.65M deduction backlog.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "cinderhaven_deductions.db"
JSON_DIR = ROOT / "frontend" / "public" / "json"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db():
    """Read-only connection to the baked SQLite artifact."""
    assert DB_PATH.exists(), f"Baked data artifact not found: {DB_PATH}"
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    yield conn
    conn.close()


@pytest.fixture(scope="module")
def summary():
    return json.loads((JSON_DIR / "summary.json").read_text())


@pytest.fixture(scope="module")
def retailers_json():
    return json.loads((JSON_DIR / "retailers.json").read_text())


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCinderhavenCanonicalRegression:
    """Guard-rails for the baked Cinderhaven deduction dataset."""

    # -- Data files --------------------------------------------------------

    def test_data_files_exist(self):
        assert DB_PATH.exists(), "SQLite database missing"
        for name in ("summary.json", "retailers.json", "deductions.json"):
            assert (JSON_DIR / name).exists(), f"JSON file missing: {name}"

    # -- Backlog total -----------------------------------------------------

    def test_backlog_total_1_65m(self, summary):
        """Total deduction backlog should be ~$1.65M."""
        total = summary["totals"]["deductions_dollar"]
        assert 1_600_000 < total < 1_700_000, (
            f"Backlog ${total:,.0f} outside $1.6M-$1.7M range"
        )

    # -- Product lines (from SQLite) --------------------------------------

    def test_product_line_count(self, db):
        """Current dataset has 3 product lines.  TODO: expand to canonical 5."""
        (count,) = db.execute(
            "SELECT COUNT(DISTINCT product_line) FROM product_master"
        ).fetchone()
        assert count == 3, f"Expected 3 product lines, got {count}"

    def test_product_line_names(self, db):
        rows = db.execute(
            "SELECT DISTINCT product_line FROM product_master ORDER BY product_line"
        ).fetchall()
        names = {r[0] for r in rows}
        expected = {"Artisan Sauces", "Specialty Condiments", "Pantry Staples"}
        assert names == expected, f"Product line mismatch: {names}"

    # -- Retailers (from JSON summary) ------------------------------------

    def test_retailer_count_in_summary(self, summary):
        """9 trade partners in the summary: 6 retailers + 3 distributors."""
        count = len(summary["by_retailer"])
        assert count == 9, f"Expected 9 trade partners, got {count}"

    def test_canonical_retailers_present(self, summary):
        """All 6 canonical retailers must appear."""
        names = {r["name"] for r in summary["by_retailer"]}
        for retailer in ("Walmart", "Costco", "Whole Foods", "Sprouts", "Kroger", "Regional Group"):
            assert retailer in names, f"Canonical retailer {retailer!r} missing"

    # -- Retailers (from JSON detail) -------------------------------------

    def test_retailer_detail_file_count(self, retailers_json):
        """retailers.json should have 5 retailer entries (Costco, Kroger, Regional, Sprouts, Walmart, Whole Foods)."""
        retailer_names = {v["name"] for v in retailers_json.values() if v["channel_type"] == "retailer"}
        expected = {"Walmart", "Costco", "Whole Foods", "Sprouts", "Kroger", "Regional Group"}
        assert retailer_names == expected, f"Retailer detail mismatch: {retailer_names}"

    # -- Deduction types ---------------------------------------------------

    def test_deduction_type_count(self, summary):
        """9 deduction types in the by_type breakdown."""
        count = len(summary["by_type"])
        assert count == 9, f"Expected 9 deduction types, got {count}"

    # -- SQLite table existence --------------------------------------------

    def test_critical_tables_exist(self, db):
        rows = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        tables = {r[0] for r in rows}
        required = {
            "product_master", "retailers", "deductions", "disputes",
            "orders", "shipments", "remittances",
        }
        missing = required - tables
        assert not missing, f"Missing tables: {missing}"
