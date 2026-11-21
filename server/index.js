// Local development server: npm run server
import { createApp } from "./app.js";
import { createDb } from "./db.js";

const app = createApp(await createDb());
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
