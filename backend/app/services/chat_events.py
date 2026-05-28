"""In-process WebSocket event fan-out for chat and account updates."""

from collections import defaultdict

from anyio.from_thread import run
from fastapi import WebSocket


class ChatEventManager:
    """Tracks active WebSocket connections by user id and pushes JSON events."""

    def __init__(self):
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        connections = self._connections.get(user_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(user_id, None)

    async def publish(self, user_id: int, payload: dict):
        # Copy the set before iterating because failed sends remove sockets.
        connections = list(self._connections.get(user_id, set()))
        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(user_id, websocket)

    def publish_from_thread(self, user_id: int, payload: dict):
        # Services are synchronous; bridge their side effects into the async loop.
        try:
            run(self.publish, user_id, payload)
        except RuntimeError:
            pass


chat_events = ChatEventManager()
account_events = ChatEventManager()
