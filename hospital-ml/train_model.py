"""
train_model.py

Fetches the ready-made ML feature dataset from the Supabase view
`xgboost_training_data`, trains an XGBoost classifier to predict
infection_event_next_24h, evaluates it, and saves the trained model
+ the exact list/order of feature columns to disk.

Run this whenever you want to (re)train the model, e.g. after more
data has accumulated in the database.
"""

import os
import json
import joblib
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

TARGET_COLUMN = "infection_event_next_24h"

MODEL_PATH = "model.pkl"
FEATURES_PATH = "feature_columns.json"


def fetch_training_data() -> pd.DataFrame:
    """Pull every row from the xgboost_training_data view, handling pagination."""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    all_rows = []
    page_size = 1000
    start = 0

    while True:
        response = (
            supabase
            .from_("xgboost_training_data")
            .select("*")
            .range(start, start + page_size - 1)
            .execute()
        )
        rows = response.data
        if not rows:
            break

        all_rows.extend(rows)

        if len(rows) < page_size:
            break

        start += page_size

    if not all_rows:
        raise RuntimeError(
            "No rows returned from xgboost_training_data. "
            "Check that the view exists and has data, and that your "
            "anon key has SELECT permission on it."
        )

    return pd.DataFrame(all_rows)


def main():
    print("Fetching training data from Supabase...")
    df = fetch_training_data()
    print(f"Loaded {len(df)} rows.")

    if TARGET_COLUMN not in df.columns:
        raise RuntimeError(
            f"Expected target column '{TARGET_COLUMN}' not found in the data. "
            f"Columns found: {list(df.columns)}"
        )

    # Drop rows where target is null, just in case
    df = df.dropna(subset=[TARGET_COLUMN])

    y = df[TARGET_COLUMN].astype(int)
    X = df.drop(columns=[TARGET_COLUMN])

    # Keep only numeric feature columns (the view is already fully numeric,
    # this is just a safety net)
    X = X.select_dtypes(include=["number"])

    feature_columns = list(X.columns)
    print(f"Using {len(feature_columns)} features: {feature_columns}")

    print(f"Target distribution:\n{y.value_counts()}")

    if y.nunique() < 2:
        print(
            "\nWARNING: The target column only has one class in the data. "
            "The model will not be meaningful until you have examples of "
            "both infection_event_next_24h = 0 and = 1. "
            "Training will continue anyway so the pipeline works end-to-end."
        )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if y.nunique() > 1 else None
    )

    print("\nTraining XGBoost model...")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    if len(X_test) > 0:
        y_pred = model.predict(X_test)
        print(f"\nAccuracy on held-out test set: {accuracy_score(y_test, y_pred):.3f}")
        print("\nClassification report:")
        print(classification_report(y_test, y_pred, zero_division=0))

    joblib.dump(model, MODEL_PATH)
    with open(FEATURES_PATH, "w") as f:
        json.dump(feature_columns, f, indent=2)

    print(f"\nModel saved to {MODEL_PATH}")
    print(f"Feature column order saved to {FEATURES_PATH}")


if __name__ == "__main__":
    main()
