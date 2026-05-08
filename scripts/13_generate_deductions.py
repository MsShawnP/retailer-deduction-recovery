"""Generate the `deductions` table.

The central deduction record. Drives a realistic distribution of:
  - short_ship (correlates with bol_signed_short, pick_pack_mismatch,
    AND non-scannable labels at Walmart/Costco where receiving hand-
    counts and undercounts — the Code 22 perceived-shortage path)
  - label_fine (generic labels at strict retailers — SQEP-style)
  - pallet_fine (low base rate per retailer)
  - damaged (bol_signed_damaged drives most of these)
  - late_delivery (retailer-aware: only when delivery missed window
    AND sampled at late_pct so volume stays realistic)
  - promo_billback (random per retailer; tied to promo activity)
  - vague (Walmart Code 87/99 catch-all; MISC at others; opaque
    descriptions for the "vague/undecodable" feature)

Volume target: $750K-$1.2M annualized (3-5% of $25M wholesale revenue).
Roughly 3,500-5,500 deductions over 18 months.

Deduction date is set 14-45 days after delivery_date (retailer-aware
remittance cadence). dispute_deadline is calculated from
retailer_rules.dispute_window_days where published, NULL otherwise.

Post-audit deductions (is_post_audit=TRUE) are added by a separate
script (17_generate_post_audit_claims.py) — this generator only
produces standard deductions.
"""

from __future__ import annotations

import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "cinderhaven_deductions.db"
SEED = 45

# Per-retailer deduction probability + amount config.
# rates: probability that THIS deduction type fires for an order, given
#   the necessary precondition (e.g., short_ship requires either bol-short,
#   pick/pack mismatch, or non-scannable label at strict retailers).
# Calibrated against $750K-$1.2M annualized volume target.
PROFILES = {
    # short_perceived: extra rate of perceived-shortage deductions when label
    # is non-scannable at strict retailers (Walmart Code 22 driver)
    "walmart": {
        "short_ship_real":         0.85,   # of bol-short or pick-mismatch
        "short_ship_perceived":    0.45,   # of non-scannable-label orders
        "label_fine":              0.20,   # of generic-label orders (sampled)
        "pallet_fine":             0.04,
        "damaged":                 0.85,   # of bol-damaged
        "late_delivery_window":    0.55,   # of orders that missed window
        "promo_billback":          0.06,
        "vague":                   0.03,
        "remittance_lag":          (28, 42),
    },
    "costco": {
        "short_ship_real":         0.80,
        "short_ship_perceived":    0.30,
        "label_fine":              0.15,
        "pallet_fine":             0.06,
        "damaged":                 0.85,
        "late_delivery_window":    0.50,
        "promo_billback":          0.04,
        "vague":                   0.03,
        "remittance_lag":          (30, 45),
    },
    "whole_foods": {
        "short_ship_real":         0.65,
        "short_ship_perceived":    0.0,    # not strict-label
        "label_fine":              0.05,
        "pallet_fine":             0.02,
        "damaged":                 0.70,
        "late_delivery_window":    0.30,
        "promo_billback":          0.05,
        "vague":                   0.05,
        "remittance_lag":          (21, 35)
    },
    "unfi": {
        "short_ship_real":         0.70,
        "short_ship_perceived":    0.0,
        "label_fine":              0.05,
        "pallet_fine":             0.02,
        "damaged":                 0.65,
        "late_delivery_window":    0.30,
        "promo_billback":          0.10,   # MCB-heavy
        "vague":                   0.06,
        "remittance_lag":          (7, 21),  # weekly cadence
    },
    "kehe": {
        "short_ship_real":         0.85,   # 48hr UDR locks fast
        "short_ship_perceived":    0.0,
        "label_fine":              0.06,
        "pallet_fine":             0.02,
        "damaged":                 0.80,
        "late_delivery_window":    0.30,
        "promo_billback":          0.10,
        "vague":                   0.06,
        "remittance_lag":          (10, 21),  # biweekly
    },
    "southside_grocers": {
        "short_ship_real":         0.55,
        "short_ship_perceived":    0.0,
        "label_fine":              0.03,
        "pallet_fine":             0.01,
        "damaged":                 0.55,
        "late_delivery_window":    0.20,
        "promo_billback":          0.04,
        "vague":                   0.04,
        "remittance_lag":          (21, 40),
    },
    "green_basket_market": {
        "short_ship_real":         0.55,
        "short_ship_perceived":    0.0,
        "label_fine":              0.03,
        "pallet_fine":             0.01,
        "damaged":                 0.55,
        "late_delivery_window":    0.25,
        "promo_billback":          0.10,   # Free Fill / Fair Share
        "vague":                   0.05,
        "remittance_lag":          (21, 40),
    },
    "prairie_provisions": {
        "short_ship_real":         0.55,
        "short_ship_perceived":    0.0,
        "label_fine":              0.03,
        "pallet_fine":             0.01,
        "damaged":                 0.55,
        "late_delivery_window":    0.25,
        "promo_billback":          0.04,
        "vague":                   0.04,
        "remittance_lag":          (21, 40),
    },
    "mountain_pantry_co": {
        "short_ship_real":         0.55,
        "short_ship_perceived":    0.0,
        "label_fine":              0.03,
        "pallet_fine":             0.01,
        "damaged":                 0.55,
        "late_delivery_window":    0.25,
        "promo_billback":          0.04,
        "vague":                   0.04,
        "remittance_lag":          (21, 40),
    },
    "harbor_fresh": {
        "short_ship_real":         0.50,
        "short_ship_perceived":    0.0,
        "label_fine":              0.03,
        "pallet_fine":             0.01,
        "damaged":                 0.50,
        "late_delivery_window":    0.20,
        "promo_billback":          0.04,
        "vague":                   0.04,
        "remittance_lag":          (21, 40),
    },
}

# Vague deduction descriptions that read like real remittance lines —
# the "Code 99 / promo -$X with no PO reference" reality.
VAGUE_TEMPLATES = [
    "Code {code}: {label}",
    "Promo allowance",
    "Marketing chargeback",
    "Audit adjustment",
    "Misc deduction — see invoice",
    "Cash discount take-down",
    "Slotting reconciliation",
    "Trade spend true-up",
    "Allowance reconciliation",
    "Compliance fee",
]


def code_id_for(retailer_id: str, deduction_type: str, codes_by_retailer: dict) -> tuple[str | None, str]:
    """Pick a code_id and return (code_id, code_as_remitted)."""
    matches = [
        (cid, code) for (cid, code, dt) in codes_by_retailer.get(retailer_id, [])
        if dt == deduction_type
    ]
    if not matches:
        return None, ""
    cid, code = matches[0]
    return cid, code


def short_ship_amount(rng: random.Random, units_short: int, line_value_avg: float) -> float:
    """Dollar value of short ship — recoup of unsupplied units."""
    base = units_short * line_value_avg * rng.uniform(0.9, 1.05)
    return round(max(75.0, base), 2)


def label_fine_amount(rng: random.Random, retailer_id: str, total_units: int) -> float:
    """Walmart SQEP Phase 2: $200 admin + $1/case. Other retailers smaller."""
    if retailer_id == "walmart":
        return round(200.0 + total_units * rng.uniform(0.8, 1.2), 2)
    if retailer_id == "costco":
        return round(rng.uniform(50.0, 150.0) * max(1, total_units // 100), 2)
    return round(rng.uniform(75.0, 250.0), 2)


def pallet_fine_amount(rng: random.Random, retailer_id: str, pallets: int) -> float:
    if retailer_id == "walmart":
        return round(200.0 + pallets * rng.uniform(3.5, 4.5), 2)
    return round(rng.uniform(80.0, 220.0), 2)


def damaged_amount(rng: random.Random, total_value: float) -> float:
    """Damage refund — small percentage of order value (5-15%)."""
    return round(total_value * rng.uniform(0.05, 0.15), 2)


def late_amount(rng: random.Random, retailer_id: str, total_value: float) -> float:
    """Late-delivery / OTIF fines."""
    if retailer_id == "walmart":
        # Walmart OTIF: 3% of COGS (approximate as 3% of wholesale)
        return round(total_value * 0.03, 2)
    if retailer_id == "unfi":
        # UNFI flat fines: $250 late, $500 no-show
        return round(rng.choice([250.0, 250.0, 500.0]), 2)
    return round(total_value * rng.uniform(0.015, 0.03), 2)


def promo_amount(rng: random.Random, total_value: float) -> float:
    """Promo billback — 5-15% of order value."""
    return round(total_value * rng.uniform(0.05, 0.15), 2)


def vague_amount(rng: random.Random) -> float:
    """Vague deductions span small fees to mystery big-tickets."""
    if rng.random() < 0.6:
        return round(rng.uniform(50.0, 600.0), 2)
    return round(rng.uniform(800.0, 4500.0), 2)


def deduction_date_for(rng: random.Random, delivery_date: date, lag_range: tuple[int, int]) -> date:
    return delivery_date + timedelta(days=rng.randint(*lag_range))


def main() -> None:
    rng = random.Random(SEED)
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}")

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    cur.execute("DELETE FROM deductions")

    # Lookup tables
    codes_by_retailer: dict[str, list[tuple[str, str, str]]] = {}
    for cid, rid, code, dt in cur.execute(
        "SELECT code_id, retailer_id, code, deduction_type FROM deduction_codes"
    ).fetchall():
        codes_by_retailer.setdefault(rid, []).append((cid, code, dt))

    rules = {
        (rid, dt): (window, evidence)
        for rid, dt, window, evidence in cur.execute(
            "SELECT retailer_id, deduction_type, dispute_window_days, evidence_required FROM retailer_rules"
        ).fetchall()
    }

    # Pull denormalized order/shipment/pack data — one query, in-memory join
    rows = cur.execute("""
        SELECT
            o.order_id, o.retailer_id, o.total_units, o.total_value,
            o.requested_delivery_window_end,
            s.shipment_id, s.delivery_date, s.units_shipped,
            s.bol_signed_short, s.bol_signed_damaged, s.pallets_shipped,
            p.units_picked, p.units_packed, p.units_pick_pack_match,
            p.label_type_used, p.label_scannable
        FROM orders o
        JOIN shipments s ON s.order_id = o.order_id
        JOIN pack_records p ON p.order_id = o.order_id
    """).fetchall()

    deductions = []
    seq = 0
    counters = {k: 0 for k in (
        "short_ship", "label_fine", "pallet_fine", "damaged",
        "late_delivery", "promo_billback", "vague",
    )}

    def add_deduction(retailer_id, dt, order_id, shipment_id, amount,
                      code_id, code_remitted, description,
                      deduction_dt, is_vague=0):
        nonlocal seq
        seq += 1
        deduction_id = f"DED-{seq:07d}"
        window = rules.get((retailer_id, dt), (None, None))[0]
        deadline = (deduction_dt + timedelta(days=window)).isoformat() if window else None
        deductions.append((
            deduction_id, retailer_id, order_id, shipment_id, dt,
            code_id, code_remitted, description,
            amount, deduction_dt.isoformat(), deadline,
            is_vague, 0,  # is_post_audit
            None,  # remittance_id — populated later
        ))
        counters[dt] += 1

    for row in rows:
        (order_id, retailer_id, total_units, total_value,
         window_end_str,
         shipment_id, delivery_date_str, units_shipped,
         bol_short, bol_damaged, pallets,
         units_picked, units_packed, pick_pack_match,
         label_type, label_scannable) = row

        profile = PROFILES.get(retailer_id)
        if not profile:
            continue
        delivery_date = date.fromisoformat(delivery_date_str)
        window_end = date.fromisoformat(window_end_str) if window_end_str else None
        ded_dt = deduction_date_for(rng, delivery_date, profile["remittance_lag"])
        line_value_avg = total_value / max(1, total_units)

        # 1. SHORT SHIP — real (bol-short OR pick-mismatch)
        units_short = max(0, units_packed - units_shipped) + max(0, units_picked - units_packed)
        if (bol_short or not pick_pack_match) and rng.random() < profile["short_ship_real"]:
            cid, code = code_id_for(retailer_id, "short_ship", codes_by_retailer)
            amt = short_ship_amount(rng, max(units_short, 1), line_value_avg)
            add_deduction(retailer_id, "short_ship", order_id, shipment_id,
                          amt, cid, code,
                          f"Short ship: {units_short or 'qty'} units missing",
                          ded_dt)

        # 1b. SHORT SHIP — perceived (non-scannable label causes hand-count undercount)
        elif (label_scannable == 0 and rng.random() < profile["short_ship_perceived"]):
            cid, code = code_id_for(retailer_id, "short_ship", codes_by_retailer)
            phantom_short = rng.randint(2, max(3, total_units // 20))
            amt = short_ship_amount(rng, phantom_short, line_value_avg)
            add_deduction(retailer_id, "short_ship", order_id, shipment_id,
                          amt, cid, code,
                          f"Short ship: receiving hand-count {phantom_short} units short",
                          ded_dt)

        # 2. LABEL FINE — generic at strict retailer, sampled
        if label_type == "generic" and rng.random() < profile["label_fine"]:
            cid, code = code_id_for(retailer_id, "label_fine", codes_by_retailer)
            amt = label_fine_amount(rng, retailer_id, total_units)
            add_deduction(retailer_id, "label_fine", order_id, shipment_id,
                          amt, cid, code,
                          "Label noncompliance — generic label not retailer-spec",
                          ded_dt)

        # 3. PALLET FINE
        if rng.random() < profile["pallet_fine"]:
            cid, code = code_id_for(retailer_id, "pallet_fine", codes_by_retailer)
            amt = pallet_fine_amount(rng, retailer_id, pallets or 1)
            add_deduction(retailer_id, "pallet_fine", order_id, shipment_id,
                          amt, cid, code, "Pallet noncompliance", ded_dt)

        # 4. DAMAGED
        if bol_damaged and rng.random() < profile["damaged"]:
            cid, code = code_id_for(retailer_id, "damaged", codes_by_retailer)
            amt = damaged_amount(rng, total_value)
            add_deduction(retailer_id, "damaged", order_id, shipment_id,
                          amt, cid, code,
                          "Damage at receiving — BOL signed damaged",
                          ded_dt)

        # 5. LATE DELIVERY — must miss window AND be sampled
        if window_end and delivery_date > window_end:
            if rng.random() < profile["late_delivery_window"]:
                cid, code = code_id_for(retailer_id, "late_delivery", codes_by_retailer)
                amt = late_amount(rng, retailer_id, total_value)
                days_late = (delivery_date - window_end).days
                add_deduction(retailer_id, "late_delivery", order_id, shipment_id,
                              amt, cid, code,
                              f"Late delivery — {days_late} days past window",
                              ded_dt)

        # 6. PROMO BILLBACK
        if rng.random() < profile["promo_billback"]:
            cid, code = code_id_for(retailer_id, "promo_billback", codes_by_retailer)
            amt = promo_amount(rng, total_value)
            add_deduction(retailer_id, "promo_billback", order_id, shipment_id,
                          amt, cid, code,
                          "Promo billback (MCB / scan-down)",
                          ded_dt)

        # 7. VAGUE — small base rate, opaque description, often no order linkage
        if rng.random() < profile["vague"]:
            cid, code = code_id_for(retailer_id, "vague", codes_by_retailer)
            amt = vague_amount(rng)
            template = rng.choice(VAGUE_TEMPLATES)
            description = template.format(code=rng.randint(85, 99), label="Other")
            # 30% of vague deductions have no order_id link (real remittances)
            link_order = order_id if rng.random() > 0.30 else None
            link_shipment = shipment_id if link_order else None
            add_deduction(retailer_id, "vague", link_order, link_shipment,
                          amt, cid, code, description, ded_dt, is_vague=1)

    cur.executemany("""
        INSERT INTO deductions (
            deduction_id, retailer_id, order_id, shipment_id, deduction_type,
            code_id, code_as_remitted, remittance_description,
            amount, deduction_date, dispute_deadline,
            is_vague, is_post_audit, remittance_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, deductions)
    con.commit()

    # Summary
    n = len(deductions)
    total = sum(d[8] for d in deductions)
    months = 18
    annualized = total * 12 / months

    print(f"Inserted {n:,} deductions.")
    print(f"Total deduction value: ${total:,.0f}")
    print(f"Annualized:            ${annualized:,.0f}  (target $750K-$1.2M)")
    print()
    print("By type:")
    type_amounts: dict[str, float] = {}
    for d in deductions:
        type_amounts[d[4]] = type_amounts.get(d[4], 0.0) + d[8]
    for dt, count in sorted(counters.items(), key=lambda x: -x[1]):
        amt = type_amounts.get(dt, 0)
        print(f"  {dt:<16} {count:>5,}  ${amt:>10,.0f}")
    print()
    print("By retailer:")
    by_ret_count: dict[str, int] = {}
    by_ret_amt: dict[str, float] = {}
    for d in deductions:
        by_ret_count[d[1]] = by_ret_count.get(d[1], 0) + 1
        by_ret_amt[d[1]] = by_ret_amt.get(d[1], 0.0) + d[8]
    for slug in PROFILES:
        c = by_ret_count.get(slug, 0)
        a = by_ret_amt.get(slug, 0)
        print(f"  {slug:<22} {c:>5,}  ${a:>10,.0f}")

    # Sanity: vague + post-audit visibility
    vague_n = sum(1 for d in deductions if d[11])
    no_order = sum(1 for d in deductions if d[2] is None)
    print(f"\nVague deductions:   {vague_n:,}")
    print(f"With no PO link:    {no_order:,} ({no_order/n:.1%})")

    con.close()


if __name__ == "__main__":
    main()
