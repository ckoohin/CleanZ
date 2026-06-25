// Sự kiện socket realtime ChatBox — khớp BE (NotificationGateway, default namespace).
export const TICKET_EVENT_MESSAGE = "ticket:message";
export const TICKET_EVENT_TYPING = "ticket:typing";
export const TICKET_EVENT_READ = "ticket:read";
export const TICKET_EVENT_JOIN = "ticket:join";
export const TICKET_EVENT_LEAVE = "ticket:leave";

export const MAX_CHAT_IMAGES = 5;
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/jpg"];
