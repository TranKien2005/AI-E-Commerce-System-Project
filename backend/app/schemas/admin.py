from pydantic import BaseModel


class PatchUserIn(BaseModel):
    status: str | None = None
    role: str | None = None


class PatchSellerRequestIn(BaseModel):
    action: str
    reason: str = ""
