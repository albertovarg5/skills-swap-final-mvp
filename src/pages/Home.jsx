import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <section className="hero">
        <h2>Share Your Skills. Learn Something New.</h2>
        <p>Skills Swap is where college students teach each other. Know JavaScript? Speak Spanish? Offer help and learn from other students too.</p>
        <Link className="button" to="/skills">Browse Skills</Link>
      </section>
      <section>
        <h2>How it works</h2>
        <div className="grid">
          <div className="card"><h3>1. Browse</h3><p>Search skills other students are offering.</p></div>
          <div className="card"><h3>2. Save</h3><p>Save the ones you are interested in.</p></div>
          <div className="card"><h3>3. Share</h3><p>Add your own skill for others to find.</p></div>
        </div>
      </section>
    </div>
  );
}
