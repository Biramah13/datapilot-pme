import io
from textwrap import wrap
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.dataset import UploadedFile
from app.models.user import User
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/exports", tags=["exports"])


def get_record_or_404(file_id: int, current_user: User, db: Session) -> UploadedFile:
    record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not record or record.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return record


def query_filters(
    start_date: str | None = None,
    end_date: str | None = None,
    ville: str | None = None,
    canal: str | None = None,
    client: str | None = None,
    produit: str | None = None,
    vendeur: str | None = None,
) -> dict[str, str]:
    return {
        key: value
        for key, value in {
            "start_date": start_date,
            "end_date": end_date,
            "ville": ville,
            "canal": canal,
            "client": client,
            "produit": produit,
            "vendeur": vendeur,
        }.items()
        if value
    }


def format_eur(value: Any) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0.0
    return f"{number:,.2f}".replace(",", " ").replace(".", ",") + " EUR"


def ensure_room(pdf: canvas.Canvas, y: float, height: float, needed: float) -> float:
    if y - needed < 50:
        pdf.showPage()
        pdf.setFont("Helvetica", 10)
        return height - 50
    return y


def draw_bar_section(pdf: canvas.Canvas, title: str, items: list[dict[str, Any]], x: float, y: float, width: float, page_height: float) -> float:
    y = ensure_room(pdf, y, page_height, 140)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(x, y, title)
    y -= 18
    if not items:
        pdf.setFont("Helvetica", 10)
        pdf.drawString(x + 12, y, "Aucune donnee disponible")
        return y - 18

    max_value = max(float(item.get("value") or 0) for item in items) or 1
    pdf.setFont("Helvetica", 9)
    for item in items[:5]:
        value = float(item.get("value") or 0)
        name = str(item.get("name") or "Non renseigne")[:34]
        bar_width = max(4, (value / max_value) * width)
        y = ensure_room(pdf, y, page_height, 20)
        pdf.drawString(x + 12, y, name)
        pdf.rect(x + 155, y - 2, bar_width, 8, stroke=0, fill=1)
        pdf.drawString(x + 165 + width, y, format_eur(value))
        y -= 16
    return y - 8


@router.get("/{file_id}/{format}")
def export_file(
    file_id: int,
    format: str,
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    ville: str | None = Query(default=None),
    canal: str | None = Query(default=None),
    client: str | None = Query(default=None),
    produit: str | None = Query(default=None),
    vendeur: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = get_record_or_404(file_id, current_user, db)
    service = DatasetService(db, user_id=current_user.id, company_id=current_user.company_id or 0)
    cleaned = service.load_cleaned_dataframe(record)
    filters = query_filters(start_date, end_date, ville, canal, client, produit, vendeur)
    filtered = service.apply_filters(cleaned, filters) if filters else cleaned
    preview, dashboard, insights, alerts, predictions = service._analyze_dataframe(filtered)

    if filtered.empty:
        raise HTTPException(status_code=400, detail="Aucune donnée à exporter avec les filtres sélectionnés")

    if format == "csv":
        data = filtered.to_csv(index=False)
        return StreamingResponse(
            iter([data]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=datapilot_pme_ventes_filtrees.csv"},
        )

    if format in {"excel", "xlsx"}:
        output = io.BytesIO()
        summary_df = pd.DataFrame(
            [
                {
                    "lignes_filtrees": len(filtered),
                    "lignes_totales": len(cleaned),
                    "colonnes": len(filtered.columns),
                    "chiffre_affaires": dashboard.get("revenue_total", 0),
                    "marge": dashboard.get("margin_total", 0),
                    "taux_marge": dashboard.get("margin_rate", 0),
                    "clients": dashboard.get("client_count", 0),
                    "produits": dashboard.get("product_count", 0),
                }
            ]
        )
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            filtered.to_excel(writer, sheet_name="donnees_filtrees", index=False)
            summary_df.to_excel(writer, sheet_name="resume", index=False)
            pd.DataFrame(dashboard.get("top_clients", [])).to_excel(writer, sheet_name="top_clients", index=False)
            pd.DataFrame(dashboard.get("top_products", [])).to_excel(writer, sheet_name="top_produits", index=False)
            pd.DataFrame(alerts).to_excel(writer, sheet_name="alertes", index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=datapilot_pme_ventes_filtrees.xlsx"},
        )

    if format == "pdf":
        output = io.BytesIO()
        pdf = canvas.Canvas(output, pagesize=letter)
        width, height = letter
        y = height - 50
        pdf.setTitle(f"Rapport DataPilot PME - {record.original_name}")
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(40, y, "Rapport DataPilot PME")
        y -= 24
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Fichier : {record.original_name}")
        y -= 18
        pdf.drawString(40, y, f"Lignes filtrees : {len(filtered)} / {len(cleaned)} | Colonnes : {len(filtered.columns)}")
        y -= 26

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, y, "KPI principaux")
        y -= 18
        pdf.setFont("Helvetica", 10)
        kpis = [
            ("Chiffre d'affaires", format_eur(dashboard.get("revenue_total", 0))),
            ("Marge", format_eur(dashboard.get("margin_total", 0))),
            ("Taux de marge", f"{dashboard.get('margin_rate', 0)} %"),
            ("Panier moyen", format_eur(dashboard.get("average_basket", 0))),
            ("Clients", str(dashboard.get("client_count", 0))),
            ("Produits", str(dashboard.get("product_count", 0))),
        ]
        for label, value in kpis:
            y = ensure_room(pdf, y, height, 16)
            pdf.drawString(55, y, f"{label} : {value}")
            y -= 14

        y -= 10
        y = draw_bar_section(pdf, "Graphique principal - Top clients", dashboard.get("top_clients", []), 40, y, 150, height)
        y = draw_bar_section(pdf, "Graphique principal - Top produits", dashboard.get("top_products", []), 40, y, 150, height)

        y = ensure_room(pdf, y, height, 80)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, y, "Insights")
        y -= 18
        pdf.setFont("Helvetica", 10)
        for insight in insights[:8]:
            for line in wrap(str(insight), width=95):
                y = ensure_room(pdf, y, height, 14)
                pdf.drawString(55, y, line)
                y -= 14

        y -= 8
        y = ensure_room(pdf, y, height, 60)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, y, "Alertes")
        y -= 18
        pdf.setFont("Helvetica", 10)
        if alerts:
            for alert in alerts[:8]:
                text = f"[{alert.get('severity', 'info')}] {alert.get('message', '')}"
                for line in wrap(text, width=95):
                    y = ensure_room(pdf, y, height, 14)
                    pdf.drawString(55, y, line)
                    y -= 14
        else:
            pdf.drawString(55, y, "Aucune alerte detectee.")

        pdf.save()
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=datapilot_pme_rapport.pdf"},
        )

    raise HTTPException(status_code=400, detail="Format inconnu")