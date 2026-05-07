from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    data: dict
    message: str = "OK"


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list = []


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorBody
