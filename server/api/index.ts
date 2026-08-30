import "dotenv/config";
import { createApp } from "../src/app";

// Vercel serverless entry point. Vercel routes every request here (see
// ../vercel.json) while preserving the original req.url, so Express's own
// routing (e.g. /api/documents/:id) still matches exactly as it does when
// running as a normal long-lived server via src/index.ts locally.
export default createApp();
