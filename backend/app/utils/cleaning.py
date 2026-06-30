import re

import pandas as pd


def normalize_columns(columns):
    normalized = []
    for col in columns:
        value = str(col).strip().lower()
        value = re.sub(r"[^a-z0-9]+", "_", value)
        value = value.strip("_")
        normalized.append(value)
    return normalized


def infer_column(columns, candidates):
    normalized_columns = {re.sub(r"[^a-z0-9]+", "", str(col).lower()): col for col in columns}
    for candidate in candidates:
        normalized_candidate = re.sub(r"[^a-z0-9]+", "", candidate.lower())
        if normalized_candidate in normalized_columns:
            return normalized_columns[normalized_candidate]
    for candidate in candidates:
        normalized_candidate = re.sub(r"[^a-z0-9]+", "", candidate.lower())
        for column in columns:
            normalized_column = re.sub(r"[^a-z0-9]+", "", str(column).lower())
            if len(normalized_candidate) > 3 and normalized_candidate in normalized_column:
                return column
    return None


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = df.copy()
    cleaned.columns = normalize_columns(cleaned.columns)
    cleaned = cleaned.drop_duplicates().reset_index(drop=True)

    for column in cleaned.columns:
        if cleaned[column].dtype == object:
            cleaned[column] = cleaned[column].astype(str).str.strip()
            cleaned[column] = cleaned[column].replace({"nan": None, "None": None, "": None})

    for column in cleaned.columns:
        if column.lower().startswith("date") or "date" in column.lower() or "created" in column.lower():
            try:
                cleaned[column] = pd.to_datetime(cleaned[column], errors="coerce")
            except Exception:
                pass

    for column in cleaned.columns:
        if cleaned[column].dtype == object:
            try:
                numeric_values = pd.to_numeric(cleaned[column], errors="coerce")
                if numeric_values.notna().sum() > len(cleaned[column]) / 2:
                    cleaned[column] = numeric_values
            except Exception:
                pass

    for column in cleaned.columns:
        if cleaned[column].isna().all():
            cleaned = cleaned.drop(columns=[column])
            continue
        if pd.api.types.is_numeric_dtype(cleaned[column]):
            cleaned[column] = cleaned[column].fillna(cleaned[column].median())
        else:
            cleaned[column] = cleaned[column].fillna(cleaned[column].mode(dropna=True).iloc[0] if not cleaned[column].mode(dropna=True).empty else None)

    return cleaned
