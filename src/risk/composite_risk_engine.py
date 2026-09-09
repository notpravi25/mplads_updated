import os
import pandas as pd
import numpy as np

def run_composite_risk_engine():
    features_dir = r"c:\Users\user\Documents\SIH2026\data\features"
    
    master_path = os.path.join(features_dir, "master_analytical.parquet")
    fin_path = os.path.join(features_dir, "financial_anomalies.parquet")
    ven_path = os.path.join(features_dir, "vendor_risk_analysis.parquet")
    dup_path = os.path.join(features_dir, "work_duplicate_scores.parquet")
    comp_path = os.path.join(features_dir, "compliance_risk_analysis.parquet")
    sched_path = os.path.join(features_dir, "schedule_risk_analysis.parquet")
    
    print("=== EXECUTING PHASE 3: COMPOSITE RISK INTELLIGENCE & ALERT ENGINE ===")
    
    # Load base master
    df_base = pd.read_parquet(master_path)
    print(f"Loaded master project base: {len(df_base):,} works")
    
    # 1. Merge Financial Risk
    if os.path.exists(fin_path):
        fin_df = pd.read_parquet(fin_path)[["work_id", "financial_risk_score", "financial_risk_level", "financial_explanation", "model_name", "model_version", "dataset_snapshot", "last_analyzed_at"]].drop_duplicates("work_id")
        df_base = pd.merge(df_base, fin_df, on="work_id", how="left")
    else:
        df_base["financial_risk_score"] = 0.0
        df_base["financial_risk_level"] = "LOW"
        df_base["financial_explanation"] = ""
        df_base["model_name"] = "MPLADS_Financial_Anomaly_Model"
        df_base["model_version"] = "v2"
        df_base["dataset_snapshot"] = "SNAP-2026-09-09"

    # 2. Merge Vendor Risk
    if os.path.exists(ven_path):
        ven_cols = ["work_id", "vendor_risk_score", "vendor_risk_level", "vendor_risk_explanation", "vendor_risk_interpretation", "project_hhi", "single_disbursal_ratio", "rapid_disbursal_burst_flag", "burst_tx_count"]
        ven_df = pd.read_parquet(ven_path)
        existing_ven_cols = [c for c in ven_cols if c in ven_df.columns]
        ven_df = ven_df[existing_ven_cols].drop_duplicates("work_id")
        df_base = pd.merge(df_base, ven_df, on="work_id", how="left")
    else:
        df_base["vendor_risk_score"] = 0.0
        df_base["vendor_risk_level"] = "LOW"
        df_base["vendor_risk_explanation"] = ""
        df_base["vendor_risk_interpretation"] = ""
        df_base["project_hhi"] = 10000.0
        df_base["single_disbursal_ratio"] = 100.0
        df_base["rapid_disbursal_burst_flag"] = False
        df_base["burst_tx_count"] = 0

    # 3. Merge Duplicate Risk
    if os.path.exists(dup_path):
        dup_df = pd.read_parquet(dup_path)[["work_id", "duplicate_risk_score"]].drop_duplicates("work_id")
        df_base = pd.merge(df_base, dup_df, on="work_id", how="left")
    else:
        df_base["duplicate_risk_score"] = 0.0

    # 4. Merge Compliance Risk
    if os.path.exists(comp_path):
        comp_df = pd.read_parquet(comp_path)[["work_id", "compliance_risk_score", "compliance_risk_level", "compliance_explanation"]].drop_duplicates("work_id")
        df_base = pd.merge(df_base, comp_df, on="work_id", how="left")
    else:
        df_base["compliance_risk_score"] = 0.0
        df_base["compliance_risk_level"] = "LOW"
        df_base["compliance_explanation"] = ""

    # 5. Merge Schedule Risk
    if os.path.exists(sched_path):
        sched_df = pd.read_parquet(sched_path)[["work_id", "schedule_risk_score", "schedule_risk_level", "schedule_explanation", "expected_timeline_progress_pct", "expenditure_progress_pct", "progress_gap_pct", "overdue_days"]].drop_duplicates("work_id")
        df_base = pd.merge(df_base, sched_df, on="work_id", how="left")
    else:
        df_base["schedule_risk_score"] = 0.0
        df_base["schedule_risk_level"] = "LOW"
        df_base["schedule_explanation"] = ""

    # Fill NaNs in risk scores safely
    df_base["financial_risk_score"] = df_base["financial_risk_score"].fillna(0)
    df_base["vendor_risk_score"] = df_base["vendor_risk_score"].fillna(0)
    df_base["duplicate_risk_score"] = df_base["duplicate_risk_score"].fillna(0)
    df_base["compliance_risk_score"] = df_base["compliance_risk_score"].fillna(0)
    df_base["schedule_risk_score"] = df_base["schedule_risk_score"].fillna(0)

    # 6. Composite Risk Weighting Formula (Financial 30%, Vendor 20%, Duplicate 20%, Compliance 15%, Schedule 15%)
    w_fin, w_ven, w_dup, w_comp, w_sched = 0.30, 0.20, 0.20, 0.15, 0.15
    
    df_base["composite_risk_score"] = (
        (w_fin * df_base["financial_risk_score"]) +
        (w_ven * df_base["vendor_risk_score"]) +
        (w_dup * df_base["duplicate_risk_score"]) +
        (w_comp * df_base["compliance_risk_score"]) +
        (w_sched * df_base["schedule_risk_score"])
    ).round(1)

    # Compute Financial Impact Score (Public Funds at Risk) = Composite Risk * Unspent Sanction Amount (in Lakhs)
    sanction_val = df_base["sanction_amount"].fillna(0)
    expend_val = df_base["effective_expenditure"].fillna(0) if "effective_expenditure" in df_base.columns else 0
    unspent_lakhs = (sanction_val - expend_val).clip(lower=0) / 100000.0
    
    df_base["impact_score"] = (df_base["composite_risk_score"] * (unspent_lakhs + 1.0)).round(1)

    def assign_overall_level(score):
        if score >= 85:
            return "CRITICAL"
        elif score >= 65:
            return "HIGH"
        elif score >= 35:
            return "MEDIUM"
        return "LOW"

    df_base["overall_risk_level"] = df_base["composite_risk_score"].apply(assign_overall_level)
    df_base["requires_audit_action"] = df_base["composite_risk_score"] >= 35


    # 7. Ranked "Why Flagged?" Evidence Explanations Generator
    print("Generating ranked explainable audit summaries & recommended reviewer actions...")
    
    f_exp = df_base["financial_explanation"].fillna("").astype(str) if "financial_explanation" in df_base.columns else pd.Series([""]*len(df_base))
    v_exp = df_base["vendor_risk_explanation"].fillna("").astype(str) if "vendor_risk_explanation" in df_base.columns else pd.Series([""]*len(df_base))
    c_exp = df_base["compliance_explanation"].fillna("").astype(str) if "compliance_explanation" in df_base.columns else pd.Series([""]*len(df_base))
    s_exp = df_base["schedule_explanation"].fillna("").astype(str) if "schedule_explanation" in df_base.columns else pd.Series([""]*len(df_base))

    f_high = df_base["financial_risk_score"] >= 65
    v_high = df_base["vendor_risk_score"] >= 65
    d_high = df_base["duplicate_risk_score"] >= 85
    c_high = df_base["compliance_risk_score"] >= 35
    s_high = df_base["schedule_risk_score"] >= 35

    f_driver = np.where(f_high, "Financial Anomaly: " + f_exp, "")
    v_driver = np.where(v_high, "Vendor Risk: " + v_exp, "")
    d_driver = np.where(d_high, "Candidate Duplicate: " + df_base["duplicate_risk_score"].round(1).astype(str) + "% text match", "")
    c_driver = np.where(c_high, "Compliance Gap: " + c_exp, "")
    s_driver = np.where(s_high, "Schedule Risk: " + s_exp, "")

    f_act = np.where(f_high, "Verify sanction budget against peer category baseline", "")
    v_act = np.where(v_high, "Audit vendor allocation share and payment disbursal log", "")
    d_act = np.where(d_high, "Review candidate duplicate project to rule out double-funding", "")
    c_act = np.where(c_high, "Request physical site evidence photo & missing compliance metadata", "")
    s_act = np.where(s_high, "Request physical progress report from Executive Engineer", "")

    def join_text(t1, t2, t3, t4, t5, fallback):
        parts = [p for p in [t1, t2, t3, t4, t5] if p != ""]
        if not parts:
            return fallback
        return " | ".join(parts)

    df_base["explainable_audit_summary"] = np.vectorize(join_text)(
        f_driver, v_driver, d_driver, c_driver, s_driver, "All financial, vendor, duplicate, compliance, and schedule parameters within standard operational limits."
    )
    
    df_base["recommended_reviewer_action"] = np.vectorize(join_text)(
        f_act, v_act, d_act, c_act, s_act, "Standard periodic monitoring."
    )

    out_file = os.path.join(features_dir, "master_project_risk_scores.parquet")
    df_base.to_parquet(out_file, index=False)
    
    print("\n=== PHASE 3 COMPOSITE RISK ENGINE SUMMARY ===")
    print(f"Total Projects Processed: {len(df_base):,}")
    print("Overall Composite Risk Level Breakdown:")
    print(df_base["overall_risk_level"].value_counts().to_string())
    print(f"\nProjects Requiring Review (Risk Score >= 35): {df_base['requires_audit_action'].sum():,}")
    print(f"High Risk Projects (Risk Score >= 65): {(df_base['composite_risk_score'] >= 65).sum():,}")
    print(f"Critical Action Items (Risk Score >= 85): {(df_base['overall_risk_level'] == 'CRITICAL').sum():,}")
    print(f"Master Risk Database saved to: {out_file}")

if __name__ == "__main__":
    run_composite_risk_engine()

