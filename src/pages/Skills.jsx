import { useState } from "react";
import { useSkills } from "../context/SkillsContext";
import { categories } from "../data/sampleSkills";
import SkillList from "../components/SkillList";

export default function Skills() {
  const { skills } = useSkills();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = skills.filter((skill) => {
    const text = `${skill.title} ${skill.description} ${skill.owner}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesCategory = category === "all" || skill.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <h2>Browse Skills</h2>
      <div className="filters">
        <label htmlFor="search">Search</label>
        <input id="search" type="text" placeholder="Search by keyword..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label htmlFor="category">Category</label>
        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <SkillList skills={filtered} emptyMessage="No skills match your search." />
    </div>
  );
}
