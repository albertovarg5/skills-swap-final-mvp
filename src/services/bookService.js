// Open Library Search API: https://openlibrary.org/search.json
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries transient failures (network error, 429, 5xx) with growing delays: 500ms, 1000ms...
// Real errors (other 4xx) and cancelled requests are not retried.
export async function fetchBooks(topic, signal, { retries = 2, delayMs = 500 } = {}) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(topic)}&limit=4&fields=key,title,author_name,cover_i`;
  for (let attempt = 0; ; attempt++) {
    let retryable = true;
    try {
      const response = await fetch(url, { signal });
      if (response.ok) return (await response.json()).docs;
      retryable = response.status === 429 || response.status >= 500;
    } catch (e) {
      if (e.name === "AbortError") throw e;
    }
    if (!retryable || attempt >= retries) throw new Error("Could not load books");
    await wait(delayMs * 2 ** attempt);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  }
}

export function coverUrl(coverId) {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}
