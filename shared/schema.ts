import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Import Auth Tables (Required for Replit Auth)
export * from "./models/auth";
export * from "./models/chat";

// === VIDEO GENERATION TABLES ===

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"), // pending, generating_text, curating_visuals, editing, compliance_check, publishing, published, failed
  prompt: text("prompt"), // The generated text/sentence
  stockUrl: text("stock_url"), // URL of the stock video
  localVideoPath: text("local_video_path"), // Path to processed video
  metadata: jsonb("metadata"), // Store Pexels ID, source info, etc.
  error: text("error"), // Error message if failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // info, warn, error
  message: text("message").notNull(),
  agent: text("agent").notNull(), // text_agent, visual_agent, editing_agent, compliance_agent, publishing_agent, system
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === SCHEMAS ===

export const insertVideoSchema = createInsertSchema(videos).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertLogSchema = createInsertSchema(logs).omit({ 
  id: true, 
  timestamp: true 
});

// === EXPLICIT TYPES ===

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

// === API CONTRACT TYPES ===

export type CreateVideoRequest = {
  forcePrompt?: string; // Optional manual prompt override
};

export type VideoResponse = Video;
export type LogResponse = Log;

export type StatsResponse = {
  totalVideos: number;
  publishedVideos: number;
  failedVideos: number;
  pendingVideos: number;
  lastRun: string | null;
};

export const dailyVideoSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
