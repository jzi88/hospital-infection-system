"""
predict_and_alert.py

Loads the trained models and, for EACH of the upcoming days (today
through FORECAST_DAYS_AHEAD days from now), pulls that day's feature
row for every department from `ml_department_daily_features`,
predicts an infection risk percentage, writes it into the
`predictions` table, and creates a row in `alerts` for any
department/day whose risk crosses a threshold.

Run this daily (manually at first, later via a scheduled task / cron
job) to keep the forecast rolling forward.

NOTE: sensor-based features (crowd density, temperature, humidity,
hours since cleaning) only exist for PAST days in this project, so
for future days those fall back to fixed defaults. What actually
varies day-to-day for the future is patient/appointment/visitor
volume already scheduled in the data. This is a reasonable
simplification for a demo system — a production system would need
real forecasted sensor data to do better.
"""

import os
import json
import joblib
import pandas as pd
from datetime import date, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

MODEL_PATH = "model.pkl"
FEATURES_PATH = "feature_columns.json"

MICROBE_MODEL_PATH = "microbe_model.pkl"
MICROBE_FEATURES_PATH = "microbe_feature_columns.json"
MICROBE_LABEL_ENCODER_PATH = "microbe_label_encoder.pkl"

# How many days ahead to forecast (today + this many extra days).
# The ml_department_daily_features view covers up to 7 days ahead.
FORECAST_DAYS_AHEAD = 6

# Only bother predicting a specific microbe when risk is at least this high —
# below that, "which microbe" isn't a meaningful question yet
MICROBE_PREDICTION_THRESHOLD = 30

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


def load_models():
    model = joblib.load(MODEL_PATH)
    with open(FEATURES_PATH) as f:
        feature_columns = json.load(f)

    microbe_model = None
    microbe_feature_columns = None
    microbe_label_encoder = None

    if os.path.exists(MICROBE_MODEL_PATH):
        microbe_model = joblib.load(MICROBE_MODEL_PATH)
        microbe_label_encoder = joblib.load(MICROBE_LABEL_ENCODER_PATH)
        with open(MICROBE_FEATURES_PATH) as f:
            microbe_feature_columns = json.load(f)
    else:
        print(
            "No microbe_model.pkl found — predicted_microbe will stay empty "
            "for all days. Run train_microbe_model.py if you want that."
        )

    return model, feature_columns, microbe_model, microbe_feature_columns, microbe_label_encoder


def predict_for_day(
    supabase,
    target_date: str,
    model,
    feature_columns,
    microbe_model,
    microbe_feature_columns,
    microbe_label_encoder,
):
    response = (
        supabase
        .from_("ml_department_daily_features")
        .select("*")
        .eq("day", target_date)
        .execute()
    )
    rows = response.data

    if not rows:
        print(f"  No feature rows for {target_date}, skipping.")
        return

    df = pd.DataFrame(rows)
    departments_info = df[["department_id", "code", "name"]]

    missing = [c for c in feature_columns if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"Missing expected columns in ml_department_daily_features: {missing}"
        )

    X = df[feature_columns]
    probabilities = model.predict_proba(X)[:, 1]

    for i, row in departments_info.iterrows():
        department_id = int(row["department_id"])
        code = row["code"]
        risk_percentage = round(float(probabilities[i]) * 100, 2)

        predicted_microbe = None
        if microbe_model is not None and risk_percentage >= MICROBE_PREDICTION_THRESHOLD:
            X_microbe = df.loc[[i], microbe_feature_columns]
            microbe_pred_encoded = microbe_model.predict(X_microbe)[0]
            predicted_microbe = microbe_label_encoder.inverse_transform(
                [microbe_pred_encoded]
            )[0]

        microbe_note = f" ({predicted_microbe})" if predicted_microbe else ""
        print(f"  {target_date} — {code}: {risk_percentage}%{microbe_note}")

        # Insert or update the prediction for this department/date
        supabase.from_("predictions").upsert({
            "department_id": department_id,
            "prediction_date": target_date,
            "risk_percentage": risk_percentage,
            "infection_type": "Predicted Outbreak Risk",
            "predicted_microbe": predicted_microbe,
            "model_version": "XGBoost-v1",
        }, on_conflict="department_id,prediction_date").execute()

        # Clear any existing alert for this department/day first so
        # re-running the script doesn't pile up duplicates
        supabase.from_("alerts") \
            .delete() \
            .eq("department_id", department_id) \
            .eq("alert_date", target_date) \
            .execute()

        severity = severity_for_risk(risk_percentage)
        if severity:
            message = (
                f"Predicted infection risk for {code} on {target_date} is "
                f"{risk_percentage}% ({severity})"
                + (f", likely {predicted_microbe}" if predicted_microbe else "")
                + "."
            )
            supabase.from_("alerts").insert({
                "department_id": department_id,
                "alert_date": target_date,
                "risk_percentage": risk_percentage,
                "severity": severity,
                "message": message,
                "status": "Active",
            }).execute()
            print(f"    -> Alert created ({severity})")


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Loading models...")
    (
        model,
        feature_columns,
        microbe_model,
        microbe_feature_columns,
        microbe_label_encoder,
    ) = load_models()

    today = date.today()

    for offset in range(0, FORECAST_DAYS_AHEAD + 1):
        target_date = (today + timedelta(days=offset)).isoformat()
        print(f"\nForecasting {target_date}...")
        predict_for_day(
            supabase,
            target_date,
            model,
            feature_columns,
            microbe_model,
            microbe_feature_columns,
            microbe_label_encoder,
        )

    print("\nDone. Check the 'predictions' and 'alerts' tables in Supabase.")


if __name__ == "__main__":
    main()
