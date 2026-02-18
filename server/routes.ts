import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { runGenerationPipeline } from "./services/agents";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  if (process.env.NODE_ENV === "production") {
    console.log("Production server running successfully");
    console.log("Server running - auth temporarily disabled");
  }

  // Setup Replit Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // === API ROUTES ===

  // Videos List
  app.get(api.videos.list.path, async (req, res) => {
    const videos = await storage.getVideos();
    res.json(videos);
  });

  // Get Video
  app.get(api.videos.get.path, async (req, res) => {
    const video = await storage.getVideo(Number(req.params.id));
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json(video);
  });

  // Daily Generation
  app.post("/api/video/daily", async (req, res) => {
    try {
      runGenerationPipeline().catch(err => {
        console.error("Daily pipeline failed:", err);
      });
      res.json({ success: true, message: "Daily generation started" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to start daily generation" });
    }
  });

  // Trigger Generation (Create Video)
  app.post(api.videos.create.path, async (req, res) => {
    try {
      const input = api.videos.create.input.parse(req.body);
      
      // Create the record immediately
      const video = await storage.createVideo({
        status: "pending",
        prompt: input.forcePrompt,
      });

      // Start the pipeline asynchronously with the created video ID
      runGenerationPipeline(video.id, input.forcePrompt).catch(err => {
        console.error("Pipeline crashed:", err);
        storage.updateVideo(video.id, { status: "failed", error: err.message });
      });
      
      res.status(201).json(video);

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Logs List
  app.get(api.logs.list.path, async (req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });

  // Stats
  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json({
      ...stats,
      lastRun: stats.lastRun ? stats.lastRun.toISOString() : null
    });
  });

  // Seed Data (if empty)
  const existingVideos = await storage.getVideos();
  if (existingVideos.length === 0) {
    // Optionally seed some logs
    await storage.createLog({
      level: "info",
      message: "System initialized",
      agent: "system",
    });
  }

  return httpServer;
}
