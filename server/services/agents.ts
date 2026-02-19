import { storage } from "../storage";
import { openai } from "../replit_integrations/audio/client";
import { createVideoWithOverlay } from "./ffmpeg";
import fs from "fs";
import path from "path";
import https from "https";
import cron from "node-cron";
import { DateTime } from "luxon";

// --- Agent 1: Text Generation ---
export async function generateTextAgent(): Promise<string> {
  await storage.createLog({
    level: "info",
    message: "Generating text...",
    agent: "text_agent",
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are a text generation agent for 'Desde el Pogo'. Write a short, intense, and realistic sentence about the experience of attending a live concert. Do not mention artists, bands, music genres, or songs. Maximum 12 words. Tone: raw, human, universal. Language: Spanish (neutral Argentine). Output ONLY the sentence."
        }
      ],
      temperature: 0.7,
    });

    const text = response.choices[0].message.content?.trim() || "La energía del pogo nos une a todos.";
    
    console.log("Script generated");
    await storage.createLog({
      level: "info",
      message: `Generated text: "${text}"`,
      agent: "text_agent",
    });

    return text;
  } catch (error: any) {
    await storage.createLog({
      level: "error",
      message: `Text generation failed: ${error.message}`,
      agent: "text_agent",
    });
    throw error;
  }
}

// --- Agent 2: Visual Curation ---
export async function curationAgent(videoId: number, prompt: string): Promise<string> {
  await storage.createLog({
    level: "info",
    message: "Searching for stock video...",
    agent: "visual_agent",
  });

  const stockVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"; 

  await storage.createLog({
    level: "info",
    message: `Selected stock video: ${stockVideoUrl}`,
    agent: "visual_agent",
  });

  return stockVideoUrl;
}

// --- Agent 3: Video Editing ---
export async function editingAgent(videoId: number, stockUrl: string, text: string): Promise<string> {
  await storage.createLog({
    level: "info",
    message: "Requesting Creatomate render...",
    agent: "editing_agent",
  });

  const apiKey = process.env.CREATOMATE_API_KEY;
  if (!apiKey) {
    throw new Error("CREATOMATE_API_KEY is missing");
  }

  const requestBody = {
    source: {
      width: 720,
      height: 1280,
      elements: [
        {
          type: "video",
          source: stockUrl,
          duration: 15,
        },
        {
          type: "text",
          text: text,
          font_family: "Inter",
          font_weight: "700",
          font_size: "48px",
          fill_color: "#ffffff",
          background_color: "rgba(0,0,0,0.5)",
          padding: "20px",
          x: "50%",
          y: "50%",
          x_alignment: "50%",
          y_alignment: "50%",
          width: "80%",
        },
        {
          type: "text",
          text: "Desde el Pogo",
          font_family: "Inter",
          font_weight: "400",
          font_size: "24px",
          fill_color: "#ffffff",
          x: "50%",
          y: "90%",
          x_alignment: "50%",
          y_alignment: "50%",
        }
      ],
    }
  };

  console.log("Creatomate Request:", JSON.stringify(requestBody, null, 2));

  const response = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json() as any;
  console.log("Creatomate Response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Creatomate API error: ${data.message || response.statusText}`);
  }

  const renderId = data[0].id;
  console.log(`Render requested: ${renderId}`);
  
  await storage.updateVideo(videoId, { renderId, status: "processing" });

  return renderId;
}

async function pollRenderStatus(videoId: number, renderId: string): Promise<string> {
  const apiKey = process.env.CREATOMATE_API_KEY;
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes

  while (attempts < maxAttempts) {
    const response = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const data = await response.json() as any;
    
    if (data.status === "completed" || data.status === "succeeded") {
      console.log(`Render completed: ${data.url}`);
      await storage.updateVideo(videoId, { status: "completed" });
      return data.url;
    } else if (data.status === "failed") {
      console.log("Render failed");
      throw new Error("Creatomate render failed");
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error("Render polling timed out");
}

// --- Agent 4: Compliance ---
export async function complianceAgent(text: string): Promise<boolean> {
  await storage.createLog({
    level: "info",
    message: "Running compliance checks...",
    agent: "compliance_agent",
  });

  const forbidden = ["Beatles", "Metallica", "Taylor Swift", "Rock", "Pop", "Jazz"];
  const hasForbidden = forbidden.some(word => text.includes(word));

  if (hasForbidden) {
    await storage.createLog({
      level: "warn",
      message: "Compliance check failed: Forbidden keywords detected.",
      agent: "compliance_agent",
    });
    return false;
  }

  await storage.createLog({
    level: "info",
    message: "Compliance check passed.",
    agent: "compliance_agent",
  });
  return true;
}

// --- Orchestrator ---
export async function runGenerationPipeline(existingVideoId?: number, forcePrompt?: string) {
  let videoId: number = existingVideoId || 0;

  try {
    if (!videoId) {
      const video = await storage.createVideo({
        status: "generating_text",
        prompt: forcePrompt || null,
      });
      videoId = video.id;
    } else {
      await storage.updateVideo(videoId, { status: "generating_text" });
    }

    let text = forcePrompt;
    if (!text) {
      text = await generateTextAgent();
      await storage.updateVideo(videoId, { prompt: text });
    }

    const isSafe = await complianceAgent(text);
    if (!isSafe) {
      await storage.updateVideo(videoId, { status: "compliance_failed", error: "Text violated compliance rules" });
      return;
    }

    await storage.updateVideo(videoId, { status: "curating_visuals" });
    const stockUrl = await curationAgent(videoId, text);
    await storage.updateVideo(videoId, { stockUrl });

    await storage.updateVideo(videoId, { status: "editing" });
    const renderId = await editingAgent(videoId, stockUrl, text);
    
    const finalVideoUrl = await pollRenderStatus(videoId, renderId);
    await storage.updateVideo(videoId, { localVideoPath: finalVideoUrl, status: "published" });

    await storage.createLog({
      level: "info",
      message: `Video ${videoId} published successfully.`,
      agent: "publishing_agent",
    });

  } catch (error: any) {
    console.error("Pipeline failed:", error);
    if (videoId) {
      await storage.updateVideo(videoId, { 
        status: "failed", 
        error: error.message 
      });
    }
  }
}

export async function runDailyGeneration() {
  const now = DateTime.now().setZone("America/Argentina/Buenos_Aires");
  console.log(`Daily generation started at ${now.toString()}`);
  
  const todayVideos = await (storage as any).getVideosCreatedToday();
  if (todayVideos.length >= 3) {
    console.log("Daily videos already generated for today.");
    return;
  }

  const countToGenerate = 3 - todayVideos.length;
  for (let i = 0; i < countToGenerate; i++) {
    await runGenerationPipeline();
  }
  
  console.log("Daily generation finished");
}

export function initCron() {
  // Run daily at 9:00 AM Argentina time
  cron.schedule("0 9 * * *", () => {
    runDailyGeneration();
  }, {
    timezone: "America/Argentina/Buenos_Aires"
  });
  console.log("Cron initialized for America/Argentina/Buenos_Aires (9:00 AM daily)");
}
