from typing import Any
import unicodedata

import httpx
import pandas as pd

from app.core.config import settings
from app.utils.cleaning import infer_column


class AssistantService:
    def answer(
        self,
        question: str,
        dashboard: dict[str, Any],
        insights: list[str],
        dataframe: pd.DataFrame | None = None,
    ) -> dict[str, Any]:
        if settings.OPENAI_API_KEY:
            try:
                response = httpx.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": "Tu es un assistant BI pour une PME francaise. Reponds clairement en francais avec des recommandations concretes."},
                            {"role": "user", "content": f"Question: {question}\nContexte dashboard: {dashboard}\nInsights: {insights}"},
                        ],
                    },
                    timeout=20,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                return {"answer": content, "source": "openai"}
            except Exception:
                pass

        return {"answer": self._answer_local(question, dashboard, insights, dataframe), "source": "local"}

    def _answer_local(
        self,
        question: str,
        dashboard: dict[str, Any],
        insights: list[str],
        df: pd.DataFrame | None,
    ) -> str:
        normalized_question = self._normalize(question)

        if self._has_any(normalized_question, ["action", "recommand", "conseil", "commercial"]):
            return self._commercial_actions(dashboard, df)
        if self._has_any(normalized_question, ["resume", "résumé", "synthese", "global", "mois", "bilan"]):
            return self._summary(dashboard, df)
        if self._has_any(normalized_question, ["baisse", "diminue", "chute", "recul"]):
            return self._revenue_decline(dashboard)
        if self._has_any(normalized_question, ["meilleur client", "meilleurs clients", "top client", "top clients", "client important", "clients importants"]):
            return self._top_entity_answer(df, dashboard, "client", "clients")
        if self._has_any(normalized_question, ["meilleur produit", "meilleurs produits", "top produit", "top produits", "produit important"]):
            return self._top_entity_answer(df, dashboard, "produit", "produits")
        if self._has_any(normalized_question, ["canal", "channel"]):
            return self._top_entity_answer(df, dashboard, "canal", "canaux", singular_label="canal")
        if self._has_any(normalized_question, ["ville", "localite", "zone"]):
            return self._top_entity_answer(df, dashboard, "ville", "villes", singular_label="ville")
        if self._has_any(normalized_question, ["vendeur", "commercial"]):
            return self._top_entity_answer(df, dashboard, "vendeur", "vendeurs", singular_label="vendeur")
        if self._has_any(normalized_question, ["chiffre", "ca", "revenu", "vente", "ventes"]):
            return f"Le chiffre d'affaires total est de {self._format_currency(dashboard.get('revenue_total', 0))}."
        if "client" in normalized_question:
            return f"La base contient {dashboard.get('client_count', 0)} clients distincts. Pour obtenir un classement, demandez par exemple : Quels sont mes meilleurs clients ?"
        if "produit" in normalized_question:
            return f"La base contient {dashboard.get('product_count', 0)} produits distincts. Pour obtenir un classement, demandez par exemple : Quels sont mes meilleurs produits ?"

        return "Je peux analyser vos meilleurs clients, produits, canaux, villes, vendeurs, le chiffre d'affaires, les baisses de performance et proposer des actions commerciales."

    def _normalize(self, text: str) -> str:
        value = unicodedata.normalize("NFKD", text or "")
        value = "".join(char for char in value if not unicodedata.combining(char))
        return value.lower()

    def _has_any(self, text: str, needles: list[str]) -> bool:
        return any(self._normalize(needle) in text for needle in needles)

    def _format_currency(self, value: Any) -> str:
        try:
            number = float(value or 0)
        except (TypeError, ValueError):
            number = 0.0
        formatted = f"{number:,.2f}".replace(",", " ").replace(".", ",")
        return f"{formatted} €"

    def _format_percent(self, value: Any) -> str:
        try:
            number = float(value or 0)
        except (TypeError, ValueError):
            number = 0.0
        return f"{number:.1f}".replace(".", ",") + " %"

    def _columns(self, df: pd.DataFrame | None) -> dict[str, str | None]:
        if df is None or df.empty:
            return {}
        columns = df.columns
        return {
            "revenue": infer_column(columns, ["ca", "chiffre_affaires", "chiffre_d_affaires", "revenu", "amount", "sales", "montant", "total"]),
            "client": infer_column(columns, ["client", "client_name", "customer", "customer_name", "client_id"]),
            "produit": infer_column(columns, ["produit", "product", "article", "sku", "item"]),
            "ville": infer_column(columns, ["ville", "city", "localite", "commune"]),
            "canal": infer_column(columns, ["canal", "channel", "source", "mode_vente", "origine"]),
            "vendeur": infer_column(columns, ["vendeur", "commercial", "sales_rep", "seller", "agent"]),
        }

    def _top_from_dataframe(self, df: pd.DataFrame | None, entity: str, limit: int = 5) -> list[dict[str, Any]]:
        cols = self._columns(df)
        entity_col = cols.get(entity)
        revenue_col = cols.get("revenue")
        if df is None or df.empty or not entity_col or not revenue_col:
            return []

        temp = df[[entity_col, revenue_col]].copy()
        temp[revenue_col] = pd.to_numeric(temp[revenue_col], errors="coerce")
        temp = temp.dropna(subset=[entity_col, revenue_col])
        if temp.empty:
            return []

        grouped = temp.groupby(entity_col)[revenue_col].sum().sort_values(ascending=False).head(limit)
        return [{"name": str(name), "value": float(value)} for name, value in grouped.items()]

    def _dashboard_list(self, dashboard: dict[str, Any], entity: str) -> list[dict[str, Any]]:
        key_by_entity = {
            "client": "top_clients",
            "produit": "top_products",
            "ville": "top_cities",
            "canal": "top_channels",
            "vendeur": "top_sellers",
        }
        value = dashboard.get(key_by_entity.get(entity, ""), [])
        return value if isinstance(value, list) else []

    def _top_entity_answer(
        self,
        df: pd.DataFrame | None,
        dashboard: dict[str, Any],
        entity: str,
        plural_label: str,
        singular_label: str | None = None,
    ) -> str:
        singular = singular_label or entity
        top_items = self._top_from_dataframe(df, entity) or self._dashboard_list(dashboard, entity)
        if not top_items:
            return f"Je n'ai pas trouvé les colonnes nécessaires pour classer les {plural_label}. Il faut au minimum une colonne {singular} et une colonne chiffre d'affaires."

        adjective = "meilleures" if singular == "ville" else "meilleurs"
        leader_prefix = "La première ville" if singular == "ville" else f"Le premier {singular}"
        lines = [f"Voici vos 5 {adjective} {plural_label} par chiffre d'affaires :", ""]
        for index, item in enumerate(top_items[:5], start=1):
            lines.append(f"{index}. {item.get('name', 'Non renseigné')} : {self._format_currency(item.get('value', 0))}")

        total_revenue = float(dashboard.get("revenue_total") or sum(float(item.get("value") or 0) for item in top_items))
        leader = top_items[0]
        leader_share = (float(leader.get("value") or 0) / total_revenue * 100) if total_revenue else 0
        lines.extend([
            "",
            f"{leader_prefix} représente environ {self._format_percent(leader_share)} du chiffre d'affaires analysé.",
            "C'est un point d'appui commercial important : fidélisez ce segment et cherchez à reproduire ce qui fonctionne sur les autres comptes.",
        ])
        return "\n".join(lines)
    def _summary(self, dashboard: dict[str, Any], df: pd.DataFrame | None) -> str:
        client_top = (self._top_from_dataframe(df, "client", 1) or self._dashboard_list(dashboard, "client") or [{}])[0]
        product_top = (self._top_from_dataframe(df, "produit", 1) or self._dashboard_list(dashboard, "produit") or [{}])[0]
        city_top = (self._top_from_dataframe(df, "ville", 1) or self._dashboard_list(dashboard, "ville") or [{}])[0]
        channel_top = (self._top_from_dataframe(df, "canal", 1) or self._dashboard_list(dashboard, "canal") or [{}])[0]

        best_month = None
        monthly = dashboard.get("monthly_evolution") or []
        if monthly:
            best_month = max(monthly, key=lambda item: float(item.get("value") or 0))

        lines = [
            "Voici le résumé de votre activité :",
            "",
            f"- Chiffre d'affaires total : {self._format_currency(dashboard.get('revenue_total', 0))}",
            f"- Nombre de clients : {dashboard.get('client_count', 0)}",
            f"- Nombre de produits : {dashboard.get('product_count', 0)}",
            f"- Panier moyen : {self._format_currency(dashboard.get('average_basket', 0))}",
            f"- Meilleur client : {client_top.get('name', 'Non disponible')} ({self._format_currency(client_top.get('value', 0))})",
            f"- Meilleur produit : {product_top.get('name', 'Non disponible')} ({self._format_currency(product_top.get('value', 0))})",
            f"- Ville la plus performante : {city_top.get('name', 'Non disponible')} ({self._format_currency(city_top.get('value', 0))})",
            f"- Canal le plus performant : {channel_top.get('name', 'Non disponible')} ({self._format_currency(channel_top.get('value', 0))})",
        ]
        if best_month:
            lines.append(f"- Meilleur mois : {best_month.get('month')} avec {self._format_currency(best_month.get('value', 0))}")
        lines.extend(["", "Globalement, vos priorités sont de sécuriser les meilleurs contributeurs et de renforcer les canaux qui génèrent le plus de chiffre d'affaires."])
        return "\n".join(lines)

    def _revenue_decline(self, dashboard: dict[str, Any]) -> str:
        monthly = dashboard.get("monthly_evolution") or []
        if len(monthly) < 2:
            return "Je n'ai pas assez d'historique mensuel pour mesurer une baisse du chiffre d'affaires."
        previous = monthly[-2]
        current = monthly[-1]
        previous_value = float(previous.get("value") or 0)
        current_value = float(current.get("value") or 0)
        if previous_value <= 0:
            return "Le mois precedent est nul ou non exploitable, je ne peux pas calculer une evolution fiable."
        variation = (current_value - previous_value) / previous_value * 100
        direction = "baisse" if variation < 0 else "hausse"
        return "\n".join([
            f"Le chiffre d'affaires du dernier mois est en {direction} de {self._format_percent(abs(variation))} par rapport au mois precedent.",
            f"- Mois precedent ({previous.get('month')}) : {self._format_currency(previous_value)}",
            f"- Dernier mois ({current.get('month')}) : {self._format_currency(current_value)}",
            "Analysez les clients, produits ou canaux en recul pour prioriser les actions commerciales.",
        ])

    def _commercial_actions(self, dashboard: dict[str, Any], df: pd.DataFrame | None) -> str:
        best_client = (self._top_from_dataframe(df, "client", 1) or self._dashboard_list(dashboard, "client") or [{}])[0]
        best_product = (self._top_from_dataframe(df, "produit", 1) or self._dashboard_list(dashboard, "produit") or [{}])[0]
        best_channel = (self._top_from_dataframe(df, "canal", 1) or self._dashboard_list(dashboard, "canal") or [{}])[0]

        return "\n".join([
            "Voici 3 actions commerciales recommandées :",
            "",
            f"1. Fidéliser vos meilleurs clients, en priorité {best_client.get('name', 'vos clients principaux')}, avec une offre dédiée ou un suivi personnalisé.",
            "2. Relancer les clients faibles ou inactifs avec une campagne courte : remise limitee, appel commercial ou email de réactivation.",
            f"3. Renforcer ce qui marche déjà : poussez davantage {best_product.get('name', 'vos produits les plus performants')} sur {best_channel.get('name', 'vos canaux les plus rentables')}.",
        ])