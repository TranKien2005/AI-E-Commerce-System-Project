from fastapi import HTTPException


def ok(data: dict | None = None, message: str = "OK"):
    return {"success": True, "data": data or {}, "message": message}


def fail(status_code: int, code: str, message: str, details: list | None = None):
    raise HTTPException(
        status_code=status_code,
        detail={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or [],
            },
        },
    )
