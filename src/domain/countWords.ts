

const WHITESPACE = /\s+/;
const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  return text
    .split(WHITESPACE)
    .filter((token) => HAS_LETTER_OR_NUMBER.test(token))
    .length;
}