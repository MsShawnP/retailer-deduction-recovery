# Evidence Schema Additions

Additions to `data/schema.md` for the expanded evidence model.
These layer onto the existing schema; they do not replace
`dispute_evidence`.

---

## New table: `evidence_documents`

One row per document that exists (or should exist) for a given
order/shipment/deduction. This replaces the current flat
`dispute_evidence` model with a document-level inventory.

| Column | Type | Description |
|---|---|---|
| evidence_id | TEXT PK | `EV-NNNN` |
| deduction_id | TEXT FK | Links to `deductions` |
| order_id | TEXT FK | Links to `orders` |
| shipment_id | TEXT FK | Links to `shipments` (nullable) |
| document_type | TEXT | See enum below |
| status | TEXT | `exists_ready`, `exists_not_ready`, `expired`, `never_captured` |
| format | TEXT | `system_export`, `edi_transaction`, `digital_photo`, `email`, `handwritten_paper`, `phone_photo`, `null` |
| location | TEXT | `erp`, `carrier_portal`, `retailer_portal`, `shared_drive`, `email_archive`, `filing_cabinet`, `personal_phone`, `personal_desk`, `destroyed`, `null` |
| has_required_metadata | BOOLEAN | 0 = missing critical fields (unsigned, no PO ref, no case count) |
| retrieval_minutes | INTEGER | Estimated time to locate, retrieve, and match to deduction. 0 for system-queryable; 60-240+ for manual cross-reference |
| expires_at | TEXT | ISO date when document is auto-deleted by carrier/portal (nullable) |
| is_expired | BOOLEAN | 1 if past expiration and not archived |
| notes | TEXT | Freeform — e.g., "tracking number transposed on handwritten log" |

### `document_type` enum

| Value | What it is | Primary dispute use |
|---|---|---|
| `signed_bol` | Bill of lading with carrier/shipper signature | Shortage, freight |
| `unsigned_bol` | BOL without signature | Weak — shortage |
| `signed_pod` | Proof of delivery with receiver signature | Shortage, late/early delivery |
| `purchase_order` | Original PO from retailer | Pricing, promo, shortage |
| `invoice` | Supplier invoice | Pricing, promo |
| `asn_edi_856` | Advance shipping notice | Compliance, shortage |
| `packing_list` | System-generated pick/pack list | Shortage, compliance |
| `handwritten_packing_slip` | Paper packing slip, handwritten | Shortage (weak) |
| `label_scan` | Scan or photo of applied label | Labeling compliance |
| `pallet_photo` | Photo of loaded pallet pre-ship | Pallet compliance, damage |
| `carrier_tracking` | Tracking number with delivery timestamp | Late/early delivery, freight |
| `weight_ticket` | Weight at ship point proving case counts | Shortage |
| `deal_sheet` | Signed promo agreement or buyer email | Promo, pricing |
| `temperature_log` | Cold chain temperature record | Damage, spoils |
| `carrier_inspection` | Third-party damage inspection report | Damage, freight |
| `retailer_portal_screenshot` | Screenshot from retailer's system | Any |
| `remittance_advice` | Retailer's deduction notice | Identifies claim |
| `email_correspondence` | Emails confirming terms/agreements | Promo, pricing, compliance |

### `status` values explained

- **`exists_ready`** — Document exists, is complete, has required
  metadata, and can be submitted as-is in a dispute package. Rare
  for Cinderhaven.
- **`exists_not_ready`** — Document exists but is incomplete, unsigned,
  missing metadata, or requires manual effort to match to the
  deduction. E.g., unsigned BOL, handwritten packing slip with no
  case count, phone photo not linked to order.
- **`expired`** — Document once existed in a carrier/retailer portal
  but was auto-deleted before Cinderhaven archived it. Gone.
- **`never_captured`** — Document was never created. Label scan for
  a company using generic labels. Pallet photo nobody took. Carrier
  inspection nobody requested.

---

## New table: `evidence_requirements`

What documents are needed to successfully dispute each deduction
type at each retailer.

| Column | Type | Description |
|---|---|---|
| requirement_id | TEXT PK | |
| retailer_id | TEXT FK | |
| deduction_type | TEXT | Maps to deduction taxonomy |
| document_type | TEXT | From enum above |
| is_required | BOOLEAN | 1 = must have; 0 = strengthens but not required |
| notes | TEXT | Retailer-specific quirks |

This lets the dispute builder show: "To dispute this shortage at
Walmart, you need: signed BOL (you have it, unsigned), signed POD
(expired 3 weeks ago), packing list (handwritten, no case counts).
Dispute readiness: 0/3 required documents ready."

---

## Cinderhaven evidence profile

Default state for synthetic data generation. Each order/shipment
should generate evidence documents reflecting this reality:

| Document type | Cinderhaven typical state |
|---|---|
| BOL | Has it, ~60% unsigned. Filed by date, not by PO. |
| POD | Rarely obtained proactively. Carrier deletes after 90 days. ~70% expired by dispute time. |
| PO | In system, but matching to deduction requires manual lookup because remittances lack PO reference. |
| Invoice | System-generated, generally accurate. ~5% have stale pricing. |
| ASN / EDI 856 | Sent for retailers that require it. ~20% have errors (wrong case count, missing fields). |
| Packing list | Handwritten. No case counts. Not linked to PO. |
| Label scan | Doesn't exist. One generic label, no verification step. |
| Pallet/load photo | ~10% of shipments have a phone photo, not stored systematically. |
| Carrier tracking | Available from carrier, but internal tracking-to-PO link is handwritten with ~15% error rate (transposed digits, illegible). Retrieval takes 1-4 hours of cross-referencing. |
| Deal sheet | In buyer rep's email. Not centralized. |
| Temperature log | Exists for cold-chain-required shipments (~40%), not cross-referenced to deductions. |
| Carrier inspection | Never requested. |
| Retailer portal screenshot | Never pulled proactively. |

---

## Changes to existing tables

### `dispute_evidence` (existing)

Keep for backward compatibility but deprecate as the primary
evidence model. New `evidence_documents` table is the source of
truth. `dispute_evidence` can be derived as a view: the subset
of `evidence_documents` that were actually submitted in a dispute.

### `deductions` (existing)

Add column:

| Column | Type | Description |
|---|---|---|
| evidence_retrieval_cost_hours | REAL | Estimated total hours to assemble a complete dispute package for this deduction. Sum of retrieval_minutes from all required evidence_documents, converted to hours. |

This feeds the cost-to-dispute filter directly.

---

## How this feeds the features

- **Dispute builder**: Shows three columns per deduction — ready,
  not ready, missing. Per-document detail with what's wrong and
  what it would take to fix.
- **Cost-to-dispute filter**: `evidence_retrieval_cost_hours` ×
  hourly labor rate vs. deduction amount × win probability.
- **Recovery simulation**: Toggling "digital ship verification"
  changes evidence status from `handwritten_paper` → `system_export`
  and `never_captured` → `exists_ready` for relevant document types,
  which recalculates dispute readiness and win rates across the
  portfolio.
- **Explorer**: Evidence quality card shows actual document inventory
  instead of a generic score.
- **Timeline pressure**: Evidence expiration dates add urgency —
  "POD expires in 12 days, pull it now or lose it."
