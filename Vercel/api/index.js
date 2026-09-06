// Vercel serverless entry point.
// Vercel calls this exported Express app directly as a request
// handler for every request under /api/*. No app.listen() needed
// here — Vercel manages the HTTP server itself.

const app = require("../backend");

module.exports = app;
