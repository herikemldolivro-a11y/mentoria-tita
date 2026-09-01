export const USERNAME_LOGIN_DOMAIN = "login.mentoriatita.app";

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveLoginEmail(identity: string) {
  const normalized = normalizeUsername(identity);
  if (normalized.includes("@")) return normalized;
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalized)) {
    throw new Error("Usuário inválido");
  }
  return `${normalized}@${USERNAME_LOGIN_DOMAIN}`;
}

export function usernameAuthEmail(username: string) {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalized)) {
    throw new Error("Use de 3 a 32 caracteres: letras, números, ponto, traço ou underline.");
  }
  return `${normalized}@${USERNAME_LOGIN_DOMAIN}`;
}
