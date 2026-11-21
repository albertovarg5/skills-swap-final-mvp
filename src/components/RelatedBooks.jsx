import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchBooks, coverUrl } from "../services/bookService";
import StatusMessage from "./StatusMessage";

export default function RelatedBooks({ topic }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0); // the Retry button bumps this

  useEffect(() => {
    // "ignore" and the AbortController stop an old request from overwriting a newer one.
    let ignore = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchBooks(topic, controller.signal)
      .then((docs) => !ignore && setBooks(docs))
      .catch(() => {
        if (ignore) return;
        setBooks([]);
        setError("Sorry, we could not load related books right now.");
      })
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [topic, attempt]);

  return (
    <section>
      <h3>Related Books</h3>
      <StatusMessage loading={loading} error={error} onRetry={() => setAttempt((n) => n + 1)} loadingText="Loading books..." />
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

RelatedBooks.propTypes = { topic: PropTypes.string.isRequired };
