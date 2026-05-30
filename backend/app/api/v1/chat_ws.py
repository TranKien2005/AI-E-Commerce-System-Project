from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.entities import User
from app.services.chat_events import account_events, chat_events
from app.core.metrics import WS_CONNECTIONS_GAUGE, WS_CLOSE_CODE_COUNTER


router = APIRouter(tags=["chat-events"])


def _user_id_from_socket(websocket: WebSocket) -> int | None:
    token = websocket.query_params.get("token")
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")
        user_id = int(payload.get("sub"))
    except Exception:
        return None

    with SessionLocal() as db:
        user = db.get(User, user_id)
        if not user or user.status != "active":
            return None
    return user_id


@router.websocket("/chat/events")
async def chat_event_stream(websocket: WebSocket):
    user_id = _user_id_from_socket(websocket)
    if user_id is None:
        WS_CLOSE_CODE_COUNTER.labels(channel="chat", close_code="1008").inc()
        await websocket.close(code=1008)
        return
    WS_CONNECTIONS_GAUGE.labels(channel="chat").inc()
    await chat_events.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        chat_events.disconnect(user_id, websocket)
    finally:
        WS_CONNECTIONS_GAUGE.labels(channel="chat").dec()


@router.websocket("/account/events")
async def account_event_stream(websocket: WebSocket):
    user_id = _user_id_from_socket(websocket)
    if user_id is None:
        WS_CLOSE_CODE_COUNTER.labels(channel="account", close_code="1008").inc()
        await websocket.close(code=1008)
        return
    WS_CONNECTIONS_GAUGE.labels(channel="account").inc()
    await account_events.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        account_events.disconnect(user_id, websocket)
    finally:
        WS_CONNECTIONS_GAUGE.labels(channel="account").dec()
