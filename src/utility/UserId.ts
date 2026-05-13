import crypto from "crypto";

export const generateUserId = (): string => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  const getRandomCharacter = () =>
    alphabet[crypto.getRandomValues(new Uint8Array(1))[0] % alphabet.length];

  const getRandomDigit = () =>
    crypto.getRandomValues(new Uint8Array(1))[0] % 10;
  // Combine letters and numbers to get userId of format XXNNXXNN

  const userId = `${getRandomCharacter()}${getRandomCharacter()}${getRandomDigit()}${getRandomDigit()}${getRandomCharacter()}${getRandomCharacter()}${getRandomDigit()}${getRandomDigit()}`;
  return userId;
};

export const normalizeId = (id: unknown): string | null => {
  return typeof id === "string" || typeof id === "number"
    ? id.toString().toLowerCase()
    : null;
};
