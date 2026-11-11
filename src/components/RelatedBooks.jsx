import { useState, useEffect } from "react";
import { fetchBooks, coverUrl } from "../services/bookService";

export default function RelatedBooks({ topic }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchBooks(topic)
      .then((docs) => setBooks(docs))
      .catch(() => setError("Sorry, we could not load related books right now."))
      .finally(() => setLoading(false));
  }, [topic]);

  return (
    <section>
      <h3>Related Books</h3>
      {loading && <p>Loading books...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && books.length === 0 && <p>No related books found for this skill.</p>}
      <div className="books">
        {books.map((book) => (
          <div className="book" key={book.key}>
            {book.cover_i ? (
              <img src={coverUrl(book.cover_i)} alt={`Cover of ${book.title}`} />
            ) : (
              <div className="no-cover">No cover</div>
            )}
            <p><strong>{book.title}</strong></p>
            <p>{book.author_name ? book.author_name[0] : "Unknown author"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
