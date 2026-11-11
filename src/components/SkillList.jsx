import SkillCard from "./SkillCard";

export default function SkillList({ skills, emptyMessage }) {
  if (skills.length === 0) {
    return <p>{emptyMessage}</p>;
  }
  return (
    <div className="grid">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}
