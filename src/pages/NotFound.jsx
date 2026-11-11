import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div>
      <h2>404 - Page Not Found</h2>
      <p>Sorry, that page does not exist.</p>
      <Link to="/">Go back home</Link>
    </div>
  );
}
