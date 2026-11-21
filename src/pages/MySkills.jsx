import { useState } from "react";
import { useSkills } from "../context/SkillsContext";
import { categories } from "../data/sampleSkills";
import SkillList from "../components/SkillList";
import StatusMessage from "../components/StatusMessage";
import { validateSkill } from "../validation";

export default function MySkills() {
  const { skills, addSkill, loading, error: loadError, reload } = useSkills();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mySkills = skills.filter((skill) => skill.mine);

  async function handleSubmit(e) {
    e.preventDefault();
    const skill = { title: title.trim(), category, price: Number(price), description: description.trim() };
    const problem = validateSkill(skill);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await addSkill(skill);
      setTitle("");
      setDescription("");
      setPrice("0");
      setError("");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div>
      <h2>My Skills</h2>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <h3>Add a Skill</h3>
        <label htmlFor="title">Title</label>
        <input id="title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="form-category">Category</label>
        <select id="form-category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label htmlFor="price">Price ($, 0 for free)</label>
        <input id="price" type="number" min="0" max="1000" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
        <label htmlFor="description">Description</label>
        <textarea id="description" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={busy}>Add Skill</button>
      </form>
      <h3>Skills You Offer</h3>
      <StatusMessage loading={loading} error={loadError} onRetry={reload} loadingText="Loading skills..." />
      {!loading && !loadError && <SkillList skills={mySkills} emptyMessage="You have not added any skills yet." />}
    </div>
  );
}
