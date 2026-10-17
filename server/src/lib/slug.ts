const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateSlug(length = 10): string {
  let slug = 'chat-';
  for (let i = 0; i < length; i++) {
    slug += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return slug;
}
