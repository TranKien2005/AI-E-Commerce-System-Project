from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging
import traceback

logger = logging.getLogger(__name__)

def setup_exception_handlers(app: FastAPI):
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """
        Xử lý lỗi validate dữ liệu (Pydantic).
        Trả về chi tiết từng trường bị lỗi để Frontend có thể hiển thị thông báo chính xác.
        """
        details = []
        for error in exc.errors():
            loc = error.get("loc", [])
            # Lấy tên field (thường là phần tử cuối trong loc)
            field = str(loc[-1]) if loc else "body"
            msg = error.get("msg", "Dữ liệu không hợp lệ")
            type_ = error.get("type", "unknown")
            
            details.append({
                "field": field,
                "location": [str(x) for x in loc],
                "message": msg,
                "type": type_
            })
        
        logger.warning(f"Validation Error: {details}")
        
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Dữ liệu gửi lên không đúng định dạng yêu cầu",
                    "details": details
                }
            }
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """
        Xử lý các lỗi HTTP chủ động được raise từ Service (400, 401, 403, 404, 409, 422).
        """
        # Nếu đã có cấu trúc chuẩn thì trả về luôn
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            return JSONResponse(
                status_code=exc.status_code,
                content=exc.detail
            )
        
        # Nếu chưa có cấu trúc chuẩn, wrap lại
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": str(exc.detail),
                    "details": []
                }
            }
        )

    @app.exception_handler(Exception)
    async def universal_exception_handler(request: Request, exc: Exception):
        """
        Xử lý mọi lỗi chưa được lường trước (500).
        """
        # Log đầy đủ traceback để dev kiểm tra
        error_trace = traceback.format_exc()
        logger.error(f"INTERNAL SERVER ERROR: {str(exc)}\n{error_trace}")
        
        message = "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau."
        # Nếu ở mode debug thì trả về chi tiết lỗi cho dễ fix
        details = [str(exc)] if app.debug else []
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": message,
                    "details": details
                }
            }
        )
