import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

const SkillsContext = createContext();

export function SkillsProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [attempt, setAttempt] = useState(0); // bump to reload after a failure
  const userId = user?.id ?? null;

  // Skills are public; saved skills belong to the logged-in user. Wait until we know who is logged in,
  // and reload when the user changes so "mine" and "saved" are correct.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([api("/skills"), userId === null ? [] : api("/saved")])
      .then(([skillList, ids]) => {
        if (cancelled) return;
        setSkills(skillList);
        setSavedIds(ids);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [userId, authLoading, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const clearActionError = useCallback(() => setActionError(""), []);

  // Throws on failure so the form can show the message.
  async function addSkill(skill) {
    const created = await api("/skills", { method: "POST", body: skill });
    setSkills((prev) => [created, ...prev]);
  }

  async function toggleSave(id) {
    if (userId === null) {
      navigate("/login", { state: { message: "Please log in to save skills." } });
      return;
    }
    const wasSaved = savedIds.includes(id);
    const add = (prev) => (prev.includes(id) ? prev : [...prev, id]);
    const remove = (prev) => prev.filter((savedId) => savedId !== id);
    setSavedIds(wasSaved ? remove : add); // update the screen right away
    try {
      await api(`/saved/${id}`, { method: wasSaved ? "DELETE" : "PUT" });
    } catch (e) {
      setSavedIds(wasSaved ? add : remove); // undo if the server said no
      setActionError(e.message);
    }
  }

  const value = { skills, savedIds, loading: loading || authLoading, error, actionError, addSkill, toggleSave, reload, clearActionError };
  return <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>;
}

SkillsProvider.propTypes = { children: PropTypes.node.isRequired };

export function useSkills() {
  return useContext(SkillsContext);
}
