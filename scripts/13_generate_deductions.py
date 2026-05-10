"""Generate the `deductions` table.

16-type taxonomy (expanded from 9). Types 1-7 are the original operational
types; 8-12 are new operational types; 13 is mixed; 14-15 are retailer
errors; 16 is a planning failure.

Volume target: ~$1.5M over 20 months (~6% of $25M revenue, center of
SPS Commerce 5-7% benchmark). Roughly 2,800-3,300 standard deductions
plus periodic non-order events.

Root cause mapping:
  Types 1-12: Cinderhaven internal process failures
  Type 13 (returns_unsaleables): mixed — some legitimate, some overstated
  Types 14-15 (duplicate_deduction, wrong_brand): retailer_error
  Type 16 (placement_fees): forecasting/planning failure
"""

from __future__ import annotations

import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "cinderhaven_deductions.db"
SEED = 45

ALL_TYPES = [
    "short_ship", "label_fine", "pallet_fine", "damaged",
    "late_delivery", "promo_billback", "vague",
    "early_delivery", "freight_routing", "warehouse_spoils",
    "store_spoils", "pricing_invoice", "returns_unsaleables",
    "duplicate_deduction", "wrong_brand", "placement_fees",
]

# Global probability multiplier. Applied to all per-order generation rates
# to control total volume without distorting type mix. 0.80 → ~20% fewer
# deductions, landing at ~$1.5M total (6% of $25M revenue).
VOLUME_SCALE = 0.80

PROFILES = {
    "walmart": {
        "short_ship_real":         0.85,
        "short_ship_perceived":    0.45,
        "label_fine":              0.20,
        "pallet_fine":             0.04,
        "damaged":                 0.85,
        "late_delivery_window":    0.55,
        "promo_billback":          0.06,
        "vague":                   0.03,
        "early_delivery":          0.12,
        "freight_routing":         0.04,
        "warehouse_spoils":        0.018,
        "store_spoils":            0.012,
        "pricing_invoice":         0.03,
        "returns_unsaleables":     0.02,
        "duplicate_deduction":     0.008,
        "wrong_brand":             0.005,
        "placement_events":        3,
        "placement_amount_range":  (5500, 13000),
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
        "early_delivery":          0.15,
        "freight_routing":         0.03,
        "warehouse_spoils":        0.020,
        "store_spoils":            0.015,
        "pricing_invoice":         0.025,
        "returns_unsaleables":     0.015,
        "duplicate_deduction":     0.006,
        "wrong_brand":             0.004,
        "placement_events":        3,
        "placement_amount_range":  (8000, 18000),
        "remittance_lag":          (30, 45),
    },
    "whole_foods": {
        "short_ship_real":         0.65,
        "short_ship_perceived":    0.0,
        "label_fine":              0.05,
        "pallet_fine":             0.02,
        "damaged":                 0.70,
        "late_delivery_window":    0.30,
        "promo_billback":          0.05,
        "vague":                   0.05,
        "early_delivery":          0.08,
        "freight_routing":         0.03,
        "warehouse_spoils":        0.025,
        "store_spoils":            0.020,
        "pricing_invoice":         0.035,
        "returns_unsaleables":     0.018,
        "duplicate_deduction":     0.007,
        "wrong_brand":             0.004,
        "placement_events":        4,
        "placement_amount_range":  (3000, 6500),
        "remittance_lag":          (21, 35),
    },
    "unfi": {
        "short_ship_real":         0.70,
        "short_ship_perceived":    0.0,
        "label_fine":              0.05,
        "pallet_fine":             0.02,
        "damaged":                 0.65,
        "late_delivery_window":    0.30,
        "promo_billback":          0.10,
        "vague":                   0.06,
        "early_delivery":          0.06,
        "freight_routing":         0.04,
        "warehouse_spoils":        0.022,
        "store_spoils":            0.015,
        "pricing_invoice":         0.03,
        "returns_unsaleables":     0.020,
        "duplicate_deduction":     0.007,
        "wrong_brand":             0.005,
        "placement_events":        5,
        "placement_amount_range":  (2000, 4500),
        "remittance_lag":          (7, 21),
    },
    "kehe": {
        "short_ship_real":         0.85,
        "short_ship_perceived":    0.0,
        "label_fine":              0.06,
        "pallet_fine":             0.02,
        "damaged":                 0.80,
        "late_delivery_window":    0.30,
        "promo_billback":          0.10,
        "vague":                   0.06,
        "early_delivery":          0.08,
        "freight_routing":         0.04,
        "warehouse_spoils":        0.018,
        "store_spoils":            0.012,
        "pricing_invoice":         0.03,
        "returns_unsaleables":     0.018,
        "duplicate_deduction":     0.008,
        "wrong_brand":             0.005,
        "placement_events":        5,
        "placement_amount_range":  (1500, 3500),
        "remittance_lag":          (10, 21),
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
        "early_delivery":          0.04,
        "freight_routing":         0.02,
        "warehouse_spoils":        0.012,
        "store_spoils":            0.010,
        "pricing_invoice":         0.02,
        "returns_unsaleables":     0.012,
        "duplicate_deduction":     0.005,
        "wrong_brand":             0.003,
        "placement_events":        2,
        "placement_amount_range":  (500, 1300),
        "remittance_lag":          (21, 40),
    },
    "green_basket_market": {
        "short_ship_real":         0.55,
        "short_ship_perceived":    0.0,
        "label_fine":              0.03,
        "pallet_fine":             0.01,
        "damaged":                 0.55,
        "late_delivery_window":    0.25,
        "promo_billback":          0.10,
        "vague":                   0.05,
        "early_delivery":          0.05,
        "freight_routing":         0.02,
        "warehouse_spoils":        0.015,
        "store_spoils":            0.012,
        "pricing_invoice":         0.025,
        "returns_unsaleables":     0.015,
        "duplicate_deduction":     0.006,
        "wrong_brand":             0.004,
        "placement_events":        3,
        "placement_amount_range":  (400, 1100),
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
        "early_delivery":          0.04,
        "freight_routing":         0.02,
        "warehouse_spoils":        0.010,
        "store_spoils":            0.008,
        "pricing_invoice":         0.02,
        "returns_unsaleables":     0.010,
        "duplicate_deduction":     0.005,
        "wrong_brand":             0.003,
        "placement_events":        2,
        "placement_amount_range":  (300, 850),
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
        "early_delivery":          0.04,
        "freight_routing":         0.02,
        "warehouse_spoils":        0.010,
        "store_spoils":            0.008,
        "pricing_invoice":         0.02,
        "returns_unsaleables":     0.010,
        "duplicate_deduction":     0.005,
        "wrong_brand":             0.003,
        "placement_events":        2,
        "placement_amount_range":  (300, 850),
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
        "early_delivery":          0.04,
        "freight_routing":         0.02,
        "warehouse_spoils":        0.010,
        "store_spoils":            0.008,
        "pricing_invoice":         0.02,
        "returns_unsaleables":     0.010,
        "duplicate_deduction":     0.004,
        "wrong_brand":             0.003,
        "placement_events":        2,
        "placement_amount_range":  (300, 850),
        "remittance_lag":          (21, 40),
    },
}

WAREHOUSE_SPOILS_TEMPLATES = [
    "Warehouse spoilage — product expired in DC before pull",
    "Warehouse spoilage — shelf-life agreement violation",
    "Warehouse spoilage — oversized PO vs actual sell-through",
    "Warehouse spoilage — slow-turn SKU past code date",
]

STORE_SPOILS_TEMPLATES = [
    "Store spoilage — expired at retail, velocity mismatch",
    "Store spoilage — wrong stores for this SKU's turns",
    "Store spoilage — insufficient velocity vs shelf-life",
    "Store spoilage — seasonal overstock past season",
]

PLACEMENT_TEMPLATES = [
    "New-item slotting fee — placement allowance",
    "Planogram reset — placement billback",
    "Shelf placement / new-item program",
    "Category-reset placement billback",
]

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

FREIGHT_TEMPLATES = [
    "Freight routing noncompliance — wrong carrier",
    "Collect vs prepaid confusion — freight deduction",
    "Accessorial charges — liftgate / residential",
    "Routing guide violation — unapproved lane",
]

PRICING_TEMPLATES = [
    "Pricing error — old cost loaded on PO",
    "Invoice mismatch — new cost not updated in system",
    "Off-invoice allowance mismatch",
    "Item setup error — wrong UPC/cost mapping",
]

RETURNS_TEMPLATES = [
    "Customer return — defective product claim",
    "Quality claim — product not meeting spec",
    "Expired product return — past best-by at store",
    "Unsaleable — packaging damage at store level",
]


def code_id_for(retailer_id: str, deduction_type: str, codes_by_retailer: dict) -> tuple[str | None, str]:
    matches = [
        (cid, code) for (cid, code, dt) in codes_by_retailer.get(retailer_id, [])
        if dt == deduction_type
    ]
    if not matches:
        return None, ""
    cid, code = matches[0]
    return cid, code


def short_ship_amount(rng: random.Random, units_short: int, line_value_avg: float) -> float:
    base = units_short * line_value_avg * rng.uniform(0.9, 1.05)
    return round(max(75.0, base), 2)


def label_fine_amount(rng: random.Random, retailer_id: str, total_units: int) -> float:
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
    return round(total_value * rng.uniform(0.05, 0.15), 2)


def late_amount(rng: random.Random, retailer_id: str, total_value: float) -> float:
    if retailer_id == "walmart":
        return round(total_value * 0.03, 2)
    if retailer_id == "unfi":
        return round(rng.choice([250.0, 250.0, 500.0]), 2)
    return round(total_value * rng.uniform(0.015, 0.03), 2)


def promo_amount(rng: random.Random, total_value: float) -> float:
    return round(total_value * rng.uniform(0.05, 0.15), 2)


def vague_amount(rng: random.Random) -> float:
    if rng.random() < 0.6:
        return round(rng.uniform(50.0, 600.0), 2)
    return round(rng.uniform(800.0, 4500.0), 2)


def early_delivery_amount(rng: random.Random, retailer_id: str, total_value: float) -> float:
    if retailer_id in ("walmart", "costco"):
        return round(total_value * rng.uniform(0.02, 0.04), 2)
    return round(rng.uniform(100.0, 400.0), 2)


def freight_amount(rng: random.Random, total_value: float) -> float:
    return round(rng.uniform(150.0, 800.0) + total_value * rng.uniform(0.0, 0.02), 2)


def warehouse_spoils_amount(rng: random.Random, total_value: float) -> float:
    return round(total_value * rng.uniform(0.10, 0.30), 2)


def store_spoils_amount(rng: random.Random, total_value: float) -> float:
    return round(total_value * rng.uniform(0.08, 0.20), 2)


def pricing_amount(rng: random.Random, total_value: float) -> float:
    return round(total_value * rng.uniform(0.02, 0.08), 2)


def returns_amount(rng: random.Random, total_value: float) -> float:
    return round(total_value * rng.uniform(0.05, 0.18), 2)


def duplicate_amount(rng: random.Random, existing_amount: float) -> float:
    return round(existing_amount * rng.uniform(0.95, 1.05), 2)


def wrong_brand_amount(rng: random.Random) -> float:
    return round(rng.uniform(200.0, 3000.0), 2)


def retrieval_cost_hours(rng: random.Random, deduction_type: str, has_order: bool) -> float:
    if deduction_type in ("duplicate_deduction", "wrong_brand"):
        return round(rng.uniform(0.5, 2.0), 2)
    if deduction_type == "placement_fees":
        return round(rng.uniform(0.25, 1.0), 2)
    if not has_order:
        return round(rng.uniform(2.0, 6.0), 2)
    base = rng.uniform(1.0, 4.0)
    if deduction_type in ("freight_routing", "pricing_invoice"):
        base += rng.uniform(0.5, 2.0)
    if deduction_type in ("warehouse_spoils", "store_spoils"):
        base += rng.uniform(1.0, 3.0)
    return round(base, 2)


def deduction_date_for(rng: random.Random, delivery_date: date, lag_range: tuple[int, int]) -> date:
    return delivery_date + timedelta(days=rng.randint(*lag_range))


def main() -> None:
    rng = random.Random(SEED)
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}")

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    cur.execute("DELETE FROM deductions")

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

    rows = cur.execute("""
        SELECT
            o.order_id, o.retailer_id, o.total_units, o.total_value,
            o.requested_delivery_window_start, o.requested_delivery_window_end,
            s.shipment_id, s.delivery_date, s.units_shipped,
            s.bol_signed_short, s.bol_signed_damaged, s.pallets_shipped,
            s.ship_date,
            p.units_picked, p.units_packed, p.units_pick_pack_match,
            p.label_type_used, p.label_scannable
        FROM orders o
        JOIN shipments s ON s.order_id = o.order_id
        JOIN pack_records p ON p.order_id = o.order_id
    """).fetchall()

    deductions = []
    seq = 0
    counters = {t: 0 for t in ALL_TYPES}

    def add_deduction(retailer_id, dt, order_id, shipment_id, amount,
                      code_id, code_remitted, description,
                      deduction_dt, is_vague=0):
        nonlocal seq
        seq += 1
        deduction_id = f"DED-{seq:07d}"
        window = rules.get((retailer_id, dt), (None, None))[0]
        deadline = (deduction_dt + timedelta(days=window)).isoformat() if window else None
        cost_hours = retrieval_cost_hours(rng, dt, order_id is not None)
        deductions.append((
            deduction_id, retailer_id, order_id, shipment_id, dt,
            code_id, code_remitted, description,
            amount, deduction_dt.isoformat(), deadline,
            is_vague, 0,  # is_post_audit
            None,  # remittance_id
            cost_hours,
        ))
        counters[dt] += 1

    for row in rows:
        (order_id, retailer_id, total_units, total_value,
         window_start_str, window_end_str,
         shipment_id, delivery_date_str, units_shipped,
         bol_short, bol_damaged, pallets,
         ship_date_str,
         units_picked, units_packed, pick_pack_match,
         label_type, label_scannable) = row

        profile = PROFILES.get(retailer_id)
        if not profile:
            continue
        vs = VOLUME_SCALE
        delivery_date = date.fromisoformat(delivery_date_str)
        ship_date = date.fromisoformat(ship_date_str)
        window_start = date.fromisoformat(window_start_str) if window_start_str else None
        window_end = date.fromisoformat(window_end_str) if window_end_str else None
        ded_dt = deduction_date_for(rng, delivery_date, profile["remittance_lag"])
        line_value_avg = total_value / max(1, total_units)

        # 1. SHORT SHIP — real (bol-short OR pick-mismatch)
        units_short = max(0, units_packed - units_shipped) + max(0, units_picked - units_packed)
        if (bol_short or not pick_pack_match) and rng.random() < profile["short_ship_real"] * vs:
            cid, code = code_id_for(retailer_id, "short_ship", codes_by_retailer)
            amt = short_ship_amount(rng, max(units_short, 1), line_value_avg)
            add_deduction(retailer_id, "short_ship", order_id, shipment_id,
                          amt, cid, code,
                          f"Short ship: {units_short or 'qty'} units missing",
                          ded_dt)

        # 1b. SHORT SHIP — perceived (non-scannable label causes hand-count undercount)
        elif (label_scannable == 0 and rng.random() < profile["short_ship_perceived"] * vs):
            cid, code = code_id_for(retailer_id, "short_ship", codes_by_retailer)
            phantom_short = rng.randint(2, max(3, total_units // 20))
            amt = short_ship_amount(rng, phantom_short, line_value_avg)
            add_deduction(retailer_id, "short_ship", order_id, shipment_id,
                          amt, cid, code,
                          f"Short ship: receiving hand-count {phantom_short} units short",
                          ded_dt)

        # 2. LABEL FINE
        if label_type == "generic" and rng.random() < profile["label_fine"] * vs:
            cid, code = code_id_for(retailer_id, "label_fine", codes_by_retailer)
            amt = label_fine_amount(rng, retailer_id, total_units)
            add_deduction(retailer_id, "label_fine", order_id, shipment_id,
                          amt, cid, code,
                          "Label noncompliance — generic label not retailer-spec",
                          ded_dt)

        # 3. PALLET FINE
        if rng.random() < profile["pallet_fine"] * vs:
            cid, code = code_id_for(retailer_id, "pallet_fine", codes_by_retailer)
            amt = pallet_fine_amount(rng, retailer_id, pallets or 1)
            add_deduction(retailer_id, "pallet_fine", order_id, shipment_id,
                          amt, cid, code, "Pallet noncompliance", ded_dt)

        # 4. DAMAGED
        if bol_damaged and rng.random() < profile["damaged"] * vs:
            cid, code = code_id_for(retailer_id, "damaged", codes_by_retailer)
            amt = damaged_amount(rng, total_value)
            add_deduction(retailer_id, "damaged", order_id, shipment_id,
                          amt, cid, code,
                          "Damage at receiving — BOL signed damaged",
                          ded_dt)

        # 5. LATE DELIVERY
        if window_end and delivery_date > window_end:
            if rng.random() < profile["late_delivery_window"] * vs:
                cid, code = code_id_for(retailer_id, "late_delivery", codes_by_retailer)
                amt = late_amount(rng, retailer_id, total_value)
                days_late = (delivery_date - window_end).days
                add_deduction(retailer_id, "late_delivery", order_id, shipment_id,
                              amt, cid, code,
                              f"Late delivery — {days_late} days past window",
                              ded_dt)

        # 6. PROMO BILLBACK
        if rng.random() < profile["promo_billback"] * vs:
            cid, code = code_id_for(retailer_id, "promo_billback", codes_by_retailer)
            amt = promo_amount(rng, total_value)
            add_deduction(retailer_id, "promo_billback", order_id, shipment_id,
                          amt, cid, code,
                          "Promo billback (MCB / scan-down)",
                          ded_dt)

        # 7. VAGUE
        if rng.random() < profile["vague"] * vs:
            cid, code = code_id_for(retailer_id, "vague", codes_by_retailer)
            amt = vague_amount(rng)
            template = rng.choice(VAGUE_TEMPLATES)
            description = template.format(code=rng.randint(85, 99), label="Other")
            link_order = order_id if rng.random() > 0.30 else None
            link_shipment = shipment_id if link_order else None
            add_deduction(retailer_id, "vague", link_order, link_shipment,
                          amt, cid, code, description, ded_dt, is_vague=1)

        # 8. EARLY DELIVERY — arrived before delivery window start
        if window_start and delivery_date < window_start:
            if rng.random() < profile["early_delivery"] * vs:
                cid, code = code_id_for(retailer_id, "early_delivery", codes_by_retailer)
                days_early = (window_start - delivery_date).days
                amt = early_delivery_amount(rng, retailer_id, total_value)
                add_deduction(retailer_id, "early_delivery", order_id, shipment_id,
                              amt, cid, code,
                              f"Early delivery — {days_early} days before window",
                              ded_dt)

        # 9. FREIGHT / ROUTING
        if rng.random() < profile["freight_routing"] * vs:
            cid, code = code_id_for(retailer_id, "freight_routing", codes_by_retailer)
            amt = freight_amount(rng, total_value)
            desc = rng.choice(FREIGHT_TEMPLATES)
            add_deduction(retailer_id, "freight_routing", order_id, shipment_id,
                          amt, cid, code, desc, ded_dt)

        # 10. WAREHOUSE SPOILS — product expires in distributor DC
        if rng.random() < profile["warehouse_spoils"] * vs:
            cid, code = code_id_for(retailer_id, "warehouse_spoils", codes_by_retailer)
            amt = warehouse_spoils_amount(rng, total_value)
            desc = rng.choice(WAREHOUSE_SPOILS_TEMPLATES)
            add_deduction(retailer_id, "warehouse_spoils", order_id, shipment_id,
                          amt, cid, code, desc, ded_dt)

        # 11. STORE SPOILS — product expires at store
        if rng.random() < profile["store_spoils"] * vs:
            cid, code = code_id_for(retailer_id, "store_spoils", codes_by_retailer)
            amt = store_spoils_amount(rng, total_value)
            desc = rng.choice(STORE_SPOILS_TEMPLATES)
            add_deduction(retailer_id, "store_spoils", order_id, shipment_id,
                          amt, cid, code, desc, ded_dt)

        # 12. PRICING / INVOICE
        if rng.random() < profile["pricing_invoice"] * vs:
            cid, code = code_id_for(retailer_id, "pricing_invoice", codes_by_retailer)
            amt = pricing_amount(rng, total_value)
            desc = rng.choice(PRICING_TEMPLATES)
            add_deduction(retailer_id, "pricing_invoice", order_id, shipment_id,
                          amt, cid, code, desc, ded_dt)

        # 13. RETURNS / UNSALEABLES
        if rng.random() < profile["returns_unsaleables"] * vs:
            cid, code = code_id_for(retailer_id, "returns_unsaleables", codes_by_retailer)
            amt = returns_amount(rng, total_value)
            desc = rng.choice(RETURNS_TEMPLATES)
            add_deduction(retailer_id, "returns_unsaleables", order_id, shipment_id,
                          amt, cid, code, desc, ded_dt)

        # 14. DUPLICATE DEDUCTION — same deduction taken twice; references a prior deduction
        if rng.random() < profile["duplicate_deduction"] * vs and deductions:
            recent = deductions[-rng.randint(1, min(20, len(deductions)))]
            cid, code = code_id_for(retailer_id, "duplicate_deduction", codes_by_retailer)
            amt = duplicate_amount(rng, recent[8])
            add_deduction(retailer_id, "duplicate_deduction", order_id, shipment_id,
                          amt, cid, code,
                          f"Duplicate of prior deduction — same PO/amount",
                          ded_dt)

        # 15. WRONG BRAND — deduction meant for another supplier
        if rng.random() < profile["wrong_brand"] * vs:
            cid, code = code_id_for(retailer_id, "wrong_brand", codes_by_retailer)
            amt = wrong_brand_amount(rng)
            add_deduction(retailer_id, "wrong_brand", order_id, shipment_id,
                          amt, cid, code,
                          "Deduction for item not in Cinderhaven catalog — retailer error",
                          ded_dt)

    # 16. PLACEMENT FEES — periodic, not order-tied. Planning failure.
    window = cur.execute(
        "SELECT MIN(po_date), MAX(po_date) FROM orders"
    ).fetchone()
    if window and window[0] and window[1]:
        ws = date.fromisoformat(window[0])
        we = date.fromisoformat(window[1])
        total_days = max(1, (we - ws).days)
        for retailer_id, profile in PROFILES.items():
            n_events = profile["placement_events"]
            amount_lo, amount_hi = profile["placement_amount_range"]
            cid, code = code_id_for(retailer_id, "placement_fees", codes_by_retailer)
            for i in range(n_events):
                frac = (i + 0.5) / n_events + rng.uniform(-0.25, 0.25) / n_events
                frac = max(0.0, min(0.999, frac))
                ded_dt = ws + timedelta(days=int(frac * total_days))
                amt = round(rng.uniform(amount_lo, amount_hi), 2)
                description = rng.choice(PLACEMENT_TEMPLATES)
                cost_hours = round(rng.uniform(0.25, 1.0), 2)
                seq += 1
                deduction_id = f"DED-{seq:07d}"
                deductions.append((
                    deduction_id, retailer_id, None, None, "placement_fees",
                    cid, code, description,
                    amt, ded_dt.isoformat(), None,
                    0, 0,
                    None,
                    cost_hours,
                ))
                counters["placement_fees"] += 1

    cur.executemany("""
        INSERT INTO deductions (
            deduction_id, retailer_id, order_id, shipment_id, deduction_type,
            code_id, code_as_remitted, remittance_description,
            amount, deduction_date, dispute_deadline,
            is_vague, is_post_audit, remittance_id,
            evidence_retrieval_cost_hours
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, deductions)
    con.commit()

    n = len(deductions)
    total = sum(d[8] for d in deductions)
    months = 18
    annualized = total * 12 / months

    print(f"Inserted {n:,} deductions.")
    print(f"Total deduction value: ${total:,.0f}")
    print(f"Annualized:            ${annualized:,.0f}  (target ~$1.5M)")
    print()
    print("By type:")
    type_amounts: dict[str, float] = {}
    for d in deductions:
        type_amounts[d[4]] = type_amounts.get(d[4], 0.0) + d[8]
    for dt in ALL_TYPES:
        count = counters[dt]
        amt = type_amounts.get(dt, 0)
        if count > 0:
            print(f"  {dt:<22} {count:>5,}  ${amt:>10,.0f}")
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

    vague_n = sum(1 for d in deductions if d[11])
    no_order = sum(1 for d in deductions if d[2] is None)
    print(f"\nVague deductions:   {vague_n:,}")
    print(f"With no PO link:    {no_order:,} ({no_order/n:.1%})")

    con.close()


if __name__ == "__main__":
    main()
