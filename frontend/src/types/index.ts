export interface WorkRecord {
  work_id: string;
  work_category: string;
  State: string;
  Constituency: string;
  state: string;
  constituency: string;
  mp_name?: string;
  description: string;
  sanction_amount: number;
  effective_expenditure?: number;
  peer_category_median_amount?: number;
  peer_median?: number;
  amount_to_peer_ratio?: number;
  category_percentile?: number;
  has_evidence_image?: boolean;
  top_vendor?: string;
  top_vendor_share?: number;
  financial_risk_score: number;
  financial_risk_level: string;
  financial_explanation?: string;
  vendor_risk_score: number;
  vendor_risk_level: string;
  vendor_risk_explanation?: string;
  vendor_risk_interpretation?: string;
  project_hhi?: number;
  single_disbursal_ratio?: number;
  rapid_disbursal_burst_flag?: boolean;
  burst_tx_count?: number;
  duplicate_risk_score: number;
  compliance_risk_score: number;
  compliance_risk_level: string;
  compliance_explanation?: string;
  schedule_risk_score: number;
  schedule_risk_level: string;
  schedule_explanation?: string;
  expected_timeline_progress_pct?: number;
  expenditure_progress_pct?: number;
  progress_gap_pct?: number;
  overdue_days?: number;
  composite_risk_score: number;
  overall_risk_level: string;
  explainable_audit_summary?: string;
  recommended_reviewer_action?: string;
  sanction_date?: string;
  estimated_completion_date?: string;
  completion_date?: string;
  model_name?: string;
  model_version?: string;
  dataset_snapshot?: string;
  last_analyzed_at?: string;
}

export interface CandidateDuplicatePair {
  work_id_1: string;
  work_id_2: string;
  state: string;
  constituency: string;
  similarity_score: number;
  sanction_amount_1: number;
  sanction_amount_2: number;
  description_1: string;
  description_2: string;
  sanction_date_1?: string;
  sanction_date_2?: string;
  duplicate_risk_level?: string;
  nlp_explanation?: string;
}

export interface NationalOverviewResponse {
  summary: {
    total_allocated_funds: number;
    total_sanctioned_amount: number;
    total_disbursed_amount: number;
    total_works: number;
    completed_works: number;
    high_risk_works: number;
    critical_works: number;
  };
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  top_states: Array<{
    state: string;
    total_works: number;
    total_sanctioned: number;
    total_disbursed?: number;
    high_risk_works: number;
  }>;
  category_distribution: Array<{
    work_category: string;
    total_works: number;
    total_sanctioned: number;
    high_risk_works: number;
  }>;
}

export interface MpIntelligenceResponse {
  selected_filters: {
    state: string | null;
    constituency: string | null;
    mp_name: string | null;
  };
  available_constituencies: string[];
  available_mps: string[];
  portfolio_summary: {
    total_works: number;
    completed_works: number;
    ongoing_works: number;
    total_sanctioned: number;
    total_expenditure: number;
    utilization_rate: number;
  };
  suspicious_works: WorkRecord[];
}

export interface SyncStatusResponse {
  operational_status: string;
  sync_frequency: string;
  last_sync: string;
  next_scheduled_sync: string;
  current_snapshot_id: string;
  total_records_processed: number;
  new_records_since_last_sync: number;
  updated_records_since_last_sync: number;
  snapshot_count: number;
}

export interface ModelStatusResponse {
  experiment_name: string;
  registered_model: string;
  production_model: {
    model_name: string;
    model_version: string;
    run_id: string;
    stage: string;
    dataset_version: string;
    last_trained_at: string;
  };
  runs: Array<{
    run_id: string;
    timestamp: string;
    version: string;
    stage: string;
    algorithm: string;
    dataset_version?: string;
    parameters: Record<string, any>;
    metrics: Record<string, any>;
  }>;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  total_pages?: number;
  records: T[];
}

export interface FilterOptions {
  states: string[];
  constituencies?: string[];
  mps?: string[];
  categories: string[];
  severities: string[];
}
