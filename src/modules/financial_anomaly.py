import os
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from src.utils.mlflow_tracker import MLflowTracker

def run_financial_anomaly_detection():
    features_dir = r"c:\Users\user\Documents\SIH2026\data\features"
    master_path = os.path.join(features_dir, "master_analytical.parquet")
    
    if not os.path.exists(master_path):
        raise FileNotFoundError(f"Master analytical dataset not found at {master_path}")
        
    print("=== EXECUTING MODULE 2: FINANCIAL & EXPENDITURE ANOMALY DETECTION ===")
    df = pd.read_parquet(master_path)
    print(f"Loaded master dataset: {len(df):,} records")

    # 1. Financial Feature Clean & Signals (F1 to F10)
    df["sanction_amount_clean"] = df["sanction_amount"].fillna(0)
    df["effective_expenditure_clean"] = df["effective_expenditure"].fillna(0)
    df["single_payment_ratio_clean"] = df["top_vendor_share"].fillna(0)
    df["payment_count_clean"] = df["payment_count"].fillna(0)

    # F3: Utilization Percentage
    df["expenditure_ratio_pct"] = np.where(
        df["sanction_amount_clean"] > 0,
        (df["effective_expenditure_clean"] / df["sanction_amount_clean"]) * 100,
        0.0
    ).round(2)

    # F4 & F5: Peer Median & Peer Ratio (State + Work Category)
    print("Computing peer-group statistical baselines (Median & IQR)...")
    group_stats = df.groupby(["work_category", "state"])["sanction_amount_clean"].agg(
        peer_median="median",
        q1=lambda x: np.percentile(x, 25),
        q3=lambda x: np.percentile(x, 75)
    ).reset_index()
    group_stats["iqr"] = group_stats["q3"] - group_stats["q1"]
    group_stats["upper_bound"] = group_stats["q3"] + 1.5 * group_stats["iqr"]
    
    df = pd.merge(df, group_stats, on=["work_category", "state"], how="left")
    df["peer_median"] = df["peer_median"].fillna(350000.0)
    df["amount_to_peer_ratio"] = (df["sanction_amount_clean"] / (df["peer_median"] + 1.0)).round(2)
    
    # F6: Category Percentile Ranking
    df["category_percentile"] = (df.groupby("work_category")["sanction_amount_clean"].rank(pct=True) * 100).round(1)

    # F7 & F8: Max Payment & Single Payment Share
    df["max_payment"] = (df["effective_expenditure_clean"] * df["single_payment_ratio_clean"]).round(2)
    df["single_payment_share_pct"] = (df["single_payment_ratio_clean"] * 100).round(1)

    # F9 & F10: Early Velocity & Expenditure Concentration Burst
    df["early_expenditure_rate"] = np.where(df["amount_to_peer_ratio"] > 2.5, 0.45, 0.12)
    df["has_expenditure_burst"] = (df["single_payment_share_pct"] >= 75.0) & (df["payment_count_clean"] > 1)

    # Statistical Score Calculation (0 to 100)
    def calc_stat_score(row):
        score = 0
        ratio = row["amount_to_peer_ratio"]
        percentile = row["category_percentile"]
        bound = row["upper_bound"]
        amount = row["sanction_amount_clean"]
        share = row["single_payment_share_pct"]
        
        if ratio > 3.0:
            score += 45
        elif ratio > 2.0:
            score += 30
        elif ratio > 1.5:
            score += 15
            
        if percentile >= 98:
            score += 35
        elif percentile >= 95:
            score += 25
        elif percentile >= 90:
            score += 15
            
        if bound > 0 and amount > bound:
            score += 10
            
        if share >= 80 and row["payment_count_clean"] > 1:
            score += 10
            
        return min(score, 100)

    df["stat_financial_score"] = df.apply(calc_stat_score, axis=1)

    # F11: ML Isolation Forest Anomaly Score
    print("Training Isolation Forest on multi-variate financial features...")
    feature_cols = [
        "sanction_amount_clean",
        "effective_expenditure_clean",
        "amount_to_peer_ratio",
        "single_payment_ratio_clean",
        "payment_count_clean"
    ]
    
    X = df[feature_cols].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    n_est = 100
    contam = 0.05
    rnd_state = 42
    
    iso_forest = IsolationForest(
        n_estimators=n_est,
        contamination=contam,
        random_state=rnd_state
    )
    iso_forest.fit(X_scaled)
    
    raw_ml_scores = iso_forest.decision_function(X_scaled)
    min_s, max_s = raw_ml_scores.min(), raw_ml_scores.max()
    df["ml_financial_score"] = ((1.0 - (raw_ml_scores - min_s) / (max_s - min_s + 1e-5)) * 100).round(1)

    # MLflow Model Tracking Logging
    tracker = MLflowTracker()
    anomalies_cnt = int((df["stat_financial_score"] >= 65).sum())
    tracker.log_training_run(
        params={"n_estimators": n_est, "contamination": contam, "random_state": rnd_state},
        metrics={
            "total_works": len(df),
            "anomalies_count": anomalies_cnt,
            "anomaly_percentage": round((anomalies_cnt / len(df)) * 100, 2),
            "critical_count": int((df["stat_financial_score"] >= 85).sum()),
            "high_count": anomalies_cnt
        }
    )

    # Attach Model Traceability Metadata to every work
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    df["model_name"] = "MPLADS_Financial_Anomaly_Model"
    df["model_version"] = "v2"
    df["dataset_snapshot"] = "SNAP-2026-09-09"
    df["last_analyzed_at"] = timestamp_str

    # Composite Financial Risk Score & Severity Level
    df["financial_risk_score"] = (0.6 * df["stat_financial_score"] + 0.4 * df["ml_financial_score"]).round(1)
    
    def assign_risk_level(score):
        if score >= 85:
            return "CRITICAL"
        elif score >= 65:
            return "HIGH"
        elif score >= 35:
            return "MEDIUM"
        return "LOW"

    df["financial_risk_level"] = df["financial_risk_score"].apply(assign_risk_level)
    df["is_financial_outlier"] = df["financial_risk_score"] >= 65

    # Human-Understandable Plain Language Explanation Generator (No ML Jargon)
    def generate_explanation(row):
        reasons = []
        ratio = row["amount_to_peer_ratio"]
        pct = row["category_percentile"]
        cat = row["work_category"]
        state = row["state"]
        share = row["single_payment_share_pct"]
        
        if ratio > 1.5:
            reasons.append(f"Sanctioned cost is {ratio:.1f}× above peer-group median for '{cat}' in {state}")
        if pct >= 95:
            reasons.append(f"Budget lies near the highest-cost percentile ({pct:.1f}th percentile) of comparable works")
        if share >= 75 and row["payment_count_clean"] > 1:
            reasons.append(f"Single payment concentration: {share:.1f}% of expenditure disbursed in a single transaction burst")
        if row["ml_financial_score"] >= 75:
            reasons.append("Multi-variate statistical profile deviates substantially from baseline peer behavior")
            
        if not reasons:
            return "Financial parameters and expenditure patterns fall within standard baseline bounds."
        return " • ".join(reasons)

    df["financial_explanation"] = df.apply(generate_explanation, axis=1)

    # Save output
    out_file = os.path.join(features_dir, "financial_anomalies.parquet")
    df.to_parquet(out_file, index=False)
    
    print("\n=== MODULE 2 EXECUTION SUMMARY ===")
    print(f"Total Works Evaluated: {len(df):,}")
    print("Risk Level Breakdown:")
    print(df["financial_risk_level"].value_counts().to_string())
    print(f"\nFlagged Financial Outliers (Score >= 65): {df['is_financial_outlier'].sum():,}")
    print(f"Results saved to: {out_file}")

if __name__ == "__main__":
    run_financial_anomaly_detection()
