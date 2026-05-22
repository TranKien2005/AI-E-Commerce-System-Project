const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type ChatEvent = {
  type: "chat_message" | "chat_conversation";
  conversation_id: number;
  message_id?: number;
  shop_id?: number | null;
  sender_id?: number;
};

export type AccountEvent = {
  type: "cart_updated" | "order_created" | "order_updated" | "seller_order_created";
  order_id?: number;
};

function openEventSocket<T>(token: string, path: string, onEvent: (event: T) => void) {
  const url = new URL(API_BASE_URL.replace(/^http/, "ws") + path);
  url.searchParams.set("token", token);
  const socket = new WebSocket(url.toString());
  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as T);
    } catch {
      // Ignore malformed realtime events.
    }
  };
  return socket;
}

export function openChatEventSocket(token: string, onEvent: (event: ChatEvent) => void) {
  return openEventSocket(token, "/chat/events", onEvent);
}

export function openAccountEventSocket(token: string, onEvent: (event: AccountEvent) => void) {
  return openEventSocket(token, "/account/events", onEvent);
}
