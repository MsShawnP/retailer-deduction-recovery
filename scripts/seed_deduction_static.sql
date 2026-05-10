-- Static seed data for retailer-deduction-recovery.
-- Loads retailers, retailer_rules, deduction_codes, edi_requirements,
-- and evidence_requirements.
-- Run after seed_deduction_schema.sql.
--
-- 16-type taxonomy per handoff (2026-05-10).
-- deduction_aggressiveness: 0-1 scale correlating inversely with
-- Cinderhaven's historical dispute rate against that retailer.
-- Retailers where Cinderhaven rarely disputes show higher aggressiveness.

-- ---------- retailers ----------
INSERT INTO retailers (retailer_id, name, channel_type, dispute_portal_name, dispute_portal_url, dispute_method, deduction_aggressiveness, notes) VALUES
  ('walmart',             'Walmart',                 'retailer',    'Retail Link / APDP / HighRadius',  'https://retaillink.wal-mart.com/',     'portal',       0.72, 'Multiple systems by deduction type — APDP for AP shortages/allowances, HighRadius for AR/OTIF'),
  ('costco',              'Costco',                  'retailer',    'Costco Vendor Portal',             'https://fssts.costco.com/',            'portal',       0.65, 'Lower-tech than Walmart; depot cross-dock model'),
  ('whole_foods',         'Whole Foods',             'retailer',    'VIP / Smartsheet',                 'https://vip.wholefoods.com',           'email_excel',  0.58, 'Pay-by-PO program gates dispute access; regional fragmentation'),
  ('unfi',                'UNFI',                    'distributor', 'Email + Excel template (Natural)', NULL,                                   'email_excel',  0.70, 'Natural side: Deductions@unfi.com — .xlsb only, PDFs/screenshots rejected'),
  ('kehe',                'KeHE',                    'distributor', 'K-Solve in KeHE CONNECT Supplier', 'https://connectsupplier.kehe.com/',    'portal',       0.75, '180-day cap (newly strict); 48-hour UDR response window'),
  ('southside_grocers',   'Southside Grocers',       'retailer',    'Buyer email + AP',                 NULL,                                   'email_buyer',  0.40, 'Wegmans-archetype: specialty/local-supplier friendly, buyer-relationship dispute path'),
  ('green_basket_market', 'Green Basket Market',     'retailer',    'AP email',                         NULL,                                   'email_buyer',  0.55, 'Sprouts-archetype: natural/reset-driven; many deductions arrive via UNFI/KeHE statements'),
  ('prairie_provisions',  'Prairie Provisions',      'retailer',    'AP email',                         NULL,                                   'email_buyer',  0.48, 'Generic regional; inferred norms'),
  ('mountain_pantry_co',  'Mountain Pantry Co',      'retailer',    'AP email',                         NULL,                                   'email_buyer',  0.50, 'Generic regional; inferred norms'),
  ('harbor_fresh',        'Harbor Fresh',            'retailer',    'AP email',                         NULL,                                   'email_buyer',  0.42, 'Generic regional; slightly higher recovery — relationship-driven'),
  ('dtc',                 'DTC',                     'dtc',         NULL,                               NULL,                                   NULL,           0.0,  'Direct-to-consumer; no deduction model');

-- ---------- retailer_rules ----------
-- 16 deduction_types per retailer (DTC excluded).
-- Types 1-7 + 8-12: Cinderhaven internal process failures (five compounding failures)
-- Types 14-15 (duplicate_deduction, wrong_brand): retailer_error root cause
-- Type 13 (returns_unsaleables): mixed root cause
-- Type 16 (placement_fees): forecasting/planning failure

INSERT INTO retailer_rules (retailer_id, deduction_type, dispute_window_days, auto_deduct, evidence_required, typical_recovery_rate, notes) VALUES
  -- ======== Walmart ========
  ('walmart', 'short_ship',           365,  1, 'signed_bol,pod,pack_log',                         0.45, 'Verified — APDP 12-month window for codes 21-28'),
  ('walmart', 'label_fine',           NULL, 1, 'label_scan,pack_log',                             0.20, 'SQEP fines; window not separately published'),
  ('walmart', 'pallet_fine',          NULL, 1, 'photo,pack_log',                                  0.20, 'SQEP Phase 3; $200 admin + $4/pallet'),
  ('walmart', 'damaged',              365,  1, 'signed_bol,photo',                                0.55, 'Code 28; same APDP window as shortage'),
  ('walmart', 'late_delivery',        NULL, 1, 'pod,asn_confirmation',                            0.30, 'OTIF; 3% of COGS; HighRadius dispute window not verified'),
  ('walmart', 'promo_billback',       730,  0, 'promo_agreement,deal_sheet',                      0.50, 'Allowance — 24-month APDP window'),
  ('walmart', 'vague',                NULL, 1, 'pack_log',                                        0.10, 'Code 87 catch-all'),
  ('walmart', 'early_delivery',       365,  1, 'pod,carrier_tracking',                            0.35, 'Must-arrive-by-date compliance; same APDP window'),
  ('walmart', 'freight_routing',      365,  1, 'signed_bol,carrier_tracking,weight_ticket',       0.40, 'Routing guide noncompliance; collect vs prepaid confusion'),
  ('walmart', 'warehouse_spoils',     365,  1, 'signed_bol,temperature_log',                      0.30, 'Product expires in DC; shelf-life agreement enforcement'),
  ('walmart', 'store_spoils',         365,  1, 'signed_bol,temperature_log',                      0.20, 'Product expires at store; velocity mismatch'),
  ('walmart', 'pricing_invoice',      365,  1, 'purchase_order,invoice',                          0.55, 'Cost file mismatch; item setup error'),
  ('walmart', 'returns_unsaleables',  365,  1, 'signed_bol,photo',                                0.35, 'Defectives, quality claims, expired returns'),
  ('walmart', 'duplicate_deduction',  365,  1, 'remittance_advice',                               0.85, 'Same deduction taken twice — easy win with proof'),
  ('walmart', 'wrong_brand',          365,  1, 'remittance_advice,purchase_order',                 0.90, 'Retailer-side error; deduction meant for another supplier'),
  ('walmart', 'placement_fees',       NULL, 1, '',                                                0.05, 'Slotting/placement fees — largely non-disputable but occasionally forecasting error'),

  -- ======== Costco ========
  ('costco', 'short_ship',           NULL, 1, 'signed_bol,pack_log',                              0.40, 'Windows not published; inferred industry norm'),
  ('costco', 'label_fine',           NULL, 1, 'label_scan',                                       0.20, 'GS1-128/SSCC; not published'),
  ('costco', 'pallet_fine',          NULL, 1, 'photo',                                            0.20, 'Lean/overhang/underhang; not published'),
  ('costco', 'damaged',              NULL, 1, 'signed_bol,photo',                                 0.50, 'Inferred'),
  ('costco', 'late_delivery',        NULL, 1, 'pod',                                              0.25, '30-min grace at depot then refusal'),
  ('costco', 'promo_billback',       NULL, 0, 'promo_agreement,deal_sheet',                       0.40, 'Inferred'),
  ('costco', 'vague',                NULL, 1, 'pack_log',                                         0.10, 'Inferred'),
  ('costco', 'early_delivery',       NULL, 1, 'pod,carrier_tracking',                             0.30, 'Cross-dock timing strict; early = storage fee'),
  ('costco', 'freight_routing',      NULL, 1, 'signed_bol,carrier_tracking',                      0.35, 'Routing guide noncompliance'),
  ('costco', 'warehouse_spoils',     NULL, 1, 'signed_bol,temperature_log',                       0.30, 'Short shelf-life at depot; cross-dock model'),
  ('costco', 'store_spoils',         NULL, 1, 'signed_bol',                                       0.20, 'Velocity mismatch; wrong club stores'),
  ('costco', 'pricing_invoice',      NULL, 1, 'purchase_order,invoice',                           0.50, 'Cost file mismatch'),
  ('costco', 'returns_unsaleables',  NULL, 1, 'signed_bol,photo',                                 0.30, 'Quality claims; packaging defects'),
  ('costco', 'duplicate_deduction',  NULL, 1, 'remittance_advice',                                0.80, 'Same deduction taken twice'),
  ('costco', 'wrong_brand',          NULL, 1, 'remittance_advice,purchase_order',                  0.85, 'Retailer-side error'),
  ('costco', 'placement_fees',       NULL, 1, '',                                                  0.05, 'Pay-to-play club placement; largely non-disputable'),

  -- ======== Whole Foods (WFM-only) ========
  ('whole_foods', 'short_ship',           NULL, 0, 'signed_bol,pack_log',                         0.40, 'Not published; Pay-by-PO program required'),
  ('whole_foods', 'label_fine',           NULL, 0, 'label_scan',                                   0.25, 'Not published'),
  ('whole_foods', 'pallet_fine',          NULL, 0, 'photo',                                        0.25, 'Not published'),
  ('whole_foods', 'damaged',              NULL, 0, 'signed_bol,photo',                             0.50, 'Not published'),
  ('whole_foods', 'late_delivery',        NULL, 0, 'pod',                                          0.30, 'No published OTIF program'),
  ('whole_foods', 'promo_billback',       NULL, 0, 'promo_agreement,deal_sheet',                   0.40, 'Regional fragmentation — different practices per region'),
  ('whole_foods', 'vague',                NULL, 0, 'pack_log',                                     0.10, 'Cost-feed mismatches drive opaque deductions'),
  ('whole_foods', 'early_delivery',       NULL, 0, 'pod,carrier_tracking',                         0.30, 'Regional variability; some DCs strict'),
  ('whole_foods', 'freight_routing',      NULL, 0, 'signed_bol,carrier_tracking',                  0.35, 'Regional; some DCs enforce routing guides'),
  ('whole_foods', 'warehouse_spoils',     NULL, 0, 'signed_bol,temperature_log',                   0.35, 'Strict quality program; perishable focus'),
  ('whole_foods', 'store_spoils',         NULL, 0, 'signed_bol',                                   0.25, 'Specialty velocity issues; wrong stores'),
  ('whole_foods', 'pricing_invoice',      NULL, 0, 'purchase_order,invoice',                       0.45, 'Cost-feed mismatches across regions'),
  ('whole_foods', 'returns_unsaleables',  NULL, 0, 'signed_bol,photo',                             0.30, 'Quality claims at store level'),
  ('whole_foods', 'duplicate_deduction',  NULL, 0, 'remittance_advice',                            0.80, 'Regional systems increase duplicate risk'),
  ('whole_foods', 'wrong_brand',          NULL, 0, 'remittance_advice,purchase_order',              0.85, 'Retailer-side error'),
  ('whole_foods', 'placement_fees',       NULL, 0, '',                                              0.05, 'New-item slotting + reset fees by region; non-disputable'),

  -- ======== UNFI (Natural side) ========
  ('unfi', 'short_ship',           60,   1, 'signed_bol,pack_log',                                0.40, '30-60 day practical window; Excel-only dispute form'),
  ('unfi', 'label_fine',           60,   1, 'label_scan',                                         0.25, 'Inferred'),
  ('unfi', 'pallet_fine',          60,   1, 'photo',                                              0.25, 'Inferred'),
  ('unfi', 'damaged',              60,   1, 'signed_bol,photo',                                   0.45, 'Includes unsaleables'),
  ('unfi', 'late_delivery',        60,   1, 'pod',                                                0.30, '$250+ late, $500 no-show, $300 short-notice reschedule'),
  ('unfi', 'promo_billback',       60,   0, 'promo_agreement,deal_sheet',                         0.35, 'MCB disputes common; unsubstantiated promo backups'),
  ('unfi', 'vague',                NULL, 1, 'pack_log',                                           0.10, 'Vague chargebacks routine; PDFs/screenshots rejected'),
  ('unfi', 'early_delivery',       60,   1, 'pod,carrier_tracking',                               0.30, 'Early arrival at DC; inferred norms'),
  ('unfi', 'freight_routing',      60,   1, 'signed_bol,carrier_tracking,weight_ticket',          0.35, 'Collect vs prepaid; accessorial charges'),
  ('unfi', 'warehouse_spoils',     60,   1, 'signed_bol,temperature_log',                         0.30, 'Product expires in UNFI DC; shelf-life agreements'),
  ('unfi', 'store_spoils',         60,   1, 'signed_bol',                                         0.20, 'Unsaleables on natural side; velocity mismatch'),
  ('unfi', 'pricing_invoice',      60,   1, 'purchase_order,invoice',                             0.45, 'Off-invoice allowance mismatch'),
  ('unfi', 'returns_unsaleables',  60,   1, 'signed_bol,photo',                                   0.30, 'Quality claims; expired product returns'),
  ('unfi', 'duplicate_deduction',  60,   1, 'remittance_advice',                                  0.80, 'Same deduction taken twice'),
  ('unfi', 'wrong_brand',          60,   1, 'remittance_advice,purchase_order',                    0.85, 'Deduction meant for another supplier'),
  ('unfi', 'placement_fees',       NULL, 1, '',                                                    0.05, 'Catalog / planogram fees; non-disputable'),

  -- ======== KeHE ========
  ('kehe', 'short_ship',           2,    1, 'signed_bol,pack_log',                                0.35, '48-hour UDR window — locks fast'),
  ('kehe', 'label_fine',           180,  1, 'label_scan',                                         0.30, 'K-Solve 180-day cap, newly strict'),
  ('kehe', 'pallet_fine',          180,  1, 'photo',                                              0.30, 'K-Solve'),
  ('kehe', 'damaged',              180,  1, 'signed_bol,photo',                                   0.45, 'K-Solve; UDR for damage at receipt'),
  ('kehe', 'late_delivery',        180,  1, 'pod',                                                0.30, 'K-Solve'),
  ('kehe', 'promo_billback',       180,  0, 'promo_agreement,deal_sheet',                         0.40, 'MCB + 8% admin fee + $65/DC minimum'),
  ('kehe', 'vague',                180,  1, 'pack_log',                                           0.10, 'Connect BI fee 2% of sales falls here'),
  ('kehe', 'early_delivery',       180,  1, 'pod,carrier_tracking',                               0.30, 'K-Solve; DC timing compliance'),
  ('kehe', 'freight_routing',      180,  1, 'signed_bol,carrier_tracking',                        0.35, 'Routing noncompliance'),
  ('kehe', 'warehouse_spoils',     180,  1, 'signed_bol,temperature_log',                         0.30, 'Shelf-life enforcement at DC'),
  ('kehe', 'store_spoils',         180,  1, 'signed_bol',                                         0.20, 'Velocity mismatch; retailer pass-through'),
  ('kehe', 'pricing_invoice',      180,  1, 'purchase_order,invoice',                             0.45, 'Cost file mismatch; item setup'),
  ('kehe', 'returns_unsaleables',  180,  1, 'signed_bol,photo',                                   0.30, 'Quality claims; expired returns'),
  ('kehe', 'duplicate_deduction',  180,  1, 'remittance_advice',                                  0.80, 'Same deduction taken twice'),
  ('kehe', 'wrong_brand',          180,  1, 'remittance_advice,purchase_order',                    0.85, 'Deduction meant for another supplier'),
  ('kehe', 'placement_fees',       NULL, 1, '',                                                    0.05, 'Connect BI placement fees; non-disputable'),

  -- ======== Southside Grocers (Wegmans archetype) ========
  ('southside_grocers', 'short_ship',           NULL, 0, 'signed_bol,pack_log',                   0.50, 'No published window; specialty-friendly buyer-relationship'),
  ('southside_grocers', 'label_fine',           NULL, 0, 'label_scan',                             0.30, 'GS1-128 inferred from packaging guide'),
  ('southside_grocers', 'pallet_fine',          NULL, 0, 'photo',                                  0.30, '4-way pallet standards inferred'),
  ('southside_grocers', 'damaged',              NULL, 0, 'signed_bol,photo',                       0.55, 'No published window'),
  ('southside_grocers', 'late_delivery',        NULL, 0, 'pod',                                    0.40, 'No published OTIF'),
  ('southside_grocers', 'promo_billback',       NULL, 0, 'promo_agreement',                        0.45, 'No published'),
  ('southside_grocers', 'vague',                NULL, 0, 'pack_log',                               0.15, 'Specialty-friendly buyer relationship'),
  ('southside_grocers', 'early_delivery',       NULL, 0, 'pod,carrier_tracking',                   0.35, 'Flexible delivery windows'),
  ('southside_grocers', 'freight_routing',      NULL, 0, 'signed_bol,carrier_tracking',            0.40, 'Relationship-driven resolution'),
  ('southside_grocers', 'warehouse_spoils',     NULL, 0, 'signed_bol,temperature_log',             0.40, 'Local/specialty friendly'),
  ('southside_grocers', 'store_spoils',         NULL, 0, 'signed_bol',                             0.30, 'Willing to share velocity data'),
  ('southside_grocers', 'pricing_invoice',      NULL, 0, 'purchase_order,invoice',                 0.50, 'Buyer relationship helps resolution'),
  ('southside_grocers', 'returns_unsaleables',  NULL, 0, 'signed_bol,photo',                       0.40, 'Quality claims; relationship path'),
  ('southside_grocers', 'duplicate_deduction',  NULL, 0, 'remittance_advice',                      0.85, 'Easy win — buyer relationship'),
  ('southside_grocers', 'wrong_brand',          NULL, 0, 'remittance_advice,purchase_order',        0.90, 'Buyer notices quickly'),
  ('southside_grocers', 'placement_fees',       NULL, 0, '',                                        0.05, 'Specialty placement allowance; non-disputable'),

  -- ======== Green Basket Market (Sprouts archetype) ========
  ('green_basket_market', 'short_ship',           NULL, 0, 'signed_bol,pack_log',                 0.40, 'Many deductions arrive via UNFI/KeHE statements'),
  ('green_basket_market', 'label_fine',           NULL, 0, 'label_scan',                           0.25, 'GS1-128 required'),
  ('green_basket_market', 'pallet_fine',          NULL, 0, 'photo',                                0.25, 'Inferred'),
  ('green_basket_market', 'damaged',              NULL, 0, 'signed_bol,photo',                     0.45, 'Inferred'),
  ('green_basket_market', 'late_delivery',        NULL, 0, 'pod',                                  0.30, 'Inferred'),
  ('green_basket_market', 'promo_billback',       NULL, 0, 'promo_agreement',                      0.40, 'Free Fill + Fair Share via reset calendar'),
  ('green_basket_market', 'vague',                NULL, 0, 'pack_log',                             0.10, 'Inferred'),
  ('green_basket_market', 'early_delivery',       NULL, 0, 'pod,carrier_tracking',                 0.30, 'Reset-timing sensitive'),
  ('green_basket_market', 'freight_routing',      NULL, 0, 'signed_bol,carrier_tracking',          0.35, 'Inferred'),
  ('green_basket_market', 'warehouse_spoils',     NULL, 0, 'signed_bol,temperature_log',           0.35, 'Natural products; shorter shelf life'),
  ('green_basket_market', 'store_spoils',         NULL, 0, 'signed_bol',                           0.25, 'Velocity mismatch at store'),
  ('green_basket_market', 'pricing_invoice',      NULL, 0, 'purchase_order,invoice',               0.40, 'Cost file mismatch'),
  ('green_basket_market', 'returns_unsaleables',  NULL, 0, 'signed_bol,photo',                     0.30, 'Quality claims'),
  ('green_basket_market', 'duplicate_deduction',  NULL, 0, 'remittance_advice',                    0.80, 'Distributor pass-through doubles'),
  ('green_basket_market', 'wrong_brand',          NULL, 0, 'remittance_advice,purchase_order',      0.85, 'Retailer-side error'),
  ('green_basket_market', 'placement_fees',       NULL, 0, '',                                      0.05, 'Reset / new-item placement; non-disputable'),

  -- ======== Prairie Provisions (generic regional) ========
  ('prairie_provisions', 'short_ship',           NULL, 0, 'signed_bol,pack_log',                  0.40, 'Inferred norms'),
  ('prairie_provisions', 'label_fine',           NULL, 0, 'label_scan',                            0.25, 'Inferred'),
  ('prairie_provisions', 'pallet_fine',          NULL, 0, 'photo',                                 0.25, 'Inferred'),
  ('prairie_provisions', 'damaged',              NULL, 0, 'signed_bol,photo',                      0.45, 'Inferred'),
  ('prairie_provisions', 'late_delivery',        NULL, 0, 'pod',                                   0.30, 'Inferred'),
  ('prairie_provisions', 'promo_billback',       NULL, 0, 'promo_agreement',                       0.40, 'Inferred'),
  ('prairie_provisions', 'vague',                NULL, 0, 'pack_log',                              0.10, 'Inferred'),
  ('prairie_provisions', 'early_delivery',       NULL, 0, 'pod,carrier_tracking',                  0.30, 'Inferred'),
  ('prairie_provisions', 'freight_routing',      NULL, 0, 'signed_bol,carrier_tracking',           0.35, 'Inferred'),
  ('prairie_provisions', 'warehouse_spoils',     NULL, 0, 'signed_bol,temperature_log',            0.35, 'Inferred'),
  ('prairie_provisions', 'store_spoils',         NULL, 0, 'signed_bol',                            0.25, 'Inferred'),
  ('prairie_provisions', 'pricing_invoice',      NULL, 0, 'purchase_order,invoice',                0.45, 'Inferred'),
  ('prairie_provisions', 'returns_unsaleables',  NULL, 0, 'signed_bol,photo',                      0.35, 'Inferred'),
  ('prairie_provisions', 'duplicate_deduction',  NULL, 0, 'remittance_advice',                     0.80, 'Inferred'),
  ('prairie_provisions', 'wrong_brand',          NULL, 0, 'remittance_advice,purchase_order',       0.85, 'Inferred'),
  ('prairie_provisions', 'placement_fees',       NULL, 0, '',                                       0.05, 'Non-disputable'),

  -- ======== Mountain Pantry Co (generic regional) ========
  ('mountain_pantry_co', 'short_ship',           NULL, 0, 'signed_bol,pack_log',                  0.40, 'Inferred norms'),
  ('mountain_pantry_co', 'label_fine',           NULL, 0, 'label_scan',                            0.25, 'Inferred'),
  ('mountain_pantry_co', 'pallet_fine',          NULL, 0, 'photo',                                 0.25, 'Inferred'),
  ('mountain_pantry_co', 'damaged',              NULL, 0, 'signed_bol,photo',                      0.45, 'Inferred'),
  ('mountain_pantry_co', 'late_delivery',        NULL, 0, 'pod',                                   0.30, 'Inferred'),
  ('mountain_pantry_co', 'promo_billback',       NULL, 0, 'promo_agreement',                       0.40, 'Inferred'),
  ('mountain_pantry_co', 'vague',                NULL, 0, 'pack_log',                              0.10, 'Inferred'),
  ('mountain_pantry_co', 'early_delivery',       NULL, 0, 'pod,carrier_tracking',                  0.30, 'Inferred'),
  ('mountain_pantry_co', 'freight_routing',      NULL, 0, 'signed_bol,carrier_tracking',           0.35, 'Inferred'),
  ('mountain_pantry_co', 'warehouse_spoils',     NULL, 0, 'signed_bol,temperature_log',            0.35, 'Inferred'),
  ('mountain_pantry_co', 'store_spoils',         NULL, 0, 'signed_bol',                            0.25, 'Inferred'),
  ('mountain_pantry_co', 'pricing_invoice',      NULL, 0, 'purchase_order,invoice',                0.45, 'Inferred'),
  ('mountain_pantry_co', 'returns_unsaleables',  NULL, 0, 'signed_bol,photo',                      0.35, 'Inferred'),
  ('mountain_pantry_co', 'duplicate_deduction',  NULL, 0, 'remittance_advice',                     0.80, 'Inferred'),
  ('mountain_pantry_co', 'wrong_brand',          NULL, 0, 'remittance_advice,purchase_order',       0.85, 'Inferred'),
  ('mountain_pantry_co', 'placement_fees',       NULL, 0, '',                                       0.05, 'Non-disputable'),

  -- ======== Harbor Fresh (generic regional, relationship-driven) ========
  ('harbor_fresh', 'short_ship',           NULL, 0, 'signed_bol,pack_log',                        0.45, 'Slightly higher recovery — relationship-driven'),
  ('harbor_fresh', 'label_fine',           NULL, 0, 'label_scan',                                  0.30, 'Inferred'),
  ('harbor_fresh', 'pallet_fine',          NULL, 0, 'photo',                                       0.30, 'Inferred'),
  ('harbor_fresh', 'damaged',              NULL, 0, 'signed_bol,photo',                            0.50, 'Inferred'),
  ('harbor_fresh', 'late_delivery',        NULL, 0, 'pod',                                         0.35, 'Inferred'),
  ('harbor_fresh', 'promo_billback',       NULL, 0, 'promo_agreement',                             0.45, 'Inferred'),
  ('harbor_fresh', 'vague',                NULL, 0, 'pack_log',                                    0.15, 'Inferred'),
  ('harbor_fresh', 'early_delivery',       NULL, 0, 'pod,carrier_tracking',                        0.35, 'Flexible'),
  ('harbor_fresh', 'freight_routing',      NULL, 0, 'signed_bol,carrier_tracking',                 0.40, 'Relationship-driven'),
  ('harbor_fresh', 'warehouse_spoils',     NULL, 0, 'signed_bol,temperature_log',                  0.40, 'Inferred'),
  ('harbor_fresh', 'store_spoils',         NULL, 0, 'signed_bol',                                  0.30, 'Inferred'),
  ('harbor_fresh', 'pricing_invoice',      NULL, 0, 'purchase_order,invoice',                      0.50, 'Buyer relationship helps'),
  ('harbor_fresh', 'returns_unsaleables',  NULL, 0, 'signed_bol,photo',                            0.40, 'Inferred'),
  ('harbor_fresh', 'duplicate_deduction',  NULL, 0, 'remittance_advice',                           0.85, 'Easy win'),
  ('harbor_fresh', 'wrong_brand',          NULL, 0, 'remittance_advice,purchase_order',             0.90, 'Buyer notices quickly'),
  ('harbor_fresh', 'placement_fees',       NULL, 0, '',                                             0.05, 'Non-disputable');

-- ---------- deduction_codes ----------
INSERT INTO deduction_codes (code_id, retailer_id, code, name, deduction_type, is_published) VALUES
  -- Walmart (published)
  ('walmart_11', 'walmart', '11', 'Price Difference Between PO & Invoice',          'pricing_invoice', 1),
  ('walmart_13', 'walmart', '13', 'Substitution Overcharge',                        'short_ship',      1),
  ('walmart_21', 'walmart', '21', 'Concealed Shortage',                             'short_ship',      1),
  ('walmart_22', 'walmart', '22', 'Merchandise Billed Not Shipped',                 'short_ship',      1),
  ('walmart_24', 'walmart', '24', 'Carton Shortage / Freight Bill Signed Short',    'short_ship',      1),
  ('walmart_25', 'walmart', '25', 'No Merchandise Received for Invoice',            'short_ship',      1),
  ('walmart_28', 'walmart', '28', 'Carton Damage – Freight Bill Signed Damaged',    'damaged',         1),
  ('walmart_29', 'walmart', '29', 'Concealed Damage / Spoilage',                    'warehouse_spoils', 1),
  ('walmart_30', 'walmart', '30', 'Duplicate Billing',                              'duplicate_deduction', 1),
  ('walmart_51', 'walmart', '51', 'Promotional Allowance',                          'promo_billback',  1),
  ('walmart_59', 'walmart', '59', 'Defective Merchandise Allowance',                'returns_unsaleables', 1),
  ('walmart_87', 'walmart', '87', 'Other',                                          'vague',           1),
  ('walmart_99', 'walmart', '99', 'OTIF',                                           'late_delivery',   1),
  ('walmart_early',   'walmart', 'EARLY', 'Early Delivery / Must-Arrive-By Violation', 'early_delivery', 0),
  ('walmart_freight', 'walmart', 'FRT',   'Freight / Routing Noncompliance',        'freight_routing',  0),
  ('walmart_spoils_store', 'walmart', 'SPL-S', 'Store Spoilage / Expired',          'store_spoils',    0),
  ('walmart_wrong',   'walmart', 'WRB',   'Wrong Brand / Misdirected Deduction',    'wrong_brand',     0),
  ('walmart_placement', 'walmart', 'NIF',  'New-Item / Slotting Fee',               'placement_fees',  0),
  -- Costco (inferred placeholders)
  ('costco_short_ship',       'costco', 'SHRT',  'Shortage at receiving',           'short_ship',          0),
  ('costco_label_fine',       'costco', 'LBL',   'Labeling noncompliance',          'label_fine',          0),
  ('costco_pallet_fine',      'costco', 'PALT',  'Pallet noncompliance',            'pallet_fine',         0),
  ('costco_damaged',          'costco', 'DMG',   'Damaged at receiving',            'damaged',             0),
  ('costco_late_delivery',    'costco', 'LATE',  'Late or refused delivery',        'late_delivery',       0),
  ('costco_promo_billback',   'costco', 'PROMO', 'Promotional allowance',           'promo_billback',      0),
  ('costco_vague',            'costco', 'MISC',  'Miscellaneous deduction',         'vague',               0),
  ('costco_early',            'costco', 'EARLY', 'Early delivery / storage fee',    'early_delivery',      0),
  ('costco_freight',          'costco', 'FRT',   'Freight routing noncompliance',   'freight_routing',     0),
  ('costco_warehouse_spoils', 'costco', 'SPL-W', 'Warehouse spoilage',             'warehouse_spoils',    0),
  ('costco_store_spoils',     'costco', 'SPL-S', 'Store spoilage / expired',        'store_spoils',        0),
  ('costco_pricing',          'costco', 'PRC',   'Pricing / invoice error',         'pricing_invoice',     0),
  ('costco_returns',          'costco', 'RET',   'Returns / unsaleables',           'returns_unsaleables', 0),
  ('costco_duplicate',        'costco', 'DUP',   'Duplicate deduction',             'duplicate_deduction', 0),
  ('costco_wrong_brand',      'costco', 'WRB',   'Wrong brand / misdirected',       'wrong_brand',         0),
  ('costco_placement',        'costco', 'SLOT',  'Slotting / placement fee',        'placement_fees',      0),
  -- Whole Foods (inferred placeholders)
  ('wholefoods_short_ship',       'whole_foods', 'SHRT',  'Shortage',               'short_ship',          0),
  ('wholefoods_label_fine',       'whole_foods', 'LBL',   'Labeling fine',           'label_fine',          0),
  ('wholefoods_pallet_fine',      'whole_foods', 'PALT',  'Pallet fine',             'pallet_fine',         0),
  ('wholefoods_damaged',          'whole_foods', 'DMG',   'Damaged product',         'damaged',             0),
  ('wholefoods_late_delivery',    'whole_foods', 'LATE',  'Late delivery',           'late_delivery',       0),
  ('wholefoods_promo_billback',   'whole_foods', 'PROMO', 'Promo billback',          'promo_billback',      0),
  ('wholefoods_vague',            'whole_foods', 'MISC',  'Miscellaneous',           'vague',               0),
  ('wholefoods_early',            'whole_foods', 'EARLY', 'Early delivery',          'early_delivery',      0),
  ('wholefoods_freight',          'whole_foods', 'FRT',   'Freight noncompliance',   'freight_routing',     0),
  ('wholefoods_warehouse_spoils', 'whole_foods', 'SPL-W', 'Warehouse spoilage',     'warehouse_spoils',    0),
  ('wholefoods_store_spoils',     'whole_foods', 'SPL-S', 'Store spoilage',          'store_spoils',        0),
  ('wholefoods_pricing',          'whole_foods', 'PRC',   'Pricing / invoice error', 'pricing_invoice',     0),
  ('wholefoods_returns',          'whole_foods', 'RET',   'Returns / unsaleables',   'returns_unsaleables', 0),
  ('wholefoods_duplicate',        'whole_foods', 'DUP',   'Duplicate deduction',     'duplicate_deduction', 0),
  ('wholefoods_wrong_brand',      'whole_foods', 'WRB',   'Wrong brand',             'wrong_brand',         0),
  ('wholefoods_placement',        'whole_foods', 'SLOT',  'Placement fee',           'placement_fees',      0),
  -- UNFI (3-letter codes, partially inferred)
  ('unfi_sht',              'unfi', 'SHT',   'Shortage',                             'short_ship',          0),
  ('unfi_lbl',              'unfi', 'LBL',   'Labeling fine',                        'label_fine',          0),
  ('unfi_plt',              'unfi', 'PLT',   'Pallet noncompliance',                 'pallet_fine',         0),
  ('unfi_dmg',              'unfi', 'DMG',   'Damaged product / unsaleable',         'damaged',             0),
  ('unfi_lat',              'unfi', 'LAT',   'Late delivery',                        'late_delivery',       0),
  ('unfi_mcb',              'unfi', 'MCB',   'Manufacturer chargeback (promo)',      'promo_billback',      0),
  ('unfi_msc',              'unfi', 'MSC',   'Miscellaneous deduction',              'vague',               0),
  ('unfi_early',            'unfi', 'ERL',   'Early delivery',                       'early_delivery',      0),
  ('unfi_freight',          'unfi', 'FRT',   'Freight / routing',                    'freight_routing',     0),
  ('unfi_warehouse_spoils', 'unfi', 'UNS-W', 'Warehouse unsaleable / spoilage',     'warehouse_spoils',    0),
  ('unfi_store_spoils',     'unfi', 'UNS-S', 'Store unsaleable / spoilage',          'store_spoils',        0),
  ('unfi_pricing',          'unfi', 'PRC',   'Pricing / invoice error',              'pricing_invoice',     0),
  ('unfi_returns',          'unfi', 'RET',   'Returns / unsaleables',                'returns_unsaleables', 0),
  ('unfi_duplicate',        'unfi', 'DUP',   'Duplicate deduction',                  'duplicate_deduction', 0),
  ('unfi_wrong_brand',      'unfi', 'WRB',   'Wrong brand',                          'wrong_brand',         0),
  ('unfi_placement',        'unfi', 'SLOT',  'Catalog / placement fee',              'placement_fees',      0),
  -- KeHE (mostly documented)
  ('kehe_udr',              'kehe', 'UDR',   'Unloading Discrepancy (shortage/over/damage)', 'short_ship',  1),
  ('kehe_mcb',              'kehe', 'MCB',   'Manufacturer Chargeback (promo)',      'promo_billback',      1),
  ('kehe_mcb_fee',          'kehe', 'MCBF',  'MCB admin fee (8%, $65/DC min)',       'promo_billback',      1),
  ('kehe_ep',               'kehe', 'EP',    'Event Promotion fee',                  'promo_billback',      1),
  ('kehe_bi',               'kehe', 'BI',    'Connect BI fee (2% of sales)',         'vague',               1),
  ('kehe_freight',          'kehe', 'FRT',   'Freight allowance',                    'freight_routing',     1),
  ('kehe_label',            'kehe', 'LBL',   'Labeling noncompliance',               'label_fine',          0),
  ('kehe_late',             'kehe', 'LATE',  'Late delivery',                        'late_delivery',       0),
  ('kehe_early',            'kehe', 'ERL',   'Early delivery',                       'early_delivery',      0),
  ('kehe_warehouse_spoils', 'kehe', 'UDRS',  'UDR — spoilage at DC',                'warehouse_spoils',    0),
  ('kehe_store_spoils',     'kehe', 'SPL-S', 'Store spoilage pass-through',          'store_spoils',        0),
  ('kehe_pricing',          'kehe', 'PRC',   'Pricing / cost file error',            'pricing_invoice',     0),
  ('kehe_returns',          'kehe', 'RET',   'Returns / quality claims',             'returns_unsaleables', 0),
  ('kehe_duplicate',        'kehe', 'DUP',   'Duplicate deduction',                  'duplicate_deduction', 0),
  ('kehe_wrong_brand',      'kehe', 'WRB',   'Wrong brand',                          'wrong_brand',         0),
  ('kehe_placement',        'kehe', 'SLOT',  'Placement / Connect BI',               'placement_fees',      0),
  -- Southside Grocers (Wegmans archetype, inferred)
  ('southside_grocers_short_ship',       'southside_grocers', 'SHRT',  'Shortage',             'short_ship',          0),
  ('southside_grocers_label_fine',       'southside_grocers', 'LBL',   'Label fine',           'label_fine',          0),
  ('southside_grocers_pallet_fine',      'southside_grocers', 'PALT',  'Pallet fine',          'pallet_fine',         0),
  ('southside_grocers_damaged',          'southside_grocers', 'DMG',   'Damaged',              'damaged',             0),
  ('southside_grocers_late_delivery',    'southside_grocers', 'LATE',  'Late delivery',        'late_delivery',       0),
  ('southside_grocers_promo_billback',   'southside_grocers', 'PROMO', 'Promo billback',       'promo_billback',      0),
  ('southside_grocers_vague',            'southside_grocers', 'MISC',  'Miscellaneous',        'vague',               0),
  ('southside_grocers_early',            'southside_grocers', 'EARLY', 'Early delivery',       'early_delivery',      0),
  ('southside_grocers_freight',          'southside_grocers', 'FRT',   'Freight',              'freight_routing',     0),
  ('southside_grocers_warehouse_spoils', 'southside_grocers', 'SPL-W', 'Warehouse spoilage',  'warehouse_spoils',    0),
  ('southside_grocers_store_spoils',     'southside_grocers', 'SPL-S', 'Store spoilage',       'store_spoils',        0),
  ('southside_grocers_pricing',          'southside_grocers', 'PRC',   'Pricing error',        'pricing_invoice',     0),
  ('southside_grocers_returns',          'southside_grocers', 'RET',   'Returns',              'returns_unsaleables', 0),
  ('southside_grocers_duplicate',        'southside_grocers', 'DUP',   'Duplicate',            'duplicate_deduction', 0),
  ('southside_grocers_wrong_brand',      'southside_grocers', 'WRB',   'Wrong brand',          'wrong_brand',         0),
  ('southside_grocers_placement',        'southside_grocers', 'SLOT',  'Placement fee',        'placement_fees',      0),
  -- Green Basket Market (Sprouts archetype)
  ('green_basket_market_short_ship',       'green_basket_market', 'SHRT',  'Shortage',             'short_ship',          0),
  ('green_basket_market_label_fine',       'green_basket_market', 'LBL',   'Label fine',           'label_fine',          0),
  ('green_basket_market_pallet_fine',      'green_basket_market', 'PALT',  'Pallet fine',          'pallet_fine',         0),
  ('green_basket_market_damaged',          'green_basket_market', 'DMG',   'Damaged',              'damaged',             0),
  ('green_basket_market_late_delivery',    'green_basket_market', 'LATE',  'Late delivery',        'late_delivery',       0),
  ('green_basket_market_freefill',         'green_basket_market', 'FFL',   'Free Fill billback',   'promo_billback',      0),
  ('green_basket_market_fairshare',        'green_basket_market', 'FAIR',  'Fair Share billback',  'promo_billback',      0),
  ('green_basket_market_vague',            'green_basket_market', 'MISC',  'Miscellaneous',        'vague',               0),
  ('green_basket_market_early',            'green_basket_market', 'EARLY', 'Early delivery',       'early_delivery',      0),
  ('green_basket_market_freight',          'green_basket_market', 'FRT',   'Freight',              'freight_routing',     0),
  ('green_basket_market_warehouse_spoils', 'green_basket_market', 'SPL-W', 'Warehouse spoilage',  'warehouse_spoils',    0),
  ('green_basket_market_store_spoils',     'green_basket_market', 'SPL-S', 'Store spoilage',       'store_spoils',        0),
  ('green_basket_market_pricing',          'green_basket_market', 'PRC',   'Pricing error',        'pricing_invoice',     0),
  ('green_basket_market_returns',          'green_basket_market', 'RET',   'Returns',              'returns_unsaleables', 0),
  ('green_basket_market_duplicate',        'green_basket_market', 'DUP',   'Duplicate',            'duplicate_deduction', 0),
  ('green_basket_market_wrong_brand',      'green_basket_market', 'WRB',   'Wrong brand',          'wrong_brand',         0),
  ('green_basket_market_placement',        'green_basket_market', 'SLOT',  'Placement fee',        'placement_fees',      0),
  -- Prairie Provisions (generic regional)
  ('prairie_provisions_short_ship',       'prairie_provisions', 'SHRT',  'Shortage',             'short_ship',          0),
  ('prairie_provisions_label_fine',       'prairie_provisions', 'LBL',   'Label fine',           'label_fine',          0),
  ('prairie_provisions_pallet_fine',      'prairie_provisions', 'PALT',  'Pallet fine',          'pallet_fine',         0),
  ('prairie_provisions_damaged',          'prairie_provisions', 'DMG',   'Damaged',              'damaged',             0),
  ('prairie_provisions_late_delivery',    'prairie_provisions', 'LATE',  'Late delivery',        'late_delivery',       0),
  ('prairie_provisions_promo_billback',   'prairie_provisions', 'PROMO', 'Promo billback',       'promo_billback',      0),
  ('prairie_provisions_vague',            'prairie_provisions', 'MISC',  'Miscellaneous',        'vague',               0),
  ('prairie_provisions_early',            'prairie_provisions', 'EARLY', 'Early delivery',       'early_delivery',      0),
  ('prairie_provisions_freight',          'prairie_provisions', 'FRT',   'Freight',              'freight_routing',     0),
  ('prairie_provisions_warehouse_spoils', 'prairie_provisions', 'SPL-W', 'Warehouse spoilage',  'warehouse_spoils',    0),
  ('prairie_provisions_store_spoils',     'prairie_provisions', 'SPL-S', 'Store spoilage',       'store_spoils',        0),
  ('prairie_provisions_pricing',          'prairie_provisions', 'PRC',   'Pricing error',        'pricing_invoice',     0),
  ('prairie_provisions_returns',          'prairie_provisions', 'RET',   'Returns',              'returns_unsaleables', 0),
  ('prairie_provisions_duplicate',        'prairie_provisions', 'DUP',   'Duplicate',            'duplicate_deduction', 0),
  ('prairie_provisions_wrong_brand',      'prairie_provisions', 'WRB',   'Wrong brand',          'wrong_brand',         0),
  ('prairie_provisions_placement',        'prairie_provisions', 'SLOT',  'Placement fee',        'placement_fees',      0),
  -- Mountain Pantry Co (generic regional)
  ('mountain_pantry_co_short_ship',       'mountain_pantry_co', 'SHRT',  'Shortage',             'short_ship',          0),
  ('mountain_pantry_co_label_fine',       'mountain_pantry_co', 'LBL',   'Label fine',           'label_fine',          0),
  ('mountain_pantry_co_pallet_fine',      'mountain_pantry_co', 'PALT',  'Pallet fine',          'pallet_fine',         0),
  ('mountain_pantry_co_damaged',          'mountain_pantry_co', 'DMG',   'Damaged',              'damaged',             0),
  ('mountain_pantry_co_late_delivery',    'mountain_pantry_co', 'LATE',  'Late delivery',        'late_delivery',       0),
  ('mountain_pantry_co_promo_billback',   'mountain_pantry_co', 'PROMO', 'Promo billback',       'promo_billback',      0),
  ('mountain_pantry_co_vague',            'mountain_pantry_co', 'MISC',  'Miscellaneous',        'vague',               0),
  ('mountain_pantry_co_early',            'mountain_pantry_co', 'EARLY', 'Early delivery',       'early_delivery',      0),
  ('mountain_pantry_co_freight',          'mountain_pantry_co', 'FRT',   'Freight',              'freight_routing',     0),
  ('mountain_pantry_co_warehouse_spoils', 'mountain_pantry_co', 'SPL-W', 'Warehouse spoilage',  'warehouse_spoils',    0),
  ('mountain_pantry_co_store_spoils',     'mountain_pantry_co', 'SPL-S', 'Store spoilage',       'store_spoils',        0),
  ('mountain_pantry_co_pricing',          'mountain_pantry_co', 'PRC',   'Pricing error',        'pricing_invoice',     0),
  ('mountain_pantry_co_returns',          'mountain_pantry_co', 'RET',   'Returns',              'returns_unsaleables', 0),
  ('mountain_pantry_co_duplicate',        'mountain_pantry_co', 'DUP',   'Duplicate',            'duplicate_deduction', 0),
  ('mountain_pantry_co_wrong_brand',      'mountain_pantry_co', 'WRB',   'Wrong brand',          'wrong_brand',         0),
  ('mountain_pantry_co_placement',        'mountain_pantry_co', 'SLOT',  'Placement fee',        'placement_fees',      0),
  -- Harbor Fresh (generic regional)
  ('harbor_fresh_short_ship',       'harbor_fresh', 'SHRT',  'Shortage',             'short_ship',          0),
  ('harbor_fresh_label_fine',       'harbor_fresh', 'LBL',   'Label fine',           'label_fine',          0),
  ('harbor_fresh_pallet_fine',      'harbor_fresh', 'PALT',  'Pallet fine',          'pallet_fine',         0),
  ('harbor_fresh_damaged',          'harbor_fresh', 'DMG',   'Damaged',              'damaged',             0),
  ('harbor_fresh_late_delivery',    'harbor_fresh', 'LATE',  'Late delivery',        'late_delivery',       0),
  ('harbor_fresh_promo_billback',   'harbor_fresh', 'PROMO', 'Promo billback',       'promo_billback',      0),
  ('harbor_fresh_vague',            'harbor_fresh', 'MISC',  'Miscellaneous',        'vague',               0),
  ('harbor_fresh_early',            'harbor_fresh', 'EARLY', 'Early delivery',       'early_delivery',      0),
  ('harbor_fresh_freight',          'harbor_fresh', 'FRT',   'Freight',              'freight_routing',     0),
  ('harbor_fresh_warehouse_spoils', 'harbor_fresh', 'SPL-W', 'Warehouse spoilage',  'warehouse_spoils',    0),
  ('harbor_fresh_store_spoils',     'harbor_fresh', 'SPL-S', 'Store spoilage',       'store_spoils',        0),
  ('harbor_fresh_pricing',          'harbor_fresh', 'PRC',   'Pricing error',        'pricing_invoice',     0),
  ('harbor_fresh_returns',          'harbor_fresh', 'RET',   'Returns',              'returns_unsaleables', 0),
  ('harbor_fresh_duplicate',        'harbor_fresh', 'DUP',   'Duplicate',            'duplicate_deduction', 0),
  ('harbor_fresh_wrong_brand',      'harbor_fresh', 'WRB',   'Wrong brand',          'wrong_brand',         0),
  ('harbor_fresh_placement',        'harbor_fresh', 'SLOT',  'Placement fee',        'placement_fees',      0);

-- ---------- edi_requirements ----------
INSERT INTO edi_requirements (retailer_id, category, requirement, penalty_if_violated, is_verified, source_url) VALUES
  -- Walmart
  ('walmart', 'label',       'GS1-128 case labels with Walmart-required fields, two per case',                              '$200 admin + $1/case (SQEP Phase 2)',                  1, 'https://supplierwiki.supplypike.com/articles/calculating-sqep-fines-by-defect'),
  ('walmart', 'pallet',      'Walmart pallet spec, slip-sheet/wrap, height limits',                                         '$200 admin + $4/pallet (SQEP Phase 3)',                1, 'https://supplierwiki.supplypike.com/articles/calculating-sqep-fines-by-defect'),
  ('walmart', 'asn',         'EDI 856 ASN required before shipment arrives',                                                '$25/PO if not downloaded (SQEP Phase 1, non-DSDC)',    1, 'https://supplierwiki.supplypike.com/articles/calculating-sqep-fines-by-defect'),
  ('walmart', 'otif',        'Prepaid 90% / Collect 98% on-time, 95% in-full',                                              '3% of COGS on non-compliant cases',                    1, 'https://vendormint.com/walmart-on-time-in-full-otif-compliance/'),
  ('walmart', 'carton',      'Walmart-spec carton dimensions and labeling',                                                 'Code 22 perceived shortage if not scannable',          1, 'https://www.8thandwalton.com/blog/walmart-deduction-codes/'),
  -- Costco
  ('costco',  'label',       'GS1-128/SSCC, on two adjacent sides; vendor#, PO, item, qty, weight, destination',            '$50-$150/carton (inferred)',                           0, 'https://www.orderease.com/community/the-2025-guide-to-costco-edi-compliance-automation-chargeback-prevention'),
  ('costco',  'pallet',      '48x40 footprint; 58 inch max height; iGPS/PECO/CHEP only — no GMA #1 stringer',               'Lean/overhang/underhang chargeback',                   1, 'https://www.clubstorepackaging.com/post/costco-packaging-specifications-requirements'),
  ('costco',  'asn',         'EDI 856 via SPS Commerce VAN',                                                                '$50-$200 per incident (inferred)',                     0, 'https://www.orderease.com/community/the-2025-guide-to-costco-edi-compliance-automation-chargeback-prevention'),
  ('costco',  'appointment', 'Scheduled appointment window; 30-minute grace then refusal',                                  'Refused delivery -> reduced future allocation',        1, 'https://www.chep.com/files/download/costco-delivery-driver-guidelines-kemps-creek-depot-july-21.pdf'),
  ('costco',  'carton',      '50 lb max if hand-lifted; 1500 lbs crush <750lb load, 2500 lbs >=750lb load',                 'Non-compliant packaging 2% chargeback',                1, 'https://www.clubstorepackaging.com/post/costco-packaging-specifications-requirements'),
  -- Whole Foods (WFM-only)
  ('whole_foods', 'label',  'GS1-128, regional spec varies',                                                                'Regional fragmentation — opaque deductions',           0, 'https://www.spscommerce.com/community/articles/how-to-navigate-the-whole-foods-supplier-portal'),
  ('whole_foods', 'asn',    'EDI 850/855/810/856/997',                                                                      'Inferred',                                             0, NULL),
  ('whole_foods', 'carton', 'Category-specific (Center Store, Perishable, Adult Beverage, Culinary)',                       'Inferred',                                             0, NULL),
  ('whole_foods', 'otif',   'No published OTIF program',                                                                    NULL,                                                   0, NULL),
  -- UNFI
  ('unfi', 'label',       'Standard grocery GS1-128 with UPC/lot/best-by',                                                  'Inferred',                                             0, NULL),
  ('unfi', 'asn',         'EDI 856 required',                                                                               'Inferred',                                             0, NULL),
  ('unfi', 'otif',        '95% fill-rate; service-level fine if missed two consecutive weeks',                              '3% service-level fine',                                1, 'https://www.spscommerce.com/community/articles/how-natural-suppliers-dispute-unfi-deductions'),
  ('unfi', 'appointment', 'Natural side: 1 day notice; Conventional: 3 days',                                               '$300 short-notice reschedule, $500 no-show',           1, 'https://www.spscommerce.com/community/articles/how-natural-suppliers-dispute-unfi-deductions'),
  -- KeHE
  ('kehe', 'label',  'GS1-128 standard with required fields',                                                               'Label fines via K-Solve',                              0, NULL),
  ('kehe', 'asn',    'EDI 856 required pre-arrival',                                                                        'ASN late = chargeback',                                0, NULL),
  ('kehe', 'otif',   'On-time delivery; UDR triggers on shortage/over/damage at receipt',                                   '48-hour UDR response window',                          1, 'https://tryintercept.com/blog/kehe-deductions'),
  ('kehe', 'carton', 'Standard carton requirements',                                                                        'Connect BI fee 2% of sales',                           1, 'https://tryintercept.com/blog/kehe-deductions'),
  -- Southside Grocers (Wegmans archetype)
  ('southside_grocers', 'label',  'GS1-128 case labels with lot/catch weight/expiration; SSCC pallet labels two per pallet','Routing-guide inferred',                               0, NULL),
  ('southside_grocers', 'pallet', '4-way pallet condition standards',                                                       'Inferred',                                             0, NULL),
  ('southside_grocers', 'asn',    'EDI 850/855/810/997; ASN entry via supplier portal',                                     'Inferred',                                             0, NULL),
  ('southside_grocers', 'carton', 'Carton size/weight limits, one-PO-per-carton',                                           'Inferred',                                             0, NULL),
  -- Green Basket Market (Sprouts archetype)
  ('green_basket_market', 'label',       'GS1-128 (UCC-128) shipping labels required',                                      'Inferred',                                             0, NULL),
  ('green_basket_market', 'asn',         'EDI 850/855/860/856/810/812/997 mandatory',                                       'Inferred',                                             0, NULL),
  ('green_basket_market', 'carton',      'Standard carton requirements',                                                    'Inferred',                                             0, NULL),
  ('green_basket_market', 'appointment', 'Refresh / category-reset calendar drives placement timing',                       'Free Fill / Fair Share billbacks per reset',           0, NULL),
  -- Prairie Provisions (generic regional)
  ('prairie_provisions', 'label',  'Standard grocery GS1-128',                                                              'Inferred',                                             0, NULL),
  ('prairie_provisions', 'asn',    'EDI 856 expected',                                                                      'Inferred',                                             0, NULL),
  ('prairie_provisions', 'pallet', 'Standard pallet condition',                                                             'Inferred',                                             0, NULL),
  ('prairie_provisions', 'carton', 'Standard carton requirements',                                                          'Inferred',                                             0, NULL),
  -- Mountain Pantry Co (generic regional)
  ('mountain_pantry_co', 'label',  'Standard grocery GS1-128',                                                              'Inferred',                                             0, NULL),
  ('mountain_pantry_co', 'asn',    'EDI 856 expected',                                                                      'Inferred',                                             0, NULL),
  ('mountain_pantry_co', 'pallet', 'Standard pallet condition',                                                             'Inferred',                                             0, NULL),
  ('mountain_pantry_co', 'carton', 'Standard carton requirements',                                                          'Inferred',                                             0, NULL),
  -- Harbor Fresh (generic regional)
  ('harbor_fresh', 'label',  'Standard grocery GS1-128',                                                                    'Inferred',                                             0, NULL),
  ('harbor_fresh', 'asn',    'EDI 856 expected',                                                                            'Inferred',                                             0, NULL),
  ('harbor_fresh', 'pallet', 'Standard pallet condition',                                                                   'Inferred',                                             0, NULL),
  ('harbor_fresh', 'carton', 'Standard carton requirements',                                                                'Inferred',                                             0, NULL);

-- ---------- evidence_requirements ----------
-- What documents each retailer requires per deduction type to accept a dispute.
-- Feeds the dispute builder's "what you have vs. what you need" view.
-- Only major retailers with published/known requirements get full rows;
-- regional chains get a minimal set inferred from industry norms.

INSERT INTO evidence_requirements (retailer_id, deduction_type, document_type, is_required, notes) VALUES
  -- Walmart short_ship
  ('walmart', 'short_ship', 'signed_bol', 1, 'Must show no shortage at pickup'),
  ('walmart', 'short_ship', 'signed_pod', 1, 'Proof of full delivery'),
  ('walmart', 'short_ship', 'packing_list', 1, 'Case count verification'),
  ('walmart', 'short_ship', 'asn_edi_856', 0, 'Supporting — shows what was declared shipped'),
  -- Walmart damaged
  ('walmart', 'damaged', 'signed_bol', 1, 'Must show no damage notation at pickup'),
  ('walmart', 'damaged', 'pallet_photo', 0, 'Supporting — load condition at ship'),
  ('walmart', 'damaged', 'carrier_inspection', 0, 'Supporting — carrier liability proof'),
  -- Walmart late_delivery
  ('walmart', 'late_delivery', 'signed_pod', 1, 'Delivery timestamp proof'),
  ('walmart', 'late_delivery', 'carrier_tracking', 1, 'Transit timeline'),
  ('walmart', 'late_delivery', 'asn_edi_856', 0, 'Supporting — ship timestamp'),
  -- Walmart promo_billback
  ('walmart', 'promo_billback', 'deal_sheet', 1, 'Signed promo agreement'),
  ('walmart', 'promo_billback', 'purchase_order', 0, 'Supporting — PO confirms promo terms'),
  -- Walmart early_delivery
  ('walmart', 'early_delivery', 'signed_pod', 1, 'Delivery timestamp proof'),
  ('walmart', 'early_delivery', 'carrier_tracking', 1, 'Shows actual vs scheduled'),
  -- Walmart freight_routing
  ('walmart', 'freight_routing', 'signed_bol', 1, 'Routing compliance proof'),
  ('walmart', 'freight_routing', 'carrier_tracking', 1, 'Route taken'),
  ('walmart', 'freight_routing', 'weight_ticket', 0, 'Supporting — accessorial disputes'),
  -- Walmart pricing_invoice
  ('walmart', 'pricing_invoice', 'purchase_order', 1, 'PO with agreed price'),
  ('walmart', 'pricing_invoice', 'invoice', 1, 'Invoice showing billed price'),
  -- Walmart duplicate_deduction
  ('walmart', 'duplicate_deduction', 'remittance_advice', 1, 'Both remittances showing same deduction'),
  -- Walmart wrong_brand
  ('walmart', 'wrong_brand', 'remittance_advice', 1, 'Shows deduction details'),
  ('walmart', 'wrong_brand', 'purchase_order', 1, 'Proves item not on Cinderhaven PO'),
  -- Walmart warehouse_spoils
  ('walmart', 'warehouse_spoils', 'signed_bol', 1, 'Condition at pickup'),
  ('walmart', 'warehouse_spoils', 'temperature_log', 0, 'Supporting — cold chain proof'),
  -- Walmart returns_unsaleables
  ('walmart', 'returns_unsaleables', 'signed_bol', 1, 'Original shipment condition'),
  ('walmart', 'returns_unsaleables', 'pallet_photo', 0, 'Supporting — product condition'),

  -- Costco short_ship
  ('costco', 'short_ship', 'signed_bol', 1, 'No shortage at pickup'),
  ('costco', 'short_ship', 'packing_list', 1, 'Case count'),
  -- Costco damaged
  ('costco', 'damaged', 'signed_bol', 1, 'No damage at pickup'),
  ('costco', 'damaged', 'pallet_photo', 0, 'Load condition'),
  -- Costco duplicate_deduction
  ('costco', 'duplicate_deduction', 'remittance_advice', 1, 'Both remittances'),
  -- Costco wrong_brand
  ('costco', 'wrong_brand', 'remittance_advice', 1, 'Deduction details'),
  ('costco', 'wrong_brand', 'purchase_order', 1, 'Proves not Cinderhaven item'),

  -- UNFI short_ship
  ('unfi', 'short_ship', 'signed_bol', 1, 'No shortage at pickup'),
  ('unfi', 'short_ship', 'packing_list', 1, 'Case count — must be in .xlsb format'),
  -- UNFI promo_billback
  ('unfi', 'promo_billback', 'deal_sheet', 1, 'MCB agreement backup'),
  -- UNFI duplicate_deduction
  ('unfi', 'duplicate_deduction', 'remittance_advice', 1, 'Both deduction references'),
  -- UNFI wrong_brand
  ('unfi', 'wrong_brand', 'remittance_advice', 1, 'Deduction details'),
  ('unfi', 'wrong_brand', 'purchase_order', 1, 'Proves not Cinderhaven item'),

  -- KeHE short_ship (48-hour UDR)
  ('kehe', 'short_ship', 'signed_bol', 1, 'Must respond within 48 hours'),
  ('kehe', 'short_ship', 'packing_list', 1, 'Case count verification'),
  -- KeHE promo_billback
  ('kehe', 'promo_billback', 'deal_sheet', 1, 'MCB agreement + terms'),
  -- KeHE duplicate_deduction
  ('kehe', 'duplicate_deduction', 'remittance_advice', 1, 'Both deduction references'),
  -- KeHE wrong_brand
  ('kehe', 'wrong_brand', 'remittance_advice', 1, 'Deduction details'),
  ('kehe', 'wrong_brand', 'purchase_order', 1, 'Proves not Cinderhaven item');
