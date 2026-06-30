from pydantic import BaseModel


class CompanyUpdateRequest(BaseModel):
    name: str | None = None
    sector: str | None = None
    size: str | None = None
    contact_email: str | None = None
    address: str | None = None
    country: str | None = None
    city: str | None = None
    currency: str | None = None