"""
predict_and_alert.py

Loads the trained model, pulls today's feature row for every department
from the `ml_department_daily_features` view, predicts an infection risk
percentage for each department, writes the result into the `predictions`
table, and creates a row in `alerts` for any department whose risk is
above a threshold.

Run this daily (manually at first, later via a scheduled task / cron job)
to keep predictions up to date.
"""

import os
import json
import joblib
import pandas as pd
from datetime import date
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

MODEL_PATH = "model.pkl"
FEATURES_PATH = "feature_columns.json"

# Risk thresholds -> severity label (checked from highest to lowest)
SEVERITY_THRESHOLDS = [
    (70, "Critical"),
    (50, "High"),
    (30, "Medium"),
]


def severity_for_risk(risk_percentage: float):
    for threshold, label in SEVERITY_THRESHOLDS:
        if risk_percentage >= threshold:
            return label
    return None  # below all thresholds -> no alert needed


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Loading trained model...")
    model = joblib.load(MODEL_PATH)
    with open(FEATURES_PATH) as f:
        feature_columns = json.load(f)

    today = date.today().isoformat()

    print(f"Fetching today's ({today}) feature row for every department...")
    response = (
        supabase
        .from_("ml_department_daily_features")
        .select("*")
        .eq("day", today)
        .execute()
    )
    rows = response.data

    if not rows:
        print(
            f"No feature rows found for {today} in ml_department_daily_features. "
            "Nothing to predict."
        )
        return

    df = pd.DataFrame(rows)

    # Keep department metadata for reporting, and align features to the
    # exact column order the model was trained on
    departments_info = df[["department_id", "code", "name"]]

    missing = [c for c in feature_columns if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"The following columns the model expects are missing from "
            f"ml_department_daily_features: {missing}"
        )

    X = df[feature_columns]

    print("Predicting risk for each department...")
    probabilities = model.predict_proba(X)[:, 1]  # probability of class "1" (infection event)

    for i, row in departments_info.iterrows():
        department_id = int(row["department_id"])
        code = row["code"]
        risk_percentage = round(float(probabilities[i]) * 100, 2)

        print(f"  {code}: {risk_percentage}% risk")

        # 1) Insert or update the prediction for this department/date
        supabase.from_("predictions").upsert({
            "department_id": department_id,
            "prediction_date": today,
            "risk_percentage": risk_percentage,
            "infection_type": "Predicted Outbreak Risk",
            "predicted_microbe": None,
            "model_version": "XGBoost-v1",
        }, on_conflict="department_id,prediction_date").execute()

        # 2) Create an alert if risk crosses a threshold
        # (clear any existing alert for this department/day first so
        # re-running the script the same day doesn't pile up duplicates)
        supabase.from_("alerts") \
            .delete() \
            .eq("department_id", department_id) \
            .eq("alert_date", today) \
            .execute()

        severity = severity_for_risk(risk_percentage)
        if severity:
            message = (
                f"Predicted infection risk for {code} is {risk_percentage}% "
                f"({severity}) based on current cleaning, occupancy, and "
                f"lab data."
            )
            supabase.from_("alerts").insert({
                "department_id": department_id,
                "alert_date": today,
                "risk_percentage": risk_percentage,
                "severity": severity,
                "message": message,
                "status": "Active",
            }).execute()
            print(f"    -> Alert created ({severity})")

    print("\nDone. Check the 'predictions' and 'alerts' tables in Supabase.")


if __name__ == "__main__":
    main()
