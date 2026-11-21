import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Skills from "./pages/Skills";
import SkillDetails from "./pages/SkillDetails";
import Saved from "./pages/Saved";
import MySkills from "./pages/MySkills";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";
import { useSkills } from "./context/SkillsContext";

export default function App() {
  const { flash, clearFlash } = useAuth();
  const { actionError, clearActionError } = useSkills();
  const banner = flash ?? (actionError ? { type: "error", text: actionError } : null);

  return (
    <>
      <Navbar />
      <main>
        {banner && (
          <div className={`banner ${banner.type}`} role={banner.type === "error" ? "alert" : "status"}>
            <span>{banner.text}</span>
            <button className="link-button" type="button" onClick={() => { clearFlash(); clearActionError(); }}>Close</button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/skills/:id" element={<SkillDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
          <Route path="/my-skills" element={<ProtectedRoute><MySkills /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">© 2026 Skills Swap</footer>
    </>
  );
}
