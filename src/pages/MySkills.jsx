import { useState } from "react";
import { useSkills } from "../context/SkillsContext";
import { categories } from "../data/sampleSkills";
import SkillList from "../components/SkillList";

export default function MySkills() {
  const { skills, addSkill } = useSkills();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const mySkills = skills.filter((skill) => skill.mine);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please enter a title and a description.");
      return;
    }
    addSkill({ title: title.trim(), category, price: Number(price), description: description.trim(), topic: title.trim() });
    setTitle("");
    setDescription("");
    setPrice("0");
    setError("");
  }

  return (
    <div>
      <h2>My Skills</h2>
      <form className="form" onSubmit={handleSubmit}>
        <h3>Add a Skill</h3>
        <label htmlFor="title">Title</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="form-category">Category</label>
        <select id="form-category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label htmlFor="price">Price ($, 0 for free)</label>
        <input id="price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        <label htmlFor="description">Description</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button className="button" type="submit">Add Skill</button>
      </form>
      <h3>Skills You Offer</h3>
      <SkillList skills={mySkills} emptyMessage="You have not added any skills yet." />
    </div>
  );
}
