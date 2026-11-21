import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSkills } from "../context/SkillsContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { savedIds } = useSkills();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false); // mobile menu
  const close = () => setOpen(false);
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="header">
      <h1 className="logo">Skills Swap</h1>
      <button className="menu-button" type="button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Menu"}
      </button>
      <nav id="main-nav" aria-label="Main" className={open ? "open" : ""} onClick={close}>
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/skills">Browse</NavLink>
        <NavLink to="/saved">Saved ({savedIds.length})</NavLink>
        <NavLink to="/my-skills">My Skills</NavLink>
        {user ? (
          <>
            <span className="user-name">Hi, {user.name}</span>
            <button className="logout-button" type="button" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
