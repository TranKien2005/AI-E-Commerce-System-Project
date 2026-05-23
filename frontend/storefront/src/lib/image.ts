export const placeholderProductImage = "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=900&q=80";

const imageUrlPattern = /https?:\/\/\S+/g;

export function safeImageUrl(value: string | null | undefined, fallback = placeholderProductImage) {
  if (!value) return fallback;
  const match = value.trim().match(imageUrlPattern)?.[0];
  return match ?? fallback;
}
