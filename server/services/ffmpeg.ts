import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { storage } from "../storage";

// Ensure output directory exists
const OUTPUT_DIR = path.join(process.cwd(), "public", "generated");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function createVideoWithOverlay(
  videoPath: string,
  text: string,
  outputFilename: string
): Promise<string> {
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  
  // Font path - usually available in linux systems
  const fontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  // Fallback if system font not found, try to look for standard locations or just use "Sans"
  
  // FFmpeg command to draw text
  // We use drawtext filter. 
  // fontsize=50: size of text
  // fontcolor=white: color
  // x=(w-text_w)/2: center horizontally
  // y=(h-text_h)/2: center vertically
  // box=1: enable box
  // boxcolor=black@0.5: semi-transparent black background
  
  const ffmpegArgs = [
    "-i", videoPath,
    "-vf", `drawtext=text='${text.replace(/'/g, "'\\''")}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=10`,
    "-c:a", "copy", // Copy audio if exists
    "-y", // Overwrite output
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ffmpegArgs);
    
    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        // Return relative path for public access
        resolve(`/generated/${outputFilename}`);
      } else {
        console.error("FFmpeg error:", stderr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}
