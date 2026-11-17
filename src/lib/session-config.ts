const developmentSecret = "campus_secret_key_minimum_32_characters_for_hs256_jwt_token!";

export function sessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === "production" &&
      (!secret || secret.length < 32 || secret === developmentSecret)) {
    throw new Error("Set JWT_SECRET to a unique value of at least 32 characters before starting production.");
  }
  return new TextEncoder().encode(secret || developmentSecret);
}
