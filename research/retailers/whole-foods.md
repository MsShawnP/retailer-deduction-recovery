# Whole Foods Market (with Amazon Vendor Central context) — Deduction & Dispute Research

Source: web research, 2026-05-07. Citations inline; verification gaps
listed at the end. Whole Foods sits inside Amazon's vendor systems
post-2017 acquisition; Amazon Vendor Central context is included
because it shapes WFM behavior. Used as input to synthetic-data
generation; do not treat as legal or compliance authority.

## 1. Dispute submission system(s)

Whole Foods Market and Amazon Vendor Central run on **separate systems**, even after the 2017 Amazon acquisition.

- **Amazon Vendor Central (vendorcentral.amazon.com)** is the operational hub for vendors selling 1P to Amazon. Chargebacks and shortages are visible under **Payments > Invoices > Review/Dispute Shortages** (default 30-day view) and **Payments > Invoices > View all Invoices** for older claims. Disputes are filed line-by-line with required fields and document upload [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-central-shortage-claims] [source: https://salesduo.com/blog/amazon-vendor-central-shortage-claims/]. Operational Performance metrics (where chargeback subtypes live) are accessed via **Reports > Operational Performance** [source: https://hingecommerce.com/vendor-central-invoices-chargebacks/].
- **Whole Foods Supplier Portal** is run through a QuickSight-based **Supplier Reporting Portal** and a separate vendor portal at vip.wholefoods.com. The portal is organized by category (Center Store, Perishable, Adult Beverage, Culinary — where specialty foods like gourmet cheeses live). Disputes go through a **"Payment Disputing"** section limited to suppliers in the **"Pay by PO"** program: vendors complete an Excel template (invoice #, PO #, UPC, payment date, amounts, dispute reason) then attach it to a **Smartsheet form** [source: https://www.spscommerce.com/community/articles/how-to-navigate-the-whole-foods-supplier-portal].
- **Amazon Grocery Central (grocerycentral.amazon.com)** has emerged as a Whole Foods/Amazon-grocery touchpoint [source: https://grocerycentral.amazon.com/], but the extent to which it has replaced VIP for legacy WFM vendors **could not be verified** from public sources.
- Specialty food brands shipping into **WFM regional DCs** typically deal with regional buyer relationships and EDI 850/855/810/997 transactions; Whole Foods historically operates by region with separate buyer relationships, deduction codes, and compliance guides per division [source: https://www.spscommerce.com/community/articles/how-to-navigate-the-whole-foods-supplier-portal].

## 2. Deadline windows

- **Amazon Vendor Central chargebacks (April 2025 change):** Dispute window tightened to **15 calendar days** from the chargeback email notification. A second dispute (after a refusal) must be filed within **30 days** of the first refusal [source: https://salesduo.com/blog/amazon-vendor-central-shortage-claims/].
- **Amazon shortage claims:** Theoretically disputable up to **5 years** back, but Vendor Central UI exposes only **9 months** of visibility; older claims require manual reconciliation. Claims **older than 24 months** are no longer recoverable per recent Amazon policy [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-central-shortage-claims] [source: https://www.wakecommerce.co.uk/blog/wake-commerce-amazon-profit-recovery-playbook-2025]. Recovery rates: ~95% within 30 days, ~25% by 90 days, near 0% after 120 days [source: https://www.smyyth.com/blog/amazon-shortages-vendor-central/].
- **Amazon recommends waiting ~30 days** before disputing shortages so Amazon can self-reverse miscounts (~60-day natural reconciliation window) [source: https://salesduo.com/blog/amazon-vendor-central-shortage-claims/].
- **Whole Foods-specific dispute deadline:** **Could not verify** a published deadline. Public docs describe the Excel/Smartsheet workflow but no specific dispute window.

## 3. Common chargeback codes (Amazon Vendor Central)

| Code | Description | Trigger |
|---|---|---|
| **PO On-Time Accuracy — NotOnTime** | Freight ready date or carrier delivery date falls outside the PO ship/delivery window | Late shipping or late delivery [source: https://www.spscommerce.com/community/articles/what-are-amazons-compliance-chargebacks] |
| **PO On-Time Accuracy — NotFilled** | Vendor shipped fewer units than confirmed on the PO | Under-shipping confirmed PO quantities [source: https://www.spscommerce.com/community/articles/what-are-amazons-compliance-chargebacks] |
| **ASN Accuracy — On-Time Non-Compliance (ONTC)** | ASN missing or late for received PO-ASIN | No or late ASN; tiered fees 2–6% based on compliance rate [source: https://hingecommerce.com/vendor-central-invoices-chargebacks/] |
| **ASN Accuracy — Unit Count Mismatch** | ASN units ≠ received units ≠ PO units | EDI 856 inaccuracy [source: https://www.spscommerce.com/community/articles/what-are-amazons-compliance-chargebacks] |
| **Carton Content Accuracy — Shortage / UIO / UQO / Case Pack Defect** | Box contents disagree with virtual record | Mislabeling or miscount; ~$2.60/defect unit; Case Pack Defect ~$26 [source: https://www.spscommerce.com/community/articles/what-are-amazons-compliance-chargebacks] |
| **No Carton Content Label (CCL)** | Missing/unreadable LP label or unregistered GTIN-14 | Bad or missing carton labels [source: https://www.spscommerce.com/community/articles/what-are-amazons-compliance-chargebacks] |
| **Labeling Non-Compliance** | Tiered: $15/carton (≥90% defect), $10 (65–89%), $5 (<65%) | Bad/missing barcodes or PO labels [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-chargeback-fees-the-ultimate-guide] |
| **Oversized/Overweight Carton** | Box >63.5 cm any side or >23 kg | Carton spec violation; $25/box [source: https://www.wakecommerce.co.uk/blog/amazon-chargeback-guide-vendor-central] |
| **Prep Issues** | Missing required prep (bagging, bubble wrap, opaque cover, suffocation sticker, ASIN sticker, hanger removal, set creation, boxing) | Per-unit prep fees [source: https://www.wakecommerce.co.uk/blog/amazon-chargeback-guide-vendor-central] |
| **Rejected Delivery / No Show** | Carrier no-show or non-compliant delivery | ~£425/shipment cited [source: https://www.wakecommerce.co.uk/blog/amazon-chargeback-guide-vendor-central] |
| **Paper Invoice** | Submitting paper invoices instead of using Vendor Central Create Invoice | Non-EDI invoicing [source: https://www.wakecommerce.co.uk/blog/amazon-chargeback-guide-vendor-central] |
| **Overage PO Units** | Shipping more than the PO authorized | Outdated catalog data [source: https://www.wakecommerce.co.uk/blog/amazon-chargeback-guide-vendor-central] |

## 4. Vendor compliance program

Amazon's **Vendor Operational Performance** dashboard (Reports > Operational Performance) is the single source of truth — chargeback subtypes are extracted via Excel download [source: https://www.spscommerce.com/community/articles/what-are-amazons-compliance-chargebacks]. Selected fees: non-compliant carton **$25/box**, carton content accuracy **$2.60/defect unit**, labeling non-compliance **$5–$15/carton tiered**, ASN ONTC **2–6% of product cost**, unconfirmed PO units **10%**, late shipments **3%**, auto-canceled shipments **10%** [source: https://hingecommerce.com/vendor-central-invoices-chargebacks/] [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-chargeback-fees-the-ultimate-guide]. PO on-time charges **waive** if the trailing four-week on-time rate is >90% [source: https://hingecommerce.com/vendor-central-invoices-chargebacks/]. Whole Foods runs a separate **Standardized Compliance Program** (training/resources in the supplier portal) plus quarterly compliance-standards reviews and facility audits [source: https://www.spscommerce.com/community/articles/how-to-navigate-the-whole-foods-supplier-portal].

## 5. Post-audit / clawback behavior

Amazon's shortage-claim machine is the dominant clawback vector. Many shortages are Amazon receiving errors and **self-reverse within 60 days** [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-central-shortage-claims]. Beyond that, dispute timing is everything: 95% recovery within 30 days, ~0% past 120 days [source: https://www.smyyth.com/blog/amazon-shortages-vendor-central/]. Lookback ceilings: visible in UI for ~9 months, claimable up to 5 years with manual reconciliation, **hard cutoff at 24 months** under the 2024–2025 policy tightening [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-central-shortage-claims]. Reported dispute recovery rates run from ~42% (General Mills case study) to ~97% with thorough documentation of pick tickets, signed BOLs, and pallet photos [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-central-shortage-claims] [source: https://www.wakecommerce.co.uk/blog/wake-commerce-amazon-profit-recovery-playbook-2025]. Amazon also **ended bulk shortage dispute submissions**, forcing line-item disputes [source: https://www.threecolts.com/blog/amazon-ends-bulk-shortage-claims/].

## 6. Known quirks / gotchas

- **No proactive notifications.** Vendor Central does not push notifications for many recoverable chargebacks — vendors must monitor the Operational Performance dashboard themselves [source: https://hingecommerce.com/vendor-central-invoices-chargebacks/].
- **ASN timing trap.** ASN must arrive **before** the shipment hits the FC — ideally within 30 minutes of carrier departure or at least 6 hours before the FC appointment. Late ASN = automatic ASN chargeback even if everything else is correct [source: https://www.spscommerce.com/community/articles/what-are-amazons-compliance-chargebacks].
- **One-shot dispute.** Each shortage invoice can be disputed **only once**; missing evidence in the first submission is fatal [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-central-shortage-claims].
- **Single-dispute-at-a-time rule.** Don't dispute an invoice that's already in dispute, already paid, or before its due date — those get rejected procedurally [source: https://www.wakecommerce.co.uk/blog/amazon-vendor-central-shortage-claims].
- **15-day dispute window (April 2025).** Cut from 30 days, catching out vendors with manual processes [source: https://salesduo.com/blog/amazon-vendor-central-shortage-claims/].
- **Whole Foods regional fragmentation.** Different WFM regions historically have separate buyer relationships, deduction codes, and compliance guides; one supplier may face different deduction behavior across regions [source: https://www.spscommerce.com/community/articles/how-to-navigate-the-whole-foods-supplier-portal].
- **WFM "Pay by PO" gating.** The dispute workflow only exists for suppliers enrolled in Pay by PO. Suppliers paid on different terms have no documented self-service dispute path [source: https://www.spscommerce.com/community/articles/how-to-navigate-the-whole-foods-supplier-portal].
- **WFM cost updates via VIP Excel.** Cost mismatches between VIP and the regional ordering system are a documented source of pricing disputes for specialty food vendors [source: https://www.infoconn.com/edi/partners/Whole_Foods.htm].

## Verification gaps

- **Whole Foods-specific dispute deadline windows** — no published number found in public sources.
- **WFM-specific deduction code list** — referenced as existing per region but not published publicly.
- **Whether Amazon Grocery Central has supplanted VIP** for WFM vendors as the canonical dispute portal in 2026 — unverified.
- **Amazon's exact 2025 shortage-claim policy wording** on the 24-month hard cutoff — sourced from consultancies, not from Amazon's own policy doc, which is gated behind Vendor Central login.
- **Specific specialty-food category surcharges** (cold-chain, perishable handling, organic certification) at WFM — not located.
- **Amazon Vendor Central English-language fee table for US** — public sources mix US dollar and UK pound figures; some fees above are UK-specific (the £425 no-show, £0.50/unit prep) and may differ in the US.
