import PropTypes from "prop-types";

// Shows "Loading..." or an error with a Retry button. Renders nothing when all is well.
export default function StatusMessage({ loading, error, onRetry, loadingText = "Loading..." }) {
  if (loading) return <p role="status">{loadingText}</p>;
  if (error) {
    return (
      <div role="alert">
        <p className="error">{error}</p>
        <button className="button" type="button" onClick={onRetry}>Retry</button>
      </div>
    );
  }
  return null;
}

StatusMessage.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  loadingText: PropTypes.string,
};
