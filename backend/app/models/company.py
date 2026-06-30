from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sector = Column(String, default="")
    size = Column(String, default="")
    contact_email = Column(String, default="")
    address = Column(String, default="")
    country = Column(String, default="")
    city = Column(String, default="")
    currency = Column(String, default="EUR")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="company")
    files = relationship("UploadedFile", back_populates="company")