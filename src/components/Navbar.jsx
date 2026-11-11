import { NavLink } from "react-router-dom";
import { useSkills } from "../context/SkillsContext";

export default function Navbar() {
  const { savedIds } = useSkills();
  return (
    <header className="header">
      <h1 className="logo">Skills Swap</h1>
      <nav>
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/skills">Browse</NavLink>
        <NavLink to="/saved">Saved ({savedIds.length})</NavLink>
        <NavLink to="/my-skills">My Skills</NavLink>
      </nav>
    </header>
  );
}
