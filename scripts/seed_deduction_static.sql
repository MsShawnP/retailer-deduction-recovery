-- Static seed data for retailer-deduction-recovery.
-- Loads retailers, retailer_rules, deduction_codes, edi_requirements.
-- Run after seed_deduction_schema.sql.
--
-- Recovery rates and inferred values are calibration choices for
-- synthetic data; flagged in `notes` where unverified. See
-- research/retailers/<slug>.md for sources.

-- ---------- retailers ----------
INSERT INTO retailers (retailer_id, name, channel_type, dispute_portal_name, dispute_portal_url, dispute_method, notes) VALUES
  ('walmart',     'Walmart',                'retailer',    'Retail Link / APDP / HighRadius',     'https://retaillink.wal-mart.com/',     'portal',       'Multiple systems by deduction type — APDP for AP shortages/allowances, HighRadius for AR/OTIF'),
  ('costco',      'Costco',                 'retailer',    'Costco Vendor Portal',                'https://fssts.costco.com/',            'portal',       'Lower-tech than Walmart; depot cross-dock model'),
  ('whole_foods', 'Whole Foods',            'retailer',    'VIP / Smartsheet',                    'https://vip.wholefoods.com',           'email_excel',  'Pay-by-PO program gates dispute access; regional fragmentation'),
  ('unfi',        'UNFI',                   'distributor', 'Email + Excel template (Natural)',    NULL,                                   'email_excel',  'Natural side: Deductions@unfi.com — .xlsb only, PDFs/screenshots rejected'),
  ('kehe',        'KeHE',                   'distributor', 'K-Solve in KeHE CONNECT Supplier',    'https://connectsupplier.kehe.com/',    'portal',       '180-day cap (newly strict); 48-hour UDR response window'),
  ('wegmans',     'Wegmans',                'retailer',    'Email + buyer relationship',          NULL,                                   'email_buyer',  'AccountsPayable@wegmans.com or category buyer; specialty-friendly'),
  ('sprouts',     'Sprouts Farmers Market', 'retailer',    'Workday Supplier Portal',             'https://vendors.sprouts.com',          'mixed',        'Workday for AP; many deductions arrive via UNFI/KeHE statements'),
  ('dtc',         'DTC',                    'dtc',         NULL,                                  NULL,                                   NULL,           'Direct-to-consumer; no deduction model');

-- ---------- retailer_rules ----------
-- 7 deduction_types per retailer (DTC excluded). dispute_window_days NULL where not published.
-- typical_recovery_rate is a per-retailer baseline for the simulation; actual
-- per-deduction outcome depends on evidence quality and timeliness.

INSERT INTO retailer_rules (retailer_id, deduction_type, dispute_window_days, auto_deduct, evidence_required, typical_recovery_rate, notes) VALUES
  -- Walmart
  ('walmart', 'short_ship',     365,  1, 'signed_bol,pod,pack_log',          0.45, 'Verified — APDP 12-month window for codes 21–28'),
  ('walmart', 'label_fine',     NULL, 1, 'label_scan,pack_log',              0.20, 'SQEP fines; window not separately published'),
  ('walmart', 'pallet_fine',    NULL, 1, 'photo,pack_log',                   0.20, 'SQEP Phase 3; $200 admin + $4/pallet'),
  ('walmart', 'damaged',        365,  1, 'signed_bol,photo',                 0.55, 'Code 28; same APDP window as shortage'),
  ('walmart', 'late_delivery',  NULL, 1, 'pod,asn_confirmation',             0.30, 'OTIF; 3% of COGS; HighRadius dispute window not verified'),
  ('walmart', 'promo_billback', 730,  0, 'promo_agreement',                  0.50, 'Allowance — 24-month APDP window'),
  ('walmart', 'vague',          NULL, 1, 'pack_log',                         0.10, 'Code 87 catch-all'),
  -- Costco
  ('costco',  'short_ship',     NULL, 1, 'signed_bol,pack_log',              0.40, 'Windows not published; inferred industry norm'),
  ('costco',  'label_fine',     NULL, 1, 'label_scan',                       0.20, 'GS1-128/SSCC; not published'),
  ('costco',  'pallet_fine',    NULL, 1, 'photo',                            0.20, 'Lean/overhang/underhang; not published'),
  ('costco',  'damaged',        NULL, 1, 'signed_bol,photo',                 0.50, 'Inferred'),
  ('costco',  'late_delivery',  NULL, 1, 'pod',                              0.25, '30-min grace at depot then refusal'),
  ('costco',  'promo_billback', NULL, 0, 'promo_agreement',                  0.40, 'Inferred'),
  ('costco',  'vague',          NULL, 1, 'pack_log',                         0.10, 'Inferred'),
  -- Whole Foods (WFM-only scope)
  ('whole_foods', 'short_ship',     NULL, 0, 'signed_bol,pack_log',         0.40, 'Not published; Pay-by-PO program required'),
  ('whole_foods', 'label_fine',     NULL, 0, 'label_scan',                  0.25, 'Not published'),
  ('whole_foods', 'pallet_fine',    NULL, 0, 'photo',                       0.25, 'Not published'),
  ('whole_foods', 'damaged',        NULL, 0, 'signed_bol,photo',            0.50, 'Not published'),
  ('whole_foods', 'late_delivery',  NULL, 0, 'pod',                         0.30, 'No published OTIF program'),
  ('whole_foods', 'promo_billback', NULL, 0, 'promo_agreement',             0.40, 'Regional fragmentation — different practices per region'),
  ('whole_foods', 'vague',          NULL, 0, 'pack_log',                    0.10, 'Cost-feed mismatches drive opaque deductions'),
  -- UNFI (Natural side)
  ('unfi', 'short_ship',     60,   1, 'signed_bol,pack_log',                0.40, '30–60 day practical window; Excel-only dispute form'),
  ('unfi', 'label_fine',     60,   1, 'label_scan',                         0.25, 'Inferred'),
  ('unfi', 'pallet_fine',    60,   1, 'photo',                              0.25, 'Inferred'),
  ('unfi', 'damaged',        60,   1, 'signed_bol,photo',                   0.45, 'Includes unsaleables'),
  ('unfi', 'late_delivery',  60,   1, 'pod',                                0.30, '$250+ late, $500 no-show, $300 short-notice reschedule'),
  ('unfi', 'promo_billback', 60,   0, 'promo_agreement',                    0.35, 'MCB disputes common; unsubstantiated promo backups'),
  ('unfi', 'vague',          NULL, 1, 'pack_log',                           0.10, 'Vague chargebacks routine; PDFs/screenshots rejected on dispute form'),
  -- KeHE
  ('kehe', 'short_ship',     2,    1, 'signed_bol,pack_log',                0.35, '48-hour UDR window — locks fast'),
  ('kehe', 'label_fine',     180,  1, 'label_scan',                         0.30, 'K-Solve 180-day cap, newly strict'),
  ('kehe', 'pallet_fine',    180,  1, 'photo',                              0.30, 'K-Solve'),
  ('kehe', 'damaged',        180,  1, 'signed_bol,photo',                   0.45, 'K-Solve; UDR for damage at receipt'),
  ('kehe', 'late_delivery',  180,  1, 'pod',                                0.30, 'K-Solve'),
  ('kehe', 'promo_billback', 180,  0, 'promo_agreement',                    0.40, 'MCB + 8% admin fee + $65/DC minimum'),
  ('kehe', 'vague',          180,  1, 'pack_log',                           0.10, 'Connect BI fee 2% of sales falls here'),
  -- Wegmans
  ('wegmans', 'short_ship',     NULL, 0, 'signed_bol,pack_log',             0.50, 'No published window; buyer-relationship dispute path'),
  ('wegmans', 'label_fine',     NULL, 0, 'label_scan',                      0.30, 'GS1-128 inferred from packaging guide'),
  ('wegmans', 'pallet_fine',    NULL, 0, 'photo',                           0.30, '4-way pallet standards inferred'),
  ('wegmans', 'damaged',        NULL, 0, 'signed_bol,photo',                0.55, 'No published window'),
  ('wegmans', 'late_delivery',  NULL, 0, 'pod',                             0.40, 'No published OTIF'),
  ('wegmans', 'promo_billback', NULL, 0, 'promo_agreement',                 0.45, 'No published'),
  ('wegmans', 'vague',          NULL, 0, 'pack_log',                        0.15, 'Specialty-friendly buyer relationship'),
  -- Sprouts
  ('sprouts', 'short_ship',     NULL, 0, 'signed_bol,pack_log',             0.40, 'Many deductions arrive via UNFI/KeHE statements'),
  ('sprouts', 'label_fine',     NULL, 0, 'label_scan',                      0.25, 'GS1-128 required'),
  ('sprouts', 'pallet_fine',    NULL, 0, 'photo',                           0.25, 'Inferred'),
  ('sprouts', 'damaged',        NULL, 0, 'signed_bol,photo',                0.45, 'Inferred'),
  ('sprouts', 'late_delivery',  NULL, 0, 'pod',                             0.30, 'Inferred'),
  ('sprouts', 'promo_billback', NULL, 0, 'promo_agreement',                 0.40, 'Free Fill + Fair Share via BILLBACK MANAGER'),
  ('sprouts', 'vague',          NULL, 0, 'pack_log',                        0.10, 'Inferred');

-- ---------- deduction_codes ----------
-- Walmart codes are publicly documented; KeHE codes mostly documented;
-- Costco / WFM / Wegmans / Sprouts codes inferred (is_published=0) since
-- canonical lists aren't public. UNFI uses 3-letter codes that aren't
-- fully published — representative codes flagged unpublished.

INSERT INTO deduction_codes (code_id, retailer_id, code, name, deduction_type, is_published) VALUES
  -- Walmart (published)
  ('walmart_11', 'walmart', '11', 'Price Difference Between PO & Invoice',          'promo_billback', 1),
  ('walmart_13', 'walmart', '13', 'Substitution Overcharge',                        'short_ship',     1),
  ('walmart_21', 'walmart', '21', 'Concealed Shortage',                             'short_ship',     1),
  ('walmart_22', 'walmart', '22', 'Merchandise Billed Not Shipped',                 'short_ship',     1),
  ('walmart_24', 'walmart', '24', 'Carton Shortage / Freight Bill Signed Short',    'short_ship',     1),
  ('walmart_25', 'walmart', '25', 'No Merchandise Received for Invoice',            'short_ship',     1),
  ('walmart_28', 'walmart', '28', 'Carton Damage – Freight Bill Signed Damaged',    'damaged',        1),
  ('walmart_30', 'walmart', '30', 'Duplicate Billing',                              'vague',          1),
  ('walmart_51', 'walmart', '51', 'Promotional Allowance',                          'promo_billback', 1),
  ('walmart_59', 'walmart', '59', 'Defective Merchandise Allowance',                'damaged',        1),
  ('walmart_87', 'walmart', '87', 'Other',                                          'vague',          1),
  ('walmart_99', 'walmart', '99', 'OTIF',                                           'late_delivery',  1),
  -- Costco (inferred placeholders)
  ('costco_short_ship',     'costco', 'SHRT',  'Shortage at receiving',     'short_ship',     0),
  ('costco_label_fine',     'costco', 'LBL',   'Labeling noncompliance',    'label_fine',     0),
  ('costco_pallet_fine',    'costco', 'PALT',  'Pallet noncompliance',      'pallet_fine',    0),
  ('costco_damaged',        'costco', 'DMG',   'Damaged at receiving',      'damaged',        0),
  ('costco_late_delivery',  'costco', 'LATE',  'Late or refused delivery',  'late_delivery',  0),
  ('costco_promo_billback', 'costco', 'PROMO', 'Promotional allowance',     'promo_billback', 0),
  ('costco_vague',          'costco', 'MISC',  'Miscellaneous deduction',   'vague',          0),
  -- Whole Foods (inferred placeholders)
  ('wholefoods_short_ship',     'whole_foods', 'SHRT',  'Shortage',              'short_ship',     0),
  ('wholefoods_label_fine',     'whole_foods', 'LBL',   'Labeling fine',         'label_fine',     0),
  ('wholefoods_pallet_fine',    'whole_foods', 'PALT',  'Pallet fine',           'pallet_fine',    0),
  ('wholefoods_damaged',        'whole_foods', 'DMG',   'Damaged product',       'damaged',        0),
  ('wholefoods_late_delivery',  'whole_foods', 'LATE',  'Late delivery',         'late_delivery',  0),
  ('wholefoods_promo_billback', 'whole_foods', 'PROMO', 'Promo billback',        'promo_billback', 0),
  ('wholefoods_vague',          'whole_foods', 'MISC', 'Miscellaneous',          'vague',          0),
  -- UNFI (3-letter codes, partially inferred)
  ('unfi_sht', 'unfi', 'SHT', 'Shortage',                                   'short_ship',     0),
  ('unfi_lbl', 'unfi', 'LBL', 'Labeling fine',                              'label_fine',     0),
  ('unfi_plt', 'unfi', 'PLT', 'Pallet noncompliance',                       'pallet_fine',    0),
  ('unfi_dmg', 'unfi', 'DMG', 'Damaged product / unsaleable',               'damaged',        0),
  ('unfi_lat', 'unfi', 'LAT', 'Late delivery',                              'late_delivery',  0),
  ('unfi_mcb', 'unfi', 'MCB', 'Manufacturer chargeback (promo)',            'promo_billback', 0),
  ('unfi_msc', 'unfi', 'MSC', 'Miscellaneous deduction',                    'vague',          0),
  -- KeHE (mostly documented)
  ('kehe_udr',      'kehe', 'UDR',   'Unloading Discrepancy (shortage/over/damage)', 'short_ship',     1),
  ('kehe_mcb',      'kehe', 'MCB',   'Manufacturer Chargeback (promo)',              'promo_billback', 1),
  ('kehe_mcb_fee',  'kehe', 'MCBF',  'MCB admin fee (8%, $65/DC min)',               'promo_billback', 1),
  ('kehe_ep',       'kehe', 'EP',    'Event Promotion fee',                          'promo_billback', 1),
  ('kehe_bi',       'kehe', 'BI',    'Connect BI fee (2% of sales)',                 'vague',          1),
  ('kehe_freight',  'kehe', 'FRT',   'Freight allowance',                            'vague',          1),
  ('kehe_label',    'kehe', 'LBL',   'Labeling noncompliance',                       'label_fine',     0),
  ('kehe_late',     'kehe', 'LATE',  'Late delivery',                                'late_delivery',  0),
  -- Wegmans (inferred)
  ('wegmans_short_ship',     'wegmans', 'SHRT',  'Shortage',         'short_ship',     0),
  ('wegmans_label_fine',     'wegmans', 'LBL',   'Label fine',       'label_fine',     0),
  ('wegmans_pallet_fine',    'wegmans', 'PALT',  'Pallet fine',      'pallet_fine',    0),
  ('wegmans_damaged',        'wegmans', 'DMG',   'Damaged',          'damaged',        0),
  ('wegmans_late_delivery',  'wegmans', 'LATE',  'Late delivery',    'late_delivery',  0),
  ('wegmans_promo_billback', 'wegmans', 'PROMO', 'Promo billback',   'promo_billback', 0),
  ('wegmans_vague',          'wegmans', 'MISC',  'Miscellaneous',    'vague',          0),
  -- Sprouts (inferred + named billback codes)
  ('sprouts_short_ship',     'sprouts', 'SHRT', 'Shortage',                       'short_ship',     0),
  ('sprouts_label_fine',     'sprouts', 'LBL',  'Label fine',                     'label_fine',     0),
  ('sprouts_pallet_fine',    'sprouts', 'PALT', 'Pallet fine',                    'pallet_fine',    0),
  ('sprouts_damaged',        'sprouts', 'DMG',  'Damaged',                        'damaged',        0),
  ('sprouts_late_delivery',  'sprouts', 'LATE', 'Late delivery',                  'late_delivery',  0),
  ('sprouts_freefill',       'sprouts', 'FFL',  'Free Fill new-item billback',    'promo_billback', 0),
  ('sprouts_fairshare',      'sprouts', 'FAIR', 'Fair Share reset billback',      'promo_billback', 0),
  ('sprouts_vague',          'sprouts', 'MISC', 'Miscellaneous',                  'vague',          0);

-- ---------- edi_requirements ----------
-- Compliance specs per retailer. Used to render retailer-rule cards in the UI
-- and to seed pack_records (label compliance, pallet compliance, etc.).

INSERT INTO edi_requirements (retailer_id, category, requirement, penalty_if_violated, is_verified, source_url) VALUES
  -- Walmart
  ('walmart', 'label',       'GS1-128 case labels with Walmart-required fields, two per case',                              '$200 admin + $1/case (SQEP Phase 2)',                  1, 'https://supplierwiki.supplypike.com/articles/calculating-sqep-fines-by-defect'),
  ('walmart', 'pallet',      'Walmart pallet spec, slip-sheet/wrap, height limits',                                         '$200 admin + $4/pallet (SQEP Phase 3)',                1, 'https://supplierwiki.supplypike.com/articles/calculating-sqep-fines-by-defect'),
  ('walmart', 'asn',         'EDI 856 ASN required before shipment arrives',                                                '$25/PO if not downloaded (SQEP Phase 1, non-DSDC)',    1, 'https://supplierwiki.supplypike.com/articles/calculating-sqep-fines-by-defect'),
  ('walmart', 'otif',        'Prepaid 90% / Collect 98% on-time, 95% in-full',                                              '3% of COGS on non-compliant cases',                    1, 'https://vendormint.com/walmart-on-time-in-full-otif-compliance/'),
  ('walmart', 'carton',      'Walmart-spec carton dimensions and labeling',                                                 'Code 22 perceived shortage if not scannable',          1, 'https://www.8thandwalton.com/blog/walmart-deduction-codes/'),
  -- Costco
  ('costco',  'label',       'GS1-128/SSCC, on two adjacent sides; vendor#, PO, item, qty, weight, destination',            '$50–$150/carton (inferred)',                           0, 'https://www.orderease.com/community/the-2025-guide-to-costco-edi-compliance-automation-chargeback-prevention'),
  ('costco',  'pallet',      '48x40 footprint; 58 inch max height; iGPS/PECO/CHEP only — no GMA #1 stringer',               'Lean/overhang/underhang chargeback',                   1, 'https://www.clubstorepackaging.com/post/costco-packaging-specifications-requirements'),
  ('costco',  'asn',         'EDI 856 via SPS Commerce VAN',                                                                '$50–$200 per incident (inferred)',                     0, 'https://www.orderease.com/community/the-2025-guide-to-costco-edi-compliance-automation-chargeback-prevention'),
  ('costco',  'appointment', 'Scheduled appointment window; 30-minute grace then refusal',                                  'Refused delivery → reduced future allocation',         1, 'https://www.chep.com/files/download/costco-delivery-driver-guidelines-kemps-creek-depot-july-21.pdf'),
  ('costco',  'carton',      '50 lb max if hand-lifted; 1500 lbs crush <750lb load, 2500 lbs ≥750lb load',                  'Non-compliant packaging 2% chargeback',                1, 'https://www.clubstorepackaging.com/post/costco-packaging-specifications-requirements'),
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
  -- Wegmans
  ('wegmans', 'label',  'GS1-128 case labels with lot/catch weight/expiration/CoO; SSCC pallet labels two per pallet',      'Routing-guide inferred',                               1, 'https://www.retailerhub.ai/retailer-compliance/wegmans-packaging-guidelines'),
  ('wegmans', 'pallet', '4-way pallet condition standards',                                                                 'Inferred',                                             1, 'https://www.retailerhub.ai/retailer-compliance/wegmans-packaging-guidelines'),
  ('wegmans', 'asn',    'EDI 850/855/810/997; ASN entry via supplier portal',                                               'Inferred',                                             0, 'https://www.wegmans.com/service/for-our-suppliers'),
  ('wegmans', 'carton', 'Carton size/weight limits, one-PO-per-carton',                                                     'Inferred',                                             1, 'https://www.wegmans.com/service/for-our-suppliers/additional-shipment-information'),
  -- Sprouts
  ('sprouts', 'label',       'GS1-128 (UCC-128) shipping labels required',                                                  'Inferred',                                             1, 'https://www.ezcomsoftware.com/retailer-edi/sprouts-farmers-market-edi/'),
  ('sprouts', 'asn',         'EDI 850/855/860/856/810/812/997 mandatory',                                                   'Inferred',                                             1, 'https://www.ezcomsoftware.com/retailer-edi/sprouts-farmers-market-edi/'),
  ('sprouts', 'carton',      'Standard carton requirements',                                                                'Inferred',                                             0, NULL),
  ('sprouts', 'appointment', 'Refresh / category-reset calendar drives placement timing',                                   'Free Fill / Fair Share billbacks per reset',           1, 'https://about.sprouts.com/full-reset-calendar/');
