from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi import File, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.dataset import UploadedFile
from app.models.user import User
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/files", tags=["files"])


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


@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="L'entreprise est introuvable")
    try:
        service = DatasetService(db, user_id=current_user.id, company_id=current_user.company_id)
        result = service.process_upload(file, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result


@router.get("/history")
def history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = (
        db.query(UploadedFile)
        .filter(UploadedFile.company_id == current_user.company_id)
        .order_by(UploadedFile.created_at.desc())
        .all()
    )
    return [
        {
            "id": record.id,
            "filename": record.filename,
            "original_name": record.original_name,
            "row_count": record.row_count,
            "column_count": record.column_count,
            "created_at": record.created_at.isoformat(),
        }
        for record in records
    ]


@router.get("/{file_id}/preview")
def preview(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = get_record_or_404(file_id, current_user, db)
    return record.summary


@router.get("/{file_id}/detail")
def detail(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = get_record_or_404(file_id, current_user, db)
    service = DatasetService(db, user_id=current_user.id, company_id=current_user.company_id or 0)
    return service.dataset_detail(record)


@router.post("/{file_id}/clean")
def clean(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = get_record_or_404(file_id, current_user, db)
    service = DatasetService(db, user_id=current_user.id, company_id=current_user.company_id or 0)
    return service.refresh_record_analysis(record)


@router.get("/{file_id}/analysis")
def analysis(
    file_id: int,
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
    filters = query_filters(start_date, end_date, ville, canal, client, produit, vendeur)
    return service.refresh_record_analysis(record, filters=filters or None)