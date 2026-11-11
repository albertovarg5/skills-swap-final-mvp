import { Link, useParams } from "react-router-dom";
import { useSkills } from "../context/SkillsContext";
import RelatedBooks from "../components/RelatedBooks";

export default function SkillDetails() {
  const { id } = useParams();
  const { skills, savedIds, toggleSave } = useSkills();
  const skill = skills.find((s) => s.id === Number(id));

  if (!skill) {
    return (
      <div>
        <h2>Skill not found</h2>
        <Link to="/skills">Back to skills</Link>
      </div>
    );
  }

  const isSaved = savedIds.includes(skill.id);

  return (
    <div>
      <Link to="/skills">← Back to skills</Link>
      <h2>{skill.title}</h2>
      <p><span className="tag">{skill.category}</span></p>
      <p>Offered by {skill.owner} · {skill.price === 0 ? "Free" : `$${skill.price}`}</p>
      <p>{skill.description}</p>
      <button className="button" onClick={() => toggleSave(skill.id)}>
        {isSaved ? "Unsave" : "Save"}
      </button>
      <RelatedBooks topic={skill.topic || skill.title} />
    </div>
  );
}
