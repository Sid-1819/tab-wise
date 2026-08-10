import type { TabInfo } from '@/types/tab';

const WORD_BOUNDARY = /[\s/.\-_]/;

function isWordBoundary(char: string | undefined): boolean {
  return char === undefined || WORD_BOUNDARY.test(char);
}

function substringScore(text: string, query: string): number {
  const index = text.indexOf(query);
  if (index === -1) {
    return 0;
  }

  let score = 1000;
  if (index === 0) {
    score += 50;
  } else if (isWordBoundary(text[index - 1])) {
    score += 25;
  }

  return score + query.length * 10;
}

function subsequenceScore(text: string, query: string): number {
  if (query.length === 1) {
    return 0;
  }

  let score = 0;
  let textIndex = 0;
  let lastMatchIndex = -1;
  let consecutiveMatches = 0;

  for (let queryIndex = 0; queryIndex < query.length; queryIndex++) {
    const queryChar = query[queryIndex];
    let matched = false;

    while (textIndex < text.length) {
      if (text[textIndex] === queryChar) {
        const matchIndex = textIndex;
        score += 10;

        if (lastMatchIndex >= 0) {
          const gap = matchIndex - lastMatchIndex - 1;
          score -= gap * 2;

          if (gap === 0) {
            consecutiveMatches += 1;
            score += 20;
          } else {
            consecutiveMatches = 0;
          }
        }

        if (isWordBoundary(text[matchIndex - 1])) {
          score += 5;
        }

        lastMatchIndex = matchIndex;
        textIndex = matchIndex + 1;
        matched = true;
        break;
      }

      textIndex += 1;
    }

    if (!matched) {
      return 0;
    }
  }

  if (consecutiveMatches > 0) {
    score += consecutiveMatches * 5;
  }

  return score;
}

export function fuzzyScore(text: string, query: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return 0;
  }

  const exactScore = substringScore(normalizedText, normalizedQuery);
  if (exactScore > 0) {
    return exactScore;
  }

  return subsequenceScore(normalizedText, normalizedQuery);
}

export function scoreTab(tab: TabInfo, query: string): number {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return 0;
  }

  let totalScore = 0;

  for (const token of tokens) {
    const tokenScore = Math.max(
      fuzzyScore(tab.title, token),
      fuzzyScore(tab.url, token)
    );

    if (tokenScore === 0) {
      return 0;
    }

    totalScore += tokenScore;
  }

  return totalScore;
}
