from pathlib import Path
from typing import Any
import unicodedata

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.models.dataset import UploadedFile
from app.utils.cleaning import clean_dataframe, infer_column
from app.utils.file_utils import ensure_upload_dir


class DatasetService:
    def __init__(self, db: Session, user_id: int, company_id: int):
        self.db = db
        self.user_id = user_id
        self.company_id = company_id

    def _json_safe(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {key: self._json_safe(val) for key, val in value.items()}
        if isinstance(value, list):
            return [self._json_safe(item) for item in value]
        if isinstance(value, tuple):
            return [self._json_safe(item) for item in value]
        if isinstance(value, (pd.Timestamp, np.datetime64)):
            return pd.Timestamp(value).isoformat()
        if isinstance(value, (np.integer, int)):
            return int(value)
        if isinstance(value, (np.floating, float)):
            return float(value)
        if isinstance(value, (np.bool_, bool)):
            return bool(value)
        if pd.isna(value):
            return None
        return value

    def process_upload(self, uploaded_file, original_name: str) -> dict[str, Any]:
        upload_dir = ensure_upload_dir()
        file_extension = Path(original_name).suffix.lower()
        storage_path = upload_dir / f"{uploaded_file.filename}"
        with storage_path.open("wb") as file_out:
            file_out.write(uploaded_file.file.read())

        dataframe = self._read_file(storage_path, file_extension)
        cleaned = clean_dataframe(dataframe)
        preview, dashboard, insights, alerts, predictions = self._analyze_dataframe(cleaned)

        record = UploadedFile(
            filename=uploaded_file.filename,
            original_name=original_name,
            file_type=file_extension.lstrip("."),
            storage_path=str(storage_path),
            row_count=len(cleaned),
            column_count=len(cleaned.columns),
            summary=preview,
            dashboard=dashboard,
            insights=insights,
            alerts=alerts,
            predictions=predictions,
            user_id=self.user_id,
            company_id=self.company_id,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return self._response(record, preview, dashboard, insights, alerts, predictions, cleaned)

    def refresh_record_analysis(self, record: UploadedFile, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        cleaned = self.load_cleaned_dataframe(record)
        filtered = self.apply_filters(cleaned, filters or {})
        preview, dashboard, insights, alerts, predictions = self._analyze_dataframe(filtered)
        response = self._response(record, preview, dashboard, insights, alerts, predictions, cleaned, filtered)

        if not filters:
            record.row_count = len(cleaned)
            record.column_count = len(cleaned.columns)
            record.summary = preview
            record.dashboard = dashboard
            record.insights = insights
            record.alerts = alerts
            record.predictions = predictions
            self.db.add(record)
            self.db.commit()
            self.db.refresh(record)
        return response

    def load_cleaned_dataframe(self, record: UploadedFile) -> pd.DataFrame:
        dataframe = self._read_file(Path(record.storage_path), f".{record.file_type}")
        return clean_dataframe(dataframe)

    def dataset_detail(self, record: UploadedFile) -> dict[str, Any]:
        raw = self._read_file(Path(record.storage_path), f".{record.file_type}")
        cleaned = clean_dataframe(raw)
        preview = self._build_preview(cleaned, limit=20)
        raw_missing_ratio = float(raw.isna().mean().mean()) if len(raw.columns) else 0.0
        raw_duplicate_count = int(raw.duplicated().sum())
        raw_duplicate_ratio = raw_duplicate_count / max(1, len(raw))
        raw_quality_score = max(0, min(100, round(100 - raw_missing_ratio * 55 - raw_duplicate_ratio * 35, 1)))
        missing_counts = cleaned.isna().sum()
        missing_ratio = float(cleaned.isna().mean().mean()) if len(cleaned.columns) else 0.0
        duplicate_count = int(cleaned.duplicated().sum())
        duplicate_ratio = duplicate_count / max(1, len(cleaned))
        quality_score = max(0, min(100, round(100 - missing_ratio * 55 - duplicate_ratio * 35, 1)))
        columns = [
            {
                "name": column,
                "type": str(cleaned[column].dtype),
                "type_label": self._type_label(str(cleaned[column].dtype)),
                "missing": int(missing_counts[column]),
                "missing_rate": round(float(cleaned[column].isna().mean()) * 100, 1),
                "unique": int(cleaned[column].nunique(dropna=True)),
            }
            for column in cleaned.columns
        ]
        return self._json_safe(
            {
                "id": record.id,
                "original_name": record.original_name,
                "row_count": int(len(cleaned)),
                "column_count": int(len(cleaned.columns)),
                "quality_score_before": raw_quality_score,
                "quality_score_after": quality_score,
                "quality_score": quality_score,
                "duplicate_count": duplicate_count,
                "duplicate_count_before": raw_duplicate_count,
                "missing_total": int(missing_counts.sum()),
                "columns": columns,
                "preview": preview,
            }
        )

    def _type_label(self, dtype: str) -> str:
        normalized = dtype.lower()
        if "datetime" in normalized:
            return "Date"
        if normalized.startswith("int"):
            return "Nombre entier"
        if normalized.startswith("float"):
            return "Nombre décimal"
        if normalized in {"object", "string"}:
            return "Texte"
        if normalized.startswith("bool"):
            return "Oui / Non"
        return dtype
    def _read_file(self, storage_path: Path, file_extension: str) -> pd.DataFrame:
        if file_extension == ".csv":
            return pd.read_csv(storage_path)
        if file_extension in {".xlsx", ".xls"}:
            return pd.read_excel(storage_path)
        raise ValueError("Format de fichier non supporte")

    def _analyze_dataframe(self, cleaned: pd.DataFrame):
        preview = self._json_safe(self._build_preview(cleaned))
        dashboard = self._json_safe(self._build_dashboard(cleaned))
        insights = self._json_safe(self._build_insights(cleaned, dashboard))
        alerts = self._json_safe(self._build_alerts(cleaned, dashboard))
        predictions = self._json_safe(self._build_predictions(cleaned))
        return preview, dashboard, insights, alerts, predictions

    def _response(
        self,
        record,
        preview,
        dashboard,
        insights,
        alerts,
        predictions,
        cleaned: pd.DataFrame | None = None,
        filtered: pd.DataFrame | None = None,
    ) -> dict[str, Any]:
        filtered_df = filtered if filtered is not None else cleaned
        return {
            "id": record.id,
            "filename": record.filename,
            "original_name": record.original_name,
            "row_count": int(len(filtered_df)) if filtered_df is not None else record.row_count,
            "total_row_count": int(len(cleaned)) if cleaned is not None else record.row_count,
            "column_count": int(len(cleaned.columns)) if cleaned is not None else record.column_count,
            "summary": preview,
            "dashboard": dashboard,
            "insights": insights,
            "alerts": alerts,
            "predictions": predictions,
            "filters": self._filter_options(cleaned) if cleaned is not None else {},
        }

    def _build_preview(self, df: pd.DataFrame, limit: int = 10) -> dict[str, Any]:
        missing = {col: int(val) for col, val in df.isna().sum().items()}
        preview_rows = df.head(limit).to_dict(orient="records")
        return {
            "rows": int(len(df)),
            "columns": list(df.columns),
            "types": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": missing,
            "duplication_count": int(df.duplicated().sum()),
            "sample_rows": preview_rows,
        }

    def _columns(self, df: pd.DataFrame) -> dict[str, str | None]:
        columns = df.columns
        return {
            "revenue": infer_column(columns, ["ca", "chiffre_affaires", "chiffre_d_affaires", "revenu", "amount", "sales", "montant", "total"]),
            "cost": infer_column(columns, ["cout_total", "cout", "cost", "charges", "depense"]),
            "margin": infer_column(columns, ["marge", "margin", "profit", "benefice", "marge_brute"]),
            "client": infer_column(columns, ["client", "client_name", "customer", "customer_name", "client_id"]),
            "product": infer_column(columns, ["produit", "product", "article", "sku", "item"]),
            "city": infer_column(columns, ["ville", "city", "localite", "commune"]),
            "channel": infer_column(columns, ["canal", "channel", "source", "mode_vente", "origine"]),
            "seller": infer_column(columns, ["vendeur", "commercial", "sales_rep", "seller", "agent"]),
            "date": infer_column(columns, ["date", "date_facture", "date_vente", "created_at", "dt"]),
            "order": infer_column(columns, ["id_commande", "commande", "order_id", "numero_commande", "invoice", "facture"]),
            "payment": infer_column(columns, ["statut_paiement", "paiement", "payment_status", "status", "statut", "paid", "regle"]),
        }

    def apply_filters(self, df: pd.DataFrame, filters: dict[str, Any]) -> pd.DataFrame:
        if df.empty or not filters:
            return df.copy()
        result = df.copy()
        cols = self._columns(result)
        mapping = {
            "ville": cols.get("city"),
            "city": cols.get("city"),
            "canal": cols.get("channel"),
            "channel": cols.get("channel"),
            "client": cols.get("client"),
            "produit": cols.get("product"),
            "product": cols.get("product"),
            "vendeur": cols.get("seller"),
            "seller": cols.get("seller"),
        }
        for key, column in mapping.items():
            value = filters.get(key)
            if value and column and column in result.columns:
                result = result[result[column].astype(str) == str(value)]

        date_col = cols.get("date")
        if date_col and date_col in result.columns:
            dates = pd.to_datetime(result[date_col], errors="coerce")
            start_date = filters.get("start_date")
            end_date = filters.get("end_date")
            if start_date:
                result = result[dates >= pd.to_datetime(start_date, errors="coerce")]
                dates = pd.to_datetime(result[date_col], errors="coerce")
            if end_date:
                result = result[dates <= pd.to_datetime(end_date, errors="coerce")]
        return result.reset_index(drop=True)

    def _filter_options(self, df: pd.DataFrame | None) -> dict[str, Any]:
        if df is None or df.empty:
            return {}
        cols = self._columns(df)
        options: dict[str, Any] = {}
        for key, column in {
            "villes": cols.get("city"),
            "canaux": cols.get("channel"),
            "clients": cols.get("client"),
            "produits": cols.get("product"),
            "vendeurs": cols.get("seller"),
        }.items():
            if column and column in df.columns:
                options[key] = sorted(str(value) for value in df[column].dropna().unique())[:150]
            else:
                options[key] = []
        date_col = cols.get("date")
        if date_col and date_col in df.columns:
            dates = pd.to_datetime(df[date_col], errors="coerce").dropna()
            options["date_min"] = dates.min().date().isoformat() if not dates.empty else None
            options["date_max"] = dates.max().date().isoformat() if not dates.empty else None
        return options

    def _numeric_series(self, df: pd.DataFrame, column: str | None) -> pd.Series:
        if not column or column not in df.columns:
            return pd.Series(dtype="float64")
        return pd.to_numeric(df[column], errors="coerce").fillna(0)

    def _top_by_revenue(self, df: pd.DataFrame, name_col: str | None, revenue_col: str | None, limit: int = 5) -> list[dict[str, Any]]:
        if not name_col or not revenue_col or name_col not in df.columns or revenue_col not in df.columns:
            return []
        temp = df[[name_col, revenue_col]].copy()
        temp[revenue_col] = pd.to_numeric(temp[revenue_col], errors="coerce")
        temp = temp.dropna(subset=[name_col, revenue_col])
        if temp.empty:
            return []
        grouped = temp.groupby(name_col)[revenue_col].sum().sort_values(ascending=False).head(limit)
        return [{"name": str(k), "value": round(float(v), 2)} for k, v in grouped.items()]

    def _normalize_text(self, value: Any) -> str:
        text = unicodedata.normalize("NFKD", str(value or ""))
        text = "".join(char for char in text if not unicodedata.combining(char))
        return text.lower().strip()

    def _payment_counts(self, df: pd.DataFrame, payment_col: str | None) -> dict[str, int]:
        if not payment_col or payment_col not in df.columns:
            return {"paid": 0, "unpaid": 0, "unknown": 0}
        paid = 0
        unpaid = 0
        unknown = 0
        for raw_value in df[payment_col]:
            value = self._normalize_text(raw_value)
            if any(word in value for word in ["impaye", "non paye", "unpaid", "pending", "attente", "false", "no", "non"]):
                unpaid += 1
            elif any(word in value for word in ["paye", "paid", "regle", "true", "yes", "oui", "1"]):
                paid += 1
            else:
                unknown += 1
        return {"paid": paid, "unpaid": unpaid, "unknown": unknown}

    def _build_dashboard(self, df: pd.DataFrame) -> dict[str, Any]:
        cols = self._columns(df)
        revenue_col = cols["revenue"]
        margin_col = cols["margin"]
        cost_col = cols["cost"]
        date_col = cols["date"]
        order_col = cols["order"]

        revenue_values = self._numeric_series(df, revenue_col)
        revenue_total = float(revenue_values.sum()) if not revenue_values.empty else 0.0

        if margin_col:
            margin_total = float(self._numeric_series(df, margin_col).sum())
        elif cost_col and revenue_col:
            margin_total = float((revenue_values - self._numeric_series(df, cost_col)).sum())
        else:
            margin_total = 0.0
        margin_rate = (margin_total / revenue_total * 100) if revenue_total else 0.0

        order_count = int(df[order_col].nunique()) if order_col and order_col in df.columns else int(len(df))
        client_count = int(df[cols["client"]].nunique()) if cols["client"] and cols["client"] in df.columns else 0
        product_count = int(df[cols["product"]].nunique()) if cols["product"] and cols["product"] in df.columns else 0
        basket = round(revenue_total / max(1, order_count), 2) if revenue_total else 0.0

        monthly_series = []
        best_monthly_growth = None
        if date_col and date_col in df.columns and revenue_col and revenue_col in df.columns:
            temp = df[[date_col, revenue_col]].copy()
            temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
            temp[revenue_col] = pd.to_numeric(temp[revenue_col], errors="coerce")
            temp = temp.dropna(subset=[date_col, revenue_col])
            monthly = temp.groupby(temp[date_col].dt.to_period("M"))[revenue_col].sum().sort_index()
            monthly_series = [{"month": str(period), "value": round(float(value), 2)} for period, value in monthly.items()]
            if len(monthly_series) >= 2:
                growth_items = []
                for index in range(1, len(monthly_series)):
                    previous = monthly_series[index - 1]
                    current = monthly_series[index]
                    delta = float(current["value"] or 0) - float(previous["value"] or 0)
                    growth_items.append({"month": current["month"], "value": round(delta, 2), "previous_month": previous["month"]})
                best_monthly_growth = max(growth_items, key=lambda item: item["value"])

        top_clients = self._top_by_revenue(df, cols["client"], revenue_col)
        top_products = self._top_by_revenue(df, cols["product"], revenue_col)
        top_cities = self._top_by_revenue(df, cols["city"], revenue_col)
        top_channels = self._top_by_revenue(df, cols["channel"], revenue_col)
        top_sellers = self._top_by_revenue(df, cols["seller"], revenue_col)
        payment_counts = self._payment_counts(df, cols["payment"])

        return {
            "revenue_total": round(revenue_total, 2),
            "margin_total": round(margin_total, 2),
            "margin_rate": round(margin_rate, 1),
            "client_count": client_count,
            "product_count": product_count,
            "order_count": order_count,
            "average_basket": basket,
            "paid_order_count": payment_counts["paid"],
            "unpaid_order_count": payment_counts["unpaid"],
            "unknown_payment_count": payment_counts["unknown"],
            "monthly_evolution": monthly_series,
            "best_monthly_growth": best_monthly_growth,
            "top_clients": top_clients,
            "top_products": top_products,
            "top_cities": top_cities,
            "top_channels": top_channels,
            "top_sellers": top_sellers,
            "best_city": top_cities[0] if top_cities else None,
            "best_channel": top_channels[0] if top_channels else None,
            "best_seller": top_sellers[0] if top_sellers else None,
            "city_breakdown": top_cities,
            "channel_breakdown": top_channels,
        }

    def _format_currency(self, value: Any) -> str:
        try:
            number = float(value or 0)
        except (TypeError, ValueError):
            number = 0.0
        return f"{number:,.2f}".replace(",", " ").replace(".", ",") + " €"

    def _build_insights(self, df: pd.DataFrame, dashboard: dict[str, Any]) -> list[str]:
        insights = []
        if dashboard["revenue_total"]:
            insights.append(f"Le chiffre d'affaires total est de {self._format_currency(dashboard['revenue_total'])}.")
        if dashboard["margin_total"]:
            insights.append(f"La marge totale est de {self._format_currency(dashboard['margin_total'])}, soit un taux de marge de {dashboard['margin_rate']:.1f} %.")
        if dashboard["client_count"]:
            insights.append(f"Vous avez {dashboard['client_count']} clients distincts dans la base actuelle.")
        if dashboard["top_clients"]:
            top_client = dashboard["top_clients"][0]
            insights.append(f"Le client le plus important est {top_client['name']} avec {self._format_currency(top_client['value'])} de chiffre d'affaires.")
        if dashboard["top_products"]:
            top_product = dashboard["top_products"][0]
            insights.append(f"Le produit le plus performant est {top_product['name']} avec {self._format_currency(top_product['value'])} de chiffre d'affaires.")
        if dashboard.get("best_channel"):
            insights.append(f"Le canal le plus performant est {dashboard['best_channel']['name']} avec {self._format_currency(dashboard['best_channel']['value'])}.")
        if df.shape[0] > 0:
            missing_ratio = df.isna().mean().mean()
            if missing_ratio > 0.1:
                insights.append("La qualite des donnees merite une attention particuliere a cause des valeurs manquantes.")
        return insights

    def _build_alerts(self, df: pd.DataFrame, dashboard: dict[str, Any]) -> list[dict[str, Any]]:
        alerts = []
        if dashboard["monthly_evolution"] and len(dashboard["monthly_evolution"]) >= 2:
            last_month = dashboard["monthly_evolution"][-1]["value"]
            prev_month = dashboard["monthly_evolution"][-2]["value"]
            if last_month < prev_month * 0.9:
                alerts.append({"type": "baisse_ca", "severity": "warning", "status": "nouveau", "message": "Le chiffre d'affaires a baisse par rapport au mois precedent."})
        missing_ratio = float(df.isna().mean().mean())
        if missing_ratio > 0.2:
            alerts.append({"type": "mauvaise_qualite", "severity": "critical", "status": "nouveau", "message": "Le jeu de donnees presente trop de valeurs manquantes."})
        if dashboard["unpaid_order_count"]:
            alerts.append({"type": "paiements", "severity": "warning", "status": "nouveau", "message": f"{dashboard['unpaid_order_count']} commandes semblent non payees ou en attente."})
        if dashboard["top_clients"] and len(dashboard["top_clients"]) >= 2 and dashboard["top_clients"][-1]["value"] < 100:
            alerts.append({"type": "client_inactif", "severity": "info", "status": "nouveau", "message": "Un ou plusieurs clients semblent peu actifs sur cette periode."})
        return alerts

    def _build_predictions(self, df: pd.DataFrame) -> dict[str, Any]:
        from sklearn.linear_model import LinearRegression

        method = "Régression linéaire sur le chiffre d'affaires mensuel. La fourchette est estimée à partir de l'erreur historique moyenne."
        revenue_col = infer_column(df.columns, ["ca", "chiffre_affaires", "chiffre_d_affaires", "revenu", "amount", "sales", "montant"])
        date_col = infer_column(df.columns, ["date", "date_facture", "date_vente", "created_at", "dt"])
        if not revenue_col or not date_col or len(df) < 2:
            return {"forecast": [], "historical": [], "anomalies": [], "trend": "insufficient_data", "confidence_score": 0, "method": method, "message": "Données insuffisantes : une colonne date et une colonne chiffre d'affaires sont nécessaires."}

        temp = df[[date_col, revenue_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp[revenue_col] = pd.to_numeric(temp[revenue_col], errors="coerce")
        temp = temp.dropna(subset=[date_col, revenue_col])
        monthly = temp.groupby(temp[date_col].dt.to_period("M"))[revenue_col].sum().sort_index()
        historical = [{"month": str(period), "value": round(float(value), 2), "kind": "historical"} for period, value in monthly.items()]
        if len(monthly) < 3:
            return {"forecast": [], "historical": historical, "anomalies": [], "trend": "insufficient_data", "confidence_score": 25, "method": method, "message": "Données insuffisantes : au moins 3 mois d'historique sont recommandés pour une prévision fiable."}

        X = np.arange(len(monthly)).reshape(-1, 1)
        y = monthly.values
        model = LinearRegression()
        model.fit(X, y)
        fitted = model.predict(X)
        errors = y - fitted
        mae = float(np.mean(np.abs(errors))) if len(errors) else 0.0
        mean_value = float(np.mean(y)) or 1.0
        confidence_score = max(35, min(95, round(100 - (mae / mean_value * 100), 0)))
        slope = float(model.coef_[0])
        if slope > mean_value * 0.03:
            trend = "hausse"
        elif slope < -mean_value * 0.03:
            trend = "baisse"
        else:
            trend = "stable"

        last_period = monthly.index[-1]
        forecast = []
        interval = max(mae, mean_value * 0.08)
        for index in range(1, 4):
            period = last_period + index
            value = max(0, float(model.predict([[len(monthly) + index - 1]])[0]))
            forecast.append({
                "month": str(period),
                "value": round(value, 2),
                "low": round(max(0, value - interval), 2),
                "high": round(value + interval, 2),
                "kind": "forecast",
            })

        std_value = float(np.std(y))
        anomalies = []
        if std_value > 0:
            for period, value in monthly.items():
                z_score = abs(float(value) - mean_value) / std_value
                if z_score >= 1.5:
                    direction = "au-dessus" if float(value) > mean_value else "en dessous"
                    anomalies.append({
                        "month": str(period),
                        "value": round(float(value), 2),
                        "z_score": round(z_score, 2),
                        "reason": f"Ce mois est {direction} de la moyenne mensuelle avec un écart statistique élevé.",
                    })

        return {
            "forecast": forecast,
            "historical": historical,
            "anomalies": anomalies,
            "trend": trend,
            "confidence_score": int(confidence_score),
            "method": method,
            "message": "Prévision calculée à partir de l'historique mensuel disponible.",
            "model": "linear_regression",
        }