// Local development entry point.
// All Express routes live in backend.js so this same logic can be
// reused by api/index.js when deployed to Vercel as a serverless
// function (which doesn't use app.listen()).

const app = require("./backend");

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hospital System running on http://localhost:${PORT}`);
});
