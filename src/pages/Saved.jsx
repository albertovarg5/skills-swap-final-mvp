import { useSkills } from "../context/SkillsContext";
import SkillList from "../components/SkillList";

export default function Saved() {
  const { skills, savedIds } = useSkills();
  const savedSkills = skills.filter((skill) => savedIds.includes(skill.id));

  return (
    <div>
      <h2>Saved Skills</h2>
      <SkillList skills={savedSkills} emptyMessage="You have not saved any skills yet." />
    </div>
  );
}
