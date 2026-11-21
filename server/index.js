// Local development server: npm run server
import { createApp } from "./app.js";
import { createDb } from "./db.js";

// The Vite dev server (5173) proxies /api here, so browser requests carry its origin.
process.env.ALLOWED_ORIGIN ??= "http://localhost:5173";

const app = createApp(await createDb());
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
