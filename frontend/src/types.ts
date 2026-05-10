// JSON data shapes from data/json/. Mirrors the structure produced by
// scripts/20_export_json.py — keep in sync if that script changes.

export interface Window {
  start: string;
  end: string;
  months: number;
}

export interface Totals {
  deductions_count: number;
  deductions_dollar: number;
  annualized_dollar: number;
  disputes_filed: number;
  disputes_recovered: number;
  recovery_rate: number;
  labor_hours: number;
  fte_equivalent: number;
  orders_count: number;
  orders_dollar: number;
  deductions_no_dispute_count: number;
  deductions_no_dispute_dollar: number;
}

export interface ByType {
  deduction_type: string;
  count: number;
  dollar: number;
  pct_count: number;
  pct_dollars: number;
}

export interface ByRetailer {
  retailer_id: string;
  name: string;
  channel_type: string;
  deductions: number;
  dollar: number;
  recovered: number;
  recovery_rate: number;
}

export interface ByOutcome {
  outcome: string;
  count: number;
  dollar: number;
}

export interface ByEvidenceQuality {
  evidence_quality: string;
  count: number;
}

export interface Summary {
  window: Window;
  totals: Totals;
  by_type: ByType[];
  by_retailer: ByRetailer[];
  by_outcome: ByOutcome[];
  by_evidence_quality: ByEvidenceQuality[];
}

export interface RetailerRef {
  id: string;
  name: string;
  channel_type: string;
}

export interface CodeRef {
  id: string;
  code: string;
  name: string;
  is_published: boolean;
}

export interface OrderRef {
  order_id: string;
  po_number: string;
  po_date: string;
  total_units: number;
  total_value: number;
  requested_ship_date: string;
  requested_delivery_window_end: string | null;
}

export interface PackRecord {
  label_type_used: string;
  label_scannable: boolean;
  pack_verification: string;
  evidence_format: string;
  evidence_location: string | null;
  evidence_retrieval_minutes: number | null;
  packer_initials: string;
  units_picked: number;
  units_packed: number;
  units_pick_pack_match: boolean;
}

export interface Shipment {
  shipment_id: string;
  ship_date: string;
  delivery_date: string | null;
  carrier: string;
  bol_signed: boolean;
  bol_signed_short: boolean;
  bol_signed_damaged: boolean;
  pod_received: boolean;
  asn_sent: boolean;
  asn_sent_late: boolean;
  units_shipped: number;
  pallets_shipped: number;
}

export interface Evidence {
  type: string;
  submitted: boolean;
  required: boolean;
  format: string | null;
  notes: string | null;
}

export interface Dispute {
  dispute_id: string;
  filed_date: string | null;
  filing_method: string | null;
  evidence_quality: string;
  submitted_evidence_count: number;
  was_within_deadline: boolean | null;
  outcome: string;
  recovered_amount: number;
  closed_date: string | null;
  labor_hours: number;
  evidence: Evidence[];
}

export interface PostAudit {
  claim_id: string;
  auditor_name: string | null;
  audit_period_start: string;
  audit_period_end: string;
  claim_type: string;
  lookback_months: number;
}

export interface EvidenceDocument {
  document_type: string;
  status: string;
  format: string | null;
  location: string | null;
  has_required_metadata: boolean;
  retrieval_minutes: number | null;
  expires_at: string | null;
  is_expired: boolean;
}

export interface Deduction {
  deduction_id: string;
  deduction_type: string;
  code_as_remitted: string;
  remittance_description: string;
  amount: number;
  deduction_date: string;
  dispute_deadline: string | null;
  is_vague: boolean;
  is_post_audit: boolean;
  remittance_id: string | null;
  retailer: RetailerRef;
  code: CodeRef | null;
  order: OrderRef | null;
  pack_record: PackRecord | null;
  shipment: Shipment | null;
  dispute: Dispute | null;
  post_audit: PostAudit | null;
  evidence_inventory: EvidenceDocument[];
  evidence_retrieval_cost_hours: number | null;
}

export interface RetailerRule {
  dispute_window_days: number | null;
  auto_deduct: boolean;
  evidence_required: string[];
  typical_recovery_rate: number;
  notes: string;
}

export interface RetailerCode {
  code_id: string;
  code: string;
  name: string;
  deduction_type: string;
  is_published: boolean;
}

export interface EdiRequirement {
  category: string;
  requirement: string;
  penalty_if_violated: string | null;
  is_verified: boolean;
  source_url: string | null;
}

export interface Retailer {
  name: string;
  channel_type: string;
  dispute_portal_name: string | null;
  dispute_portal_url: string | null;
  dispute_method: string | null;
  deduction_aggressiveness: number | null;
  notes: string;
  rules: Record<string, RetailerRule>;
  codes: RetailerCode[];
  edi_requirements: EdiRequirement[];
}

export type RetailersById = Record<string, Retailer>;
