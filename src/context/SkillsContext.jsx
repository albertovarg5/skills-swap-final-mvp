import { createContext, useContext, useState, useEffect } from "react";
import { sampleSkills } from "../data/sampleSkills";

const SkillsContext = createContext();

// Reads from localStorage so skills and saved items survive a refresh.
function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function SkillsProvider({ children }) {
  const [skills, setSkills] = useState(() => load("skills", sampleSkills));
  const [savedIds, setSavedIds] = useState(() => load("savedIds", []));

  useEffect(() => {
    localStorage.setItem("skills", JSON.stringify(skills));
    localStorage.setItem("savedIds", JSON.stringify(savedIds));
  }, [skills, savedIds]);

  function addSkill(skill) {
    const newSkill = { ...skill, id: Date.now(), owner: "You", mine: true };
    setSkills([newSkill, ...skills]);
  }

  function toggleSave(id) {
    if (savedIds.includes(id)) {
      setSavedIds(savedIds.filter((savedId) => savedId !== id));
    } else {
      setSavedIds([...savedIds, id]);
    }
  }

  const value = { skills, savedIds, addSkill, toggleSave };
  return <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>;
}

export function useSkills() {
  return useContext(SkillsContext);
}
