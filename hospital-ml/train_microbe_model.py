"""
train_microbe_model.py

Trains a SEPARATE multi-class model that predicts WHICH microbe
(Microbe X / Y / Z) is most likely, given the department's
conditions. Only trained on rows where an infection event actually
happened (infection_event_next_24h == 1), since microbe is
meaningless when there's no event.

This is separate from train_model.py, which only predicts whether
an event happens at all (yes/no risk %). This script predicts, given
that something IS happening, which microbe it probably is.
"""

import os
import json
import joblib
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

TARGET_COLUMN = "next_day_microbe"
EVENT_COLUMN = "infection_event_next_24h"

MODEL_PATH = "microbe_model.pkl"
FEATURES_PATH = "microbe_feature_columns.json"
LABEL_ENCODER_PATH = "microbe_label_encoder.pkl"


def fetch_training_data() -> pd.DataFrame:
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
        raise RuntimeError("No rows returned from xgboost_training_data.")

    return pd.DataFrame(all_rows)


def main():
    print("Fetching training data...")
    df = fetch_training_data()

    # Only keep rows where an infection event actually happened —
    # microbe is meaningless otherwise
    df = df[df[EVENT_COLUMN] == 1]
    df = df.dropna(subset=[TARGET_COLUMN])

    print(f"Rows with an actual infection event: {len(df)}")

    if len(df) < 10:
        raise RuntimeError(
            "Not enough infection-event rows to train a microbe model. "
            "Run more days of data or lower the event probability "
            "threshold in the SQL generator."
        )

    print(f"Microbe distribution:\n{df[TARGET_COLUMN].value_counts()}")

    y_raw = df[TARGET_COLUMN]
    X = df.drop(columns=[TARGET_COLUMN, EVENT_COLUMN])
    X = X.select_dtypes(include=["number"])

    feature_columns = list(X.columns)

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\nTraining microbe classifier...")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=len(label_encoder.classes_),
        eval_metric="mlogloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.3f}")
    print("\nClassification report:")
    print(classification_report(
        y_test, y_pred,
        target_names=label_encoder.classes_,
        zero_division=0
    ))

    joblib.dump(model, MODEL_PATH)
    joblib.dump(label_encoder, LABEL_ENCODER_PATH)
    with open(FEATURES_PATH, "w") as f:
        json.dump(feature_columns, f, indent=2)

    print(f"\nSaved {MODEL_PATH}, {FEATURES_PATH}, {LABEL_ENCODER_PATH}")


if __name__ == "__main__":
    main()
