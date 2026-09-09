import os

SYNC_INTERVAL_DAYS = 7  # Weekly synchronization schedule

BASE_DIR = r"c:\Users\user\Documents\SIH2026"
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
FEATURES_DIR = os.path.join(DATA_DIR, "features")
SNAPSHOTS_DIR = os.path.join(DATA_DIR, "snapshots")
SYNC_LOG_FILE = os.path.join(DATA_DIR, "sync_history.json")

# Primary dataset files monitored for sync & snapshotting
MONITORED_FILES = {
    "t1": "t1_allocated_limits.parquet",
    "t3": "t3_works_recommended.parquet",
    "t4": "t4_works_sanctioned.parquet",
    "t5": "t5_works_completed.parquet",
    "t6": "t6_expenditure.parquet",
}
