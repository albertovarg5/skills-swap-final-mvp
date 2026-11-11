import { Link } from "react-router-dom";
import { useSkills } from "../context/SkillsContext";

export default function SkillCard({ skill }) {
  const { savedIds, toggleSave } = useSkills();
  const isSaved = savedIds.includes(skill.id);

  return (
    <article className="card">
      <span className="tag">{skill.category}</span>
      <h3>{skill.title}</h3>
      <p>Offered by {skill.owner} · {skill.price === 0 ? "Free" : `$${skill.price}`}</p>
      <div className="card-buttons">
        <Link className="button" to={`/skills/${skill.id}`}>View Details</Link>
        <button className="button secondary" onClick={() => toggleSave(skill.id)}>
          {isSaved ? "Unsave" : "Save"}
        </button>
      </div>
    </article>
  );
}
