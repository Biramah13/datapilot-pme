from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyUpdateRequest

router = APIRouter(prefix="/profile", tags=["profile"])


def company_payload(company: Company) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "sector": company.sector or "",
        "size": company.size or "",
        "contact_email": company.contact_email or "",
        "address": company.address or "",
        "country": company.country or "",
        "city": company.city or "",
        "currency": company.currency or "EUR",
    }


@router.get("")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return {
        "user": {"id": current_user.id, "name": current_user.name, "email": current_user.email},
        "company": company_payload(company),
    }


@router.put("")
def update_profile(payload: CompanyUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value or "")
    if not company.currency:
        company.currency = "EUR"
    db.commit()
    db.refresh(company)
    return {"message": "Profil entreprise mis à jour", "company": company_payload(company)}