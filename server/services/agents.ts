import { storage } from "../storage";
import { openai } from "../replit_integrations/audio/client";
import { createVideoWithOverlay } from "./ffmpeg";
import fs from "fs";
import path from "path";
import https from "https";
import cron from "node-cron";
import { DateTime } from "luxon";

// --- Agent 1: Text Generation ---
export async function generateTextAgent(type: "efemeride" | "curiosidad" | "tema_del_dia"): Promise<{ title: string; script: string }> {
  await storage.createLog({
    level: "info",
    message: `Generating text for video type: ${type}...`,
    agent: "text_agent",
  });

  const prompts = {
    efemeride: "Escribe una efeméride musical del rock argentino para hoy. Debe ser un dato histórico real.",
    curiosidad: "Escribe un dato curioso o poco conocido sobre la historia del rock argentino.",
    tema_del_dia: "Elige una canción emblemática del rock argentino y explica brevemente por qué es importante hoy."
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Eres un experto en cultura de rock argentino para 'Desde el Pogo'.
Genera contenido para un video vertical de 15-25 segundos.
REGLAS CRÍTICAS:
1. No menciones marcas comerciales ni uses material protegido por copyright de forma que infrinja reglas (solo uso informativo/educativo).
2. Estilo: Gancho inicial impactante (hook), desarrollo conciso, sin marcas de tiempo ni etiquetas de escena.
3. El texto debe ser LIMPIO: solo la narrativa para ser leída.
4. Cierre obligatorio: "Seguinos para más historia del rock argentino - Desde el Pogo".
5. Formato de salida: JSON con campos 'title' (máximo 8 palabras) y 'script' (narrativa completa).
6. Idioma: Español neutro de Argentina (voseo si es natural).`
        },
        {
          role: "user",
          content: prompts[type]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = JSON.parse(response.choices[0].message.content || "{}");
    const title = content.title || "Rock Argentino";
    const script = content.script || "La historia del rock nos une.";
    
    console.log(`Video Type: ${type}`);
    console.log(`Generated Title: ${title}`);
    console.log(`Generated Script: ${script}`);

    await storage.createLog({
      level: "info",
      message: `Generated type: ${type} | Title: ${title}`,
      agent: "text_agent",
    });

    return { title, script };
  } catch (error: any) {
    await storage.createLog({
      level: "error",
      message: `Text generation failed for ${type}: ${error.message}`,
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
export async function editingAgent(videoId: number, stockUrl: string, title: string, script: string): Promise<string> {
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
    output_format: "mp4",
    width: 1080,
    height: 1920,
    frame_rate: 30,
    source: {
      width: 1080,
      height: 1920,
      elements: [
        {
          type: "video",
          source: stockUrl,
          duration: 15,
          fit: "cover",
        },
        {
          type: "text",
          text: title,
          font_family: "Inter",
          font_weight: "900",
          font_size: "80px",
          fill_color: "#ffffff",
          background_color: "#ff0000",
          padding: "20px 40px",
          x: "50%",
          y: "20%",
          x_alignment: "50%",
          y_alignment: "50%",
          width: "90%",
          text_transform: "uppercase",
        },
        {
          type: "text",
          text: script,
          font_family: "Inter",
          font_weight: "700",
          font_size: "48px",
          fill_color: "#ffffff",
          background_color: "rgba(0,0,0,0.7)",
          padding: "40px",
          x: "50%",
          y: "55%",
          x_alignment: "50%",
          y_alignment: "50%",
          width: "85%",
        },
        {
          type: "text",
          text: "Desde el Pogo",
          font_family: "Inter",
          font_weight: "500",
          font_size: "32px",
          fill_color: "#ffffff",
          x: "50%",
          y: "92%",
          x_alignment: "50%",
          y_alignment: "50%",
          shadow_color: "rgba(0,0,0,0.8)",
          shadow_blur: "10px",
        }
      ],
    }
  };

  console.log("Creatomate Request Payload:", JSON.stringify(requestBody, null, 2));

  const response = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json() as any;
  
  if (Array.isArray(data) && data.length > 0) {
    const render = data[0];
    console.log("Creatomate Response Details:", {
      id: render.id,
      status: render.status,
      url: render.url,
      format: render.output_format || "mp4"
    });
  } else {
    console.log("Creatomate Response Payload:", JSON.stringify(data, null, 2));
  }

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
export async function runGenerationPipeline(existingVideoId?: number, forcePrompt?: string, videoType: "efemeride" | "curiosidad" | "tema_del_dia" = "curiosidad") {
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

    let title = "Rock Argentino";
    let script = forcePrompt;
    
    if (!script) {
      const generated = await generateTextAgent(videoType);
      title = generated.title;
      script = generated.script;
      await storage.updateVideo(videoId, { prompt: script });
    }

    const isSafe = await complianceAgent(script);
    if (!isSafe) {
      await storage.updateVideo(videoId, { status: "compliance_failed", error: "Text violated compliance rules" });
      return;
    }

    await storage.updateVideo(videoId, { status: "curating_visuals" });
    const stockUrl = await curationAgent(videoId, script);
    await storage.updateVideo(videoId, { stockUrl });

    await storage.updateVideo(videoId, { status: "editing" });
    const renderId = await editingAgent(videoId, stockUrl, title, script);
    
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
  
  const types: { type: "efemeride" | "curiosidad" | "tema_del_dia"; headline: string; dbType: string }[] = [
    { type: "efemeride", headline: "Un día como hoy en el rock argentino 🎸", dbType: "ephemeris" },
    { type: "curiosidad", headline: "¿Sabías esto del rock nacional? 🤘", dbType: "trivia" },
    { type: "tema_del_dia", headline: "Tema del día 🔥", dbType: "daily_song" }
  ];

  let generated = 0;
  let failed = 0;

  for (const item of types) {
    try {
      console.log(`Starting generation for: ${item.dbType}`);
      // Use the existing pipeline but override the title with the required headline
      // We pass the type to generateTextAgent and then override the title in editingAgent
      
      let videoId: number = 0;
      const video = await storage.createVideo({
        status: "generating_text",
        prompt: null,
        metadata: { type: item.dbType }
      });
      videoId = video.id;

      const generatedContent = await generateTextAgent(item.type);
      await storage.updateVideo(videoId, { prompt: generatedContent.script });

      const isSafe = await complianceAgent(generatedContent.script);
      if (!isSafe) {
        throw new Error("Text violated compliance rules");
      }

      const stockUrl = await curationAgent(videoId, generatedContent.script);
      await storage.updateVideo(videoId, { stockUrl });

      const renderId = await editingAgent(videoId, stockUrl, item.headline, generatedContent.script);
      const finalVideoUrl = await pollRenderStatus(videoId, renderId);
      
      await storage.updateVideo(videoId, { 
        localVideoPath: finalVideoUrl, 
        status: "published"
      });

      generated++;
      console.log(`Successfully generated ${item.dbType}`);
    } catch (error: any) {
      console.error(`Failed to generate ${item.dbType}:`, error);
      failed++;
      // Continue to next one as per requirements
    }
  }
  
  console.log(`Daily generation finished. Generated: ${generated}, Failed: ${failed}`);
  return { success: true, generated, failed };
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
