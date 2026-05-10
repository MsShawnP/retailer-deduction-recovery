"""Generate the `evidence_documents` table.

Document-level evidence inventory per deduction. Each deduction gets 3-8
evidence document records representing the actual state of Cinderhaven's
documentation for that transaction.

Key Cinderhaven realities encoded:
  - BOLs: ~60% unsigned. Filed by date, not PO.
  - PODs: ~70% expired by dispute time. Carrier deletes after 90 days.
  - Tracking-to-PO link: handwritten with ~15% error rate.
  - Packing slips: handwritten, no case counts, not linked to PO.
  - Label scans: don't exist (one generic label).
  - Pallet photos: ~10% of shipments, phone camera roll.
  - Deal sheets: in buyer rep's email, not centralized.
  - Carrier inspections: never requested.
"""

from __future__ import annotations

import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "cinderhaven_deductions.db"
SEED = 48

TODAY = date(2026, 5, 31)

DOCUMENT_TYPES_BY_DEDUCTION = {
    "short_ship":          ["signed_bol", "unsigned_bol", "signed_pod", "packing_list", "asn_edi_856", "carrier_tracking"],
    "label_fine":          ["label_scan", "packing_list", "purchase_order"],
    "pallet_fine":         ["pallet_photo", "packing_list", "signed_bol"],
    "damaged":             ["signed_bol", "pallet_photo", "carrier_inspection", "carrier_tracking"],
    "late_delivery":       ["signed_pod", "carrier_tracking", "asn_edi_856"],
    "promo_billback":      ["deal_sheet", "purchase_order", "invoice", "email_correspondence"],
    "vague":               ["remittance_advice", "purchase_order", "email_correspondence"],
    "early_delivery":      ["signed_pod", "carrier_tracking", "purchase_order"],
    "freight_routing":     ["signed_bol", "carrier_tracking", "weight_ticket", "invoice"],
    "warehouse_spoils":    ["signed_bol", "temperature_log", "packing_list", "purchase_order"],
    "store_spoils":        ["signed_bol", "temperature_log", "purchase_order", "email_correspondence"],
    "pricing_invoice":     ["purchase_order", "invoice", "email_correspondence"],
    "returns_unsaleables": ["signed_bol", "pallet_photo", "purchase_order", "email_correspondence"],
    "duplicate_deduction": ["remittance_advice", "purchase_order"],
    "wrong_brand":         ["remittance_advice", "purchase_order", "invoice"],
    "placement_fees":      ["deal_sheet", "purchase_order", "email_correspondence"],
}

CARRIER_POD_RETENTION_DAYS = 90


def document_status_and_details(
    rng: random.Random,
    doc_type: str,
    deduction_date: date,
    ship_date: date | None,
    has_bol_signed: bool,
    has_pod: bool,
    has_asn: bool,
    evidence_format: str | None,
) -> tuple[str, str | None, str | None, int, int | None, str | None, int]:
    """Return (status, format, location, has_metadata, retrieval_minutes, expires_at, is_expired)."""

    if doc_type == "signed_bol":
        if has_bol_signed:
            return ("exists_ready", "handwritten_paper", "filing_cabinet", 0,
                    rng.randint(30, 120), None, 0)
        if rng.random() < 0.40:
            return ("exists_not_ready", "handwritten_paper", "filing_cabinet", 0,
                    rng.randint(60, 240), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "unsigned_bol":
        if rng.random() < 0.60:
            return ("exists_ready", "handwritten_paper", "filing_cabinet", 0,
                    rng.randint(20, 90), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "signed_pod":
        if has_pod:
            days_since_ship = (TODAY - (ship_date or deduction_date)).days
            if days_since_ship > CARRIER_POD_RETENTION_DAYS:
                expires_at = ((ship_date or deduction_date) + timedelta(days=CARRIER_POD_RETENTION_DAYS)).isoformat()
                return ("expired", "system_export", "carrier_portal", 1,
                        None, expires_at, 1)
            return ("exists_ready", "system_export", "carrier_portal", 1,
                    rng.randint(5, 20), None, 0)
        if rng.random() < 0.70:
            expires_at = ((ship_date or deduction_date) + timedelta(days=CARRIER_POD_RETENTION_DAYS)).isoformat()
            return ("expired", None, "carrier_portal", 0, None, expires_at, 1)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "purchase_order":
        if rng.random() < 0.85:
            return ("exists_ready", "edi_transaction", "erp", 1,
                    rng.randint(3, 10), None, 0)
        return ("exists_not_ready", "edi_transaction", "erp", 0,
                rng.randint(15, 45), None, 0)

    if doc_type == "invoice":
        if rng.random() < 0.90:
            return ("exists_ready", "system_export", "erp", 1,
                    rng.randint(3, 10), None, 0)
        return ("exists_not_ready", "system_export", "erp", 0,
                rng.randint(10, 30), None, 0)

    if doc_type == "asn_edi_856":
        if has_asn:
            return ("exists_ready", "edi_transaction", "erp", 1,
                    rng.randint(3, 8), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "packing_list":
        if evidence_format == "digital":
            return ("exists_ready", "system_export", "erp", 1,
                    rng.randint(5, 15), None, 0)
        if evidence_format == "paper_note":
            if rng.random() < 0.15:
                return ("exists_not_ready", "handwritten_paper", "personal_desk", 0,
                        rng.randint(60, 240), None, 0)
            return ("exists_not_ready", "handwritten_paper", "filing_cabinet", 0,
                    rng.randint(30, 120), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "handwritten_packing_slip":
        if evidence_format == "paper_note":
            return ("exists_not_ready", "handwritten_paper", "filing_cabinet", 0,
                    rng.randint(30, 120), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "label_scan":
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "pallet_photo":
        if rng.random() < 0.10:
            return ("exists_not_ready", "phone_photo", "personal_phone", 0,
                    rng.randint(15, 60), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "carrier_tracking":
        days_since = (TODAY - (ship_date or deduction_date)).days
        if days_since > 180:
            return ("expired", "system_export", "carrier_portal", 1,
                    None, ((ship_date or deduction_date) + timedelta(days=180)).isoformat(), 1)
        if rng.random() < 0.75:
            return ("exists_ready", "system_export", "carrier_portal", 1,
                    rng.randint(5, 15), None, 0)
        return ("exists_not_ready", "system_export", "carrier_portal", 0,
                rng.randint(20, 45), None, 0)

    if doc_type == "weight_ticket":
        if rng.random() < 0.20:
            return ("exists_not_ready", "handwritten_paper", "filing_cabinet", 0,
                    rng.randint(30, 90), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "deal_sheet":
        if rng.random() < 0.35:
            return ("exists_not_ready", "email", "email_archive", 0,
                    rng.randint(30, 120), None, 0)
        return ("never_captured", None, "email_archive", 0, None, None, 0)

    if doc_type == "temperature_log":
        if rng.random() < 0.15:
            return ("exists_not_ready", "handwritten_paper", "filing_cabinet", 0,
                    rng.randint(45, 180), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "carrier_inspection":
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "retailer_portal_screenshot":
        if rng.random() < 0.30:
            return ("exists_ready", "digital_photo", "shared_drive", 1,
                    rng.randint(5, 20), None, 0)
        return ("never_captured", None, None, 0, None, None, 0)

    if doc_type == "remittance_advice":
        if rng.random() < 0.80:
            return ("exists_ready", "system_export", "erp", 1,
                    rng.randint(5, 15), None, 0)
        return ("exists_not_ready", "email", "email_archive", 0,
                rng.randint(15, 45), None, 0)

    if doc_type == "email_correspondence":
        if rng.random() < 0.40:
            return ("exists_not_ready", "email", "email_archive", 0,
                    rng.randint(20, 90), None, 0)
        return ("never_captured", None, "email_archive", 0, None, None, 0)

    return ("never_captured", None, None, 0, None, None, 0)


def main() -> None:
    rng = random.Random(SEED)
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}")

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    cur.execute("DELETE FROM evidence_documents")

    rows = cur.execute("""
        SELECT
            d.deduction_id, d.deduction_type, d.deduction_date, d.order_id,
            s.ship_date, s.bol_signed, s.pod_received, s.asn_sent,
            p.evidence_format
        FROM deductions d
        LEFT JOIN shipments s ON s.shipment_id = d.shipment_id
        LEFT JOIN pack_records p ON p.order_id = d.order_id
    """).fetchall()

    documents = []
    status_counts = {"exists_ready": 0, "exists_not_ready": 0, "expired": 0, "never_captured": 0}

    for row in rows:
        (deduction_id, deduction_type, ded_date_str, order_id,
         ship_date_str, bol_signed, pod_received, asn_sent,
         evidence_format) = row

        ded_date = date.fromisoformat(ded_date_str)
        ship_date = date.fromisoformat(ship_date_str) if ship_date_str else None

        doc_types = DOCUMENT_TYPES_BY_DEDUCTION.get(deduction_type, [])

        for doc_type in doc_types:
            status, fmt, location, has_meta, retrieval_min, expires_at, is_expired = \
                document_status_and_details(
                    rng, doc_type, ded_date, ship_date,
                    bool(bol_signed), bool(pod_received), bool(asn_sent),
                    evidence_format,
                )
            documents.append((
                deduction_id, doc_type, status, fmt, location,
                has_meta, retrieval_min, expires_at, is_expired,
            ))
            status_counts[status] += 1

    cur.executemany("""
        INSERT INTO evidence_documents (
            deduction_id, document_type, status, format, location,
            has_required_metadata, retrieval_minutes, expires_at, is_expired
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, documents)
    con.commit()

    n = len(documents)
    print(f"Inserted {n:,} evidence_documents rows.")
    print(f"  Across {len(rows):,} deductions (avg {n/len(rows):.1f} docs/deduction).")
    print()
    print("Status distribution:")
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"  {status:<18} {count:>6,}  ({count/n:.1%})")

    expired_n = sum(1 for d in documents if d[8])
    ready_n = status_counts["exists_ready"]
    print(f"\nReady for dispute:  {ready_n:,} ({ready_n/n:.1%})")
    print(f"Expired/lost:       {expired_n + status_counts['never_captured']:,} "
          f"({(expired_n + status_counts['never_captured'])/n:.1%})")

    con.close()


if __name__ == "__main__":
    main()
