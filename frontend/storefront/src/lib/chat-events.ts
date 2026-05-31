const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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
  let base = API_BASE_URL;

  // Handle case where base might be the literal string "undefined", empty, or null
  if (!base || base === "undefined" || base === "null") {
    if (typeof window !== "undefined") {
      base = "/api/v1";
    } else {
      base = "http://localhost:8000/api/v1";
    }
  }

  let wsUrlString = base;
  if (wsUrlString.startsWith("/")) {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrlString = `${protocol}//${window.location.host}${wsUrlString}`;
    } else {
      wsUrlString = `ws://localhost:8000${wsUrlString}`;
    }
  } else {
    wsUrlString = wsUrlString.replace(/^http/, "ws");
  }

  let url: URL;
  try {
    url = new URL(wsUrlString + path);
  } catch (err) {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      url = new URL(`${protocol}//${window.location.host}/api/v1${path}`);
    } else {
      url = new URL(`ws://localhost:8000/api/v1${path}`);
    }
  }

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
