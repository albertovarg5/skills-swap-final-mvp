// Open Library Search API: https://openlibrary.org/search.json
export async function fetchBooks(topic) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(topic)}&limit=4&fields=key,title,author_name,cover_i`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load books");
  }
  const data = await response.json();
  return data.docs;
}

export function coverUrl(coverId) {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}
