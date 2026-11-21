import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { validateRegistration } from "../validation";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/skills" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validateRegistration({ name, email, password });
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      await register({ name, email, password });
      navigate("/skills", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>Create an account</h2>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">Name</label>
        <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="new-password" aria-describedby="password-help" value={password} onChange={(e) => setPassword(e.target.value)} />
        <small id="password-help">At least 8 characters, with a letter and a number.</small>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? "Creating account..." : "Register"}</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
