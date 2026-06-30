from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.company import Company
from app.models.user import User


class AuthService:
    def register(self, db: Session, email: str, password: str, name: str, company_name: str | None, sector: str | None) -> tuple[User, str]:
        if db.query(User).filter(User.email == email).first():
            raise ValueError("Cet email est déjà utilisé")
        company = Company(name=company_name or "Entreprise", sector=sector or "")
        db.add(company)
        db.flush()
        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            company_id=company.id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token(str(user.id))
        return user, token

    def login(self, db: Session, email: str, password: str) -> tuple[User, str]:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Email ou mot de passe invalide")
        token = create_access_token(str(user.id))
        return user, token
