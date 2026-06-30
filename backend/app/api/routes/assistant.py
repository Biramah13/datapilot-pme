from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.dataset import UploadedFile
from app.models.user import User
from app.services.assistant_service import AssistantService
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/assistant", tags=["assistant"])


class AssistantRequest(BaseModel):
    question: str
    file_id: int | None = None


@router.post("")
def ask_assistant(payload: AssistantRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = None
    dataframe = None
    if payload.file_id:
        record = db.query(UploadedFile).filter(UploadedFile.id == payload.file_id).first()
        if not record or record.company_id != current_user.company_id:
            raise HTTPException(status_code=404, detail="Fichier introuvable")
        try:
            dataset_service = DatasetService(db, user_id=current_user.id, company_id=current_user.company_id or 0)
            dataframe = dataset_service.load_cleaned_dataframe(record)
        except Exception:
            dataframe = None

    dashboard = record.dashboard if record else {}
    insights = record.insights if record else []
    service = AssistantService()
    return service.answer(payload.question, dashboard, insights, dataframe)