import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

import grantsRouter from "./routes/grants";
import organizationsRouter from "./routes/organizations";
import savedGrantsRouter from "./routes/savedGrants";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { checkAndSendDeadlineReminders } from "./services/notificationService";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// Rate limiting for external-facing routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api", apiLimiter);

// Routes
app.use("/api/grants", grantsRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/saved", savedGrantsRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Cron: check deadline reminders daily at 8am
cron.schedule("0 8 * * *", async () => {
  console.log("[cron] Running deadline reminder check...");
  try {
    await checkAndSendDeadlineReminders();
  } catch (err) {
    console.error("[cron] Reminder check failed:", err);
  }
});

app.listen(PORT, () => {
  console.log(`GrantRadar API running on http://localhost:${PORT}`);
});
