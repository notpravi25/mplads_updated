import os
import pandas as pd
import numpy as np

def run_vendor_risk_analysis():
    processed_dir = r"c:\Users\user\Documents\SIH2026\data\processed"
    features_dir = r"c:\Users\user\Documents\SIH2026\data\features"
    
    t6_path = os.path.join(processed_dir, "t6_expenditure.parquet")
    master_path = os.path.join(features_dir, "master_analytical.parquet")
    
    if not os.path.exists(t6_path) or not os.path.exists(master_path):
        raise FileNotFoundError("Required processed datasets (T6 or master_analytical) missing.")
        
    print("=== EXECUTING REFINED VENDOR & PAYMENT PATTERN RISK ENGINE ===")
    t6 = pd.read_parquet(t6_path)
    master = pd.read_parquet(master_path)
    
    # 1. DATA QUALITY STATISTICS
    total_tx = len(t6)
    valid_work_id_pct = (t6["work_id"].notnull().sum() / total_tx) * 100 if total_tx > 0 else 0
    valid_vendor_pct = (~t6["vendor_name"].isin(["", "NAN", "NONE", "UNKNOWN", "NOT AVAILABLE"])).sum() / total_tx * 100 if total_tx > 0 else 0
    valid_date_pct = (t6["expenditure_date"].notnull().sum() / total_tx) * 100 if total_tx > 0 else 0
    valid_amt_pct = ((t6["expenditure_amount"] > 0).sum() / total_tx) * 100 if total_tx > 0 else 0
    
    print(f"Loaded T6 transactions: {total_tx:,} records across {t6['work_id'].nunique():,} unique works.")
    print("Data Quality Statistics:")
    print(f" - Valid Work ID: {valid_work_id_pct:.1f}%")
    print(f" - Valid Vendor ID: {valid_vendor_pct:.1f}%")
    print(f" - Valid Payment Date: {valid_date_pct:.1f}%")
    print(f" - Valid Payment Amount: {valid_amt_pct:.1f}%")

    # Filter clean valid transactions
    t6_clean = t6.dropna(subset=["work_id", "expenditure_amount"]).copy()
    t6_clean = t6_clean[t6_clean["expenditure_amount"] > 0]
    t6_clean["vendor_name_clean"] = t6_clean["vendor_name"].fillna("UNKNOWN").str.strip().str.upper()

    # 2. WORK-LEVEL VENDOR CONCENTRATION & HHI COMPUTATION
    print("Calculating project-level vendor concentration & HHI indices...")
    
    # Work-level expenditure summary per vendor
    work_vendor_grp = t6_clean.groupby(["work_id", "vendor_name_clean"]).agg(
        vendor_expenditure=("expenditure_amount", "sum"),
        vendor_tx_count=("expenditure_amount", "count"),
        max_vendor_payment=("expenditure_amount", "max")
    ).reset_index()

    # Total expenditure per work
    work_total_exp = t6_clean.groupby("work_id")["expenditure_amount"].sum().reset_index().rename(
        columns={"expenditure_amount": "total_work_expenditure"}
    )

    work_vendor_grp = pd.merge(work_vendor_grp, work_total_exp, on="work_id", how="left")
    work_vendor_grp["vendor_share"] = work_vendor_grp["vendor_expenditure"] / (work_vendor_grp["total_work_expenditure"] + 1e-5)
    work_vendor_grp["share_sq"] = (work_vendor_grp["vendor_share"] * 100) ** 2

    # Work-level HHI calculation
    work_hhi = work_vendor_grp.groupby("work_id")["share_sq"].sum().reset_index().rename(
        columns={"share_sq": "project_hhi"}
    )
    work_hhi["project_hhi"] = work_hhi["project_hhi"].round(1)

    # Work-level summary metrics
    work_vendor_summary = work_vendor_grp.groupby("work_id").agg(
        vendor_count=("vendor_name_clean", "nunique"),
        max_single_payment=("max_vendor_payment", "max")
    ).reset_index()

    # Identify Top Vendor per work_id
    idx_top = work_vendor_grp.groupby("work_id")["vendor_expenditure"].idxmax()
    top_vendors = work_vendor_grp.loc[idx_top, ["work_id", "vendor_name_clean", "vendor_expenditure", "vendor_share"]].rename(
        columns={
            "vendor_name_clean": "top_vendor",
            "vendor_expenditure": "top_vendor_expenditure",
            "vendor_share": "project_top_vendor_share"
        }
    )

    work_metrics = pd.merge(work_vendor_summary, top_vendors, on="work_id", how="left")
    work_metrics = pd.merge(work_metrics, work_total_exp, on="work_id", how="left")
    work_metrics = pd.merge(work_metrics, work_hhi, on="work_id", how="left")
    
    # Calculate Single Disbursal Ratio (%)
    work_metrics["single_disbursal_ratio"] = np.where(
        work_metrics["total_work_expenditure"] > 0,
        (work_metrics["max_single_payment"] / work_metrics["total_work_expenditure"]) * 100,
        0.0
    ).round(1)

    # 3. WORK + VENDOR PAYMENT BURST (7-DAY WINDOW) ANALYSIS
    print("Evaluating payment timing & 7-day rapid disbursal burst windows per work...")
    
    t6_dates = t6_clean.dropna(subset=["expenditure_date"]).sort_values(["work_id", "vendor_name_clean", "expenditure_date"]).copy()
    
    t6_dates["prev_date"] = t6_dates.groupby(["work_id", "vendor_name_clean"])["expenditure_date"].shift(1)
    t6_dates["days_gap"] = (t6_dates["expenditure_date"] - t6_dates["prev_date"]).dt.days

    # Identify payments occurring within 7 days of previous payment for SAME work + SAME vendor
    t6_dates["is_rapid_burst"] = (t6_dates["days_gap"].notnull()) & (t6_dates["days_gap"] <= 7) & (t6_dates["days_gap"] >= 0)

    burst_summary = t6_dates.groupby("work_id").agg(
        payment_count=("expenditure_date", "count"),
        burst_tx_count=("is_rapid_burst", "sum"),
        min_payment_gap_days=("days_gap", "min")
    ).reset_index()

    burst_summary["rapid_disbursal_burst_flag"] = burst_summary["burst_tx_count"] > 0

    work_metrics = pd.merge(work_metrics, burst_summary, on="work_id", how="left")
    work_metrics["payment_count"] = work_metrics["payment_count"].fillna(0).astype(int)
    work_metrics["burst_tx_count"] = work_metrics["burst_tx_count"].fillna(0).astype(int)
    work_metrics["rapid_disbursal_burst_flag"] = work_metrics["rapid_disbursal_burst_flag"].fillna(False)

    # 4. CONSTITUENCY-LEVEL VENDOR CONCENTRATIONPERSPECTIVE
    print("Computing constituency-level vendor market share baselines...")
    
    # Check if financial_risk_score is present in master or merge from financial_anomalies.parquet
    fin_p = os.path.join(features_dir, "financial_anomalies.parquet")
    if "financial_risk_score" not in master.columns and os.path.exists(fin_p):
        fin_df = pd.read_parquet(fin_p)[["work_id", "financial_risk_score"]].drop_duplicates("work_id")
        master = pd.merge(master, fin_df, on="work_id", how="left")
    if "financial_risk_score" not in master.columns:
        master["financial_risk_score"] = 0.0

    master_cols = ["work_id", "state", "constituency", "sanction_amount", "financial_risk_score"]
    avail_cols = [c for c in master_cols if c in master.columns]

    work_full = pd.merge(
        master[avail_cols],
        work_metrics,
        on="work_id",
        how="left"
    )

    # Calculate vendor constituency work count share & unique vendor availability index (VAI)
    const_vendor_works = work_full.groupby(["constituency", "top_vendor"])["work_id"].transform("count")
    const_total_works = work_full.groupby("constituency")["work_id"].transform("count")
    const_avail_vendors = work_full.groupby("constituency")["top_vendor"].transform("nunique")
    
    work_full["constituency_vendor_count"] = const_avail_vendors.fillna(1)
    work_full["vendor_constituency_share"] = np.where(
        work_full["top_vendor"].notnull() & (const_total_works > 0),
        const_vendor_works / const_total_works,
        0.0
    )

    # 5. MULTI-SIGNAL RESPONSIBLE VENDOR RISK SCORING
    print("Applying multi-signal Vendor Risk Scoring engine (Non-accusatory baseline with VAI scaling)...")

    def compute_vendor_risk_profile(row):
        top_share = row["project_top_vendor_share"] if pd.notnull(row["project_top_vendor_share"]) else 0.0
        const_share = row["vendor_constituency_share"] if pd.notnull(row["vendor_constituency_share"]) else 0.0
        vendor_count_avail = row["constituency_vendor_count"] if pd.notnull(row["constituency_vendor_count"]) else 5.0
        hhi = row["project_hhi"] if pd.notnull(row["project_hhi"]) else 0.0
        single_ratio = row["single_disbursal_ratio"] if pd.notnull(row["single_disbursal_ratio"]) else 0.0
        burst_flag = bool(row["rapid_disbursal_burst_flag"])
        burst_count = int(row["burst_tx_count"]) if pd.notnull(row["burst_tx_count"]) else 0
        fin_score = row["financial_risk_score"] if pd.notnull(row["financial_risk_score"]) else 0.0

        # Feature Indicators
        conc_score = 0.0
        burst_score = 0.0
        disbursal_score = 0.0
        convergence_score = 0.0

        # Signal 1: Concentration (Max 25 pts)
        if top_share >= 0.70:
            conc_score += 15.0
        elif top_share >= 0.50:
            conc_score += 10.0
            
        if const_share >= 0.35:
            conc_score += 10.0
        elif const_share >= 0.20:
            conc_score += 5.0

        # Vendor Availability Index Scaling: If 2 or fewer vendors operate in constituency, reduce concentration penalty by 50%
        if vendor_count_avail <= 2 and top_share >= 0.70:
            conc_score = conc_score * 0.5

        # Signal 2: Payment Burst / Timing (Max 35 pts)
        if burst_flag:
            burst_score += 25.0
            if burst_count >= 2:
                burst_score += 10.0


        # Signal 3: Single Disbursal Dominance Ratio (Max 25 pts)
        if single_ratio >= 75.0:
            disbursal_score += 25.0
        elif single_ratio >= 50.0:
            disbursal_score += 15.0

        # Signal 4: Multi-Signal Convergence Bonus (Max 15 pts)
        # Convergence requires concentration AND payment timing/disbursal anomaly
        if top_share >= 0.70 and (burst_flag or single_ratio >= 60.0):
            convergence_score += 15.0

        # Total Raw Score
        raw_score = conc_score + burst_score + disbursal_score + convergence_score

        # Cap score at 100
        final_score = min(round(raw_score, 1), 100.0)

        # Severity Levels
        # LOW (0-34.99): High concentration alone with normal payment timing
        # MEDIUM (35-64.99): High concentration + 1 payment pattern indicator
        # HIGH (65-84.99): Multi-signal convergence (concentration + rapid disbursal + large single payment)
        # CRITICAL (85-100): Extreme multi-signal convergence
        if final_score >= 85:
            level = "CRITICAL"
        elif final_score >= 65:
            level = "HIGH"
        elif final_score >= 35:
            level = "MEDIUM"
        else:
            level = "LOW"

        # Responsible AI Plain-Language Explanations (Facts, Indicators, Interpretation)
        facts = []
        indicators = []
        
        vendor_name = row["top_vendor"] if pd.notnull(row["top_vendor"]) else "Primary Contractor"
        
        if top_share > 0:
            facts.append(f"Primary vendor '{vendor_name}' accounts for {top_share * 100:.1f}% of recorded work expenditure")
            indicators.append(f"Expenditure Concentration (HHI: {hhi:.0f})")
            
        if burst_flag:
            facts.append(f"{burst_count + 1} disbursals occurred within a 7-day rolling period")
            indicators.append("Rapid Disbursal Pattern (7-day window)")
            
        if single_ratio >= 50.0:
            facts.append(f"Largest single payment accounts for {single_ratio:.1f}% of total work budget")
            indicators.append(f"Large Single Disbursal Ratio ({single_ratio:.1f}%)")

        if const_share >= 0.20:
            facts.append(f"Vendor handles {const_share * 100:.1f}% of sanctioned works in {row['constituency']}")

        # Non-Accusatory Responsible AI Interpretation
        if final_score >= 65:
            interpretation = "Multiple independent payment-pattern indicators are present. This work is prioritized for human administrative review. These indicators do not establish wrongdoing."
        elif final_score >= 35:
            interpretation = "Vendor payment structure contains indicators that may warrant routine administrative review."
        else:
            interpretation = "Expenditure concentration observed with standard payment timing and disbursal sizes. No elevated review priority required."

        explanation = " | ".join(facts) if facts else "Standard vendor payment disbursal patterns."

        return pd.Series({
            "vendor_risk_score": final_score,
            "vendor_risk_level": level,
            "vendor_risk_explanation": explanation,
            "vendor_risk_interpretation": interpretation,
            "hhi_index": hhi,
            "single_disbursal_ratio": single_ratio,
            "burst_flag": burst_flag,
            "burst_count": burst_count
        })

    print("Computing interpretable vendor indicators...")
    risk_results = work_full.apply(compute_vendor_risk_profile, axis=1)

    work_full["vendor_risk_score"] = risk_results["vendor_risk_score"]
    work_full["vendor_risk_level"] = risk_results["vendor_risk_level"]
    work_full["vendor_risk_explanation"] = risk_results["vendor_risk_explanation"]
    work_full["vendor_risk_interpretation"] = risk_results["vendor_risk_interpretation"]
    work_full["project_hhi"] = risk_results["hhi_index"]
    work_full["single_disbursal_ratio"] = risk_results["single_disbursal_ratio"]
    work_full["rapid_disbursal_burst_flag"] = risk_results["burst_flag"]
    work_full["burst_tx_count"] = risk_results["burst_count"]

    work_full["is_vendor_risk_flagged"] = work_full["vendor_risk_score"] >= 65

    # 6. SAVE REFINED VENDOR RISK FEATURE STORE
    out_file = os.path.join(features_dir, "vendor_risk_analysis.parquet")
    work_full.to_parquet(out_file, index=False)

    print("\n=== REFINED MODULE 3 EXECUTION SUMMARY ===")
    print(f"Total Works Evaluated: {len(work_full):,}")
    print("Vendor Risk Level Distribution:")
    print(work_full["vendor_risk_level"].value_counts().to_string())
    print(f"\nPriority Review Cases (Vendor Risk Score >= 65): {work_full['is_vendor_risk_flagged'].sum():,}")
    print(f"Results saved to: {out_file}")

if __name__ == "__main__":
    run_vendor_risk_analysis()
