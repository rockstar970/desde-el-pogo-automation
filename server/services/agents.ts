import { storage } from "../storage";
import { openai } from "../replit_integrations/audio/client"; // Use configured client
import { createVideoWithOverlay } from "./ffmpeg";
import fs from "fs";
import path from "path";
import https from "https";

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

  // MOCK: Since we don't have Pexels API key in this env yet, we use a placeholder or simulate download
  // In a real scenario, we would fetch Pexels/Pixabay here.
  
  // Simulating a download for the prototype
  // We'll verify if we have a sample video, otherwise we might fail or use a color solid
  
  // For this prototype, let's assume we have a sample.mp4 in attached_assets or we create a dummy one?
  // Actually, FFmpeg can generate test patterns!
  
  const mockVideoUrl = "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3"; // Just audio for now? No needs video.
  // Use a public domain video placeholder
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
  
  await storage.updateVideo(videoId, { renderId });

  return renderId;
}

async function pollRenderStatus(videoId: number, renderId: string): Promise<string> {
  const apiKey = process.env.CREATOMATE_API_KEY;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes

  while (attempts < maxAttempts) {
    const response = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const data = await response.json() as any;
    
    if (data.status === "succeeded") {
      console.log(`Render completed: ${data.url}`);
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

  // Check for forbidden keywords (simplified)
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

// --- Agent 5: Publishing ---
export async function publishingAgent(videoId: number, videoPath: string, text: string): Promise<void> {
  await storage.createLog({
    level: "info",
    message: "Publishing video...",
    agent: "publishing_agent",
  });

  // Mock publishing
  await new Promise(resolve => setTimeout(resolve, 1000));

  await storage.createLog({
    level: "info",
    message: `Video ${videoId} published successfully to YouTube Shorts (Mock).`,
    agent: "publishing_agent",
  });
}

// --- Orchestrator ---
export async function runGenerationPipeline(existingVideoId?: number, forcePrompt?: string) {
  let videoId: number = existingVideoId || 0;

  try {
    // 1. Create Video Record if not provided
    if (!videoId) {
      const video = await storage.createVideo({
        status: "generating_text",
        prompt: forcePrompt || null,
      });
      videoId = video.id;
    } else {
      await storage.updateVideo(videoId, { status: "generating_text" });
    }

    // 2. Text Generation
    let text = forcePrompt;
    if (!text) {
      text = await generateTextAgent();
      await storage.updateVideo(videoId, { prompt: text });
    }

    // 3. Compliance Check (Text)
    const isSafe = await complianceAgent(text);
    if (!isSafe) {
      await storage.updateVideo(videoId, { status: "compliance_failed", error: "Text violated compliance rules" });
      return;
    }

    // 4. Visual Curation
    await storage.updateVideo(videoId, { status: "curating_visuals" });
    const stockUrl = await curationAgent(videoId, text);
    await storage.updateVideo(videoId, { stockUrl });

    // 5. Editing
    await storage.updateVideo(videoId, { status: "editing" });
    const renderId = await editingAgent(videoId, stockUrl, text);
    
    // 6. Polling for completion
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

// Helper to download file
async function downloadFile(url: string, dest: string): Promise<void> {
  const file = fs.createWriteStream(dest);
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}
