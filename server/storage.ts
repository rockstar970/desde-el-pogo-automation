import { db } from "./db";
import { videos, logs, type Video, type InsertVideo, type Log, type InsertLog } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { users, type User, type UpsertUser } from "@shared/models/auth";

// Import Auth Storage Interface
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export interface IStorage extends IAuthStorage {
  // Videos
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video>;
  
  // Logs
  getLogs(limit?: number): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  
  // Stats
  getStats(): Promise<{
    totalVideos: number;
    publishedVideos: number;
    failedVideos: number;
    pendingVideos: number;
    lastRun: Date | null;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Auth Methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Video Methods
  async getVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(insertVideo).returning();
    return video;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  // Log Methods
  async getLogs(limit: number = 50): Promise<Log[]> {
    return await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(limit);
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const [log] = await db.insert(logs).values(insertLog).returning();
    return log;
  }

  // Stats
  async getStats() {
    const allVideos = await this.getVideos();
    const totalVideos = allVideos.length;
    const publishedVideos = allVideos.filter(v => v.status === 'published').length;
    const failedVideos = allVideos.filter(v => v.status === 'failed' || v.status === 'compliance_failed').length;
    const pendingVideos = allVideos.filter(v => v.status !== 'published' && v.status !== 'failed' && v.status !== 'compliance_failed').length;
    
    // Find last run (most recent creation)
    const lastRun = allVideos.length > 0 ? allVideos[0].createdAt : null;

    return {
      totalVideos,
      publishedVideos,
      failedVideos,
      pendingVideos,
      lastRun
    };
  }
}

export const storage = new DatabaseStorage();
// Export authStorage alias for integration compatibility
export const authStorage = storage;
