from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    row_count: int
    column_count: int

    class Config:
        from_attributes = True
