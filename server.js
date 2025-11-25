import express from "express";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

const root = path.resolve(process.cwd(), "dist");

// Serve static assets
app.use(express.static(root));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(root, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
