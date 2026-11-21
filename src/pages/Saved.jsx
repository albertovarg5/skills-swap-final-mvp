import { useSkills } from "../context/SkillsContext";
import SkillList from "../components/SkillList";
import StatusMessage from "../components/StatusMessage";

export default function Saved() {
  const { skills, savedIds, loading, error, reload } = useSkills();
  const savedSkills = skills.filter((skill) => savedIds.includes(skill.id));

  return (
    <div>
      <h2>Saved Skills</h2>
      <StatusMessage loading={loading} error={error} onRetry={reload} loadingText="Loading skills..." />
      {!loading && !error && <SkillList skills={savedSkills} emptyMessage="You have not saved any skills yet." />}
    </div>
  );
}
