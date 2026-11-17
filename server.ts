import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function downloadGDriveFile(fileId: string, destPath: string): Promise<void> {
  const url = `https://docs.google.com/uc?export=download&id=${fileId}`;
  console.log(`Starting video download from Google Drive ID: ${fileId}...`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const match =
        html.match(/confirm=([0-9a-zA-Z_-]+)/) ||
        html.match(/confirm=([a-zA-Z0-9_]+)/) ||
        html.match(/id="confirm_text"[^>]*href="[^"]*confirm=([^"&]*)/);

      if (match && match[1]) {
        const confirmToken = match[1];
        console.log(`Found confirmation token: ${confirmToken}. Downloading with token...`);

        const setCookie = response.headers.get("set-cookie");
        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        };
        if (setCookie) {
          headers["Cookie"] = setCookie.split(";")[0];
        }

        const confirmUrl = `https://docs.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
        const res2 = await fetch(confirmUrl, { headers });

        if (!res2.ok) {
          throw new Error(`Failed to download with confirm token: ${res2.statusText}`);
        }

        const fileStream = fs.createWriteStream(destPath);
        const body = res2.body;
        if (!body) throw new Error("Response body is null");

        // @ts-ignore
        const nodeReadable = await import("stream").then((s) => s.Readable.from(body as any));
        const finished = await import("stream/promises").then((p) => p.finished);

        nodeReadable.pipe(fileStream);
        await finished(fileStream);
        console.log("Video downloaded successfully.");
      } else {
        console.log("Google Drive HTML returned but confirm token not found. Attempting direct streaming...");
        // If we can't find confirm, maybe the video is small or doesn't request it. Let's write the response text as fallback
        throw new Error("Could not find confirmation token in Google Drive large file warning page.");
      }
    } else {
      // Normal direct download (e.g. small file)
      console.log("Direct download stream starting (no confirmation warning)...");
      const fileStream = fs.createWriteStream(destPath);
      const body = response.body;
      if (!body) throw new Error("Response body is null");

      // @ts-ignore
      const nodeReadable = await import("stream").then((s) => s.Readable.from(body as any));
      const finished = await import("stream/promises").then((p) => p.finished);

      nodeReadable.pipe(fileStream);
      await finished(fileStream);
      console.log("Video downloaded directly.");
    }
  } catch (error) {
    console.error("Error during downloadGDriveFile:", error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Download Google Drive Video statically if not already downloaded
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const destPath = path.join(publicDir, "video.mp4");
  const fileId = "15VNVhsNhWIaxoT8LL6aR0DJGBs1g0kEl";

  const destPath2 = path.join(publicDir, "video2.mp4");
  const fileId2 = "14okF2pbb9Dj5KCEvxbAjvHTfT4fJvy5D";

  const stickerPath = path.join(publicDir, "sticker1.png");
  const stickerFileId = "1xMUKwt-IVTXb1sBgqVsszDKUMJTkbJ20";

  const sticker2Path = path.join(publicDir, "sticker2.png");
  const sticker2FileId = "1l5tI2cIyCYelcMX56KvaTmxxJfKyvi3I";

  const sticker3Path = path.join(publicDir, "sticker3.png");
  const sticker3FileId = "16WNT8C3yEgemgX56sHVO4ERX1u3N_6-k";

  const sticker4Path = path.join(publicDir, "sticker4.png");
  const sticker4FileId = "1eXm_uATBYLCmNEWA4rZlbww1iteeBAB2";

  // New trail stickers
  const trailSticker1Path = path.join(publicDir, "trail_sticker1.png");
  const trailSticker1FileId = "1AGIcO0tQk7RR1G0PBsRn8XZP1yYcC_Gh";

  const trailSticker2Path = path.join(publicDir, "trail_sticker2.png");
  const trailSticker2FileId = "19TsIw5-o2-uluALi78yJ0ZyXkxINPfuc";

  const trailSticker3Path = path.join(publicDir, "trail_sticker3.png");
  const trailSticker3FileId = "1YhqAC2_8p8SgLcGkV_2bmPpAVxaxeU8N";

  const trailSticker4Path = path.join(publicDir, "trail_sticker4.png");
  const trailSticker4FileId = "1u9RrYxpYqiJZirD1CVXtl6_UHi936iLm";

  const trailSticker5Path = path.join(publicDir, "trail_sticker5.png");
  const trailSticker5FileId = "1yJ7wOvMbPpcTvo2x4a-BZKQRdOFKOL4_";

  let downloadSucceeded = false;
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024 * 1024) {
    console.log("Video file already exists locally. Skipping Google Drive download.");
    downloadSucceeded = true;
  } else {
    try {
      await downloadGDriveFile(fileId, destPath);
      downloadSucceeded = true;
    } catch (err) {
      console.error("Could not pre-download video to local filesystem:", err);
    }
  }

  // Pre-download video2.mp4
  if (fs.existsSync(destPath2) && fs.statSync(destPath2).size > 1024 * 1024) {
    console.log("Video 2 file already exists locally. Skipping Google Drive download.");
  } else {
    try {
      await downloadGDriveFile(fileId2, destPath2);
    } catch (err) {
      console.error("Could not pre-download video 2 to local filesystem:", err);
    }
  }

  // Pre-download the sticker image
  if (fs.existsSync(stickerPath) && fs.statSync(stickerPath).size > 100) {
    console.log("Sticker file already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(stickerFileId, stickerPath);
      console.log("Sticker pre-download successfully completed.");
    } catch (err) {
      console.error("Could not pre-download sticker to local filesystem:", err);
    }
  }

  // Pre-download the second sticker image
  if (fs.existsSync(sticker2Path) && fs.statSync(sticker2Path).size > 100) {
    console.log("Sticker 2 file already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(sticker2FileId, sticker2Path);
      console.log("Sticker 2 pre-download successfully completed.");
    } catch (err) {
      console.error("Could not pre-download sticker 2 to local filesystem:", err);
    }
  }

  // Pre-download sticker 3
  if (fs.existsSync(sticker3Path) && fs.statSync(sticker3Path).size > 100) {
    console.log("Sticker 3 file already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(sticker3FileId, sticker3Path);
      console.log("Sticker 3 pre-download successfully completed.");
    } catch (err) {
      console.error("Could not pre-download sticker 3 to local filesystem:", err);
    }
  }

  // Pre-download sticker 4
  if (fs.existsSync(sticker4Path) && fs.statSync(sticker4Path).size > 100) {
    console.log("Sticker 4 file already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(sticker4FileId, sticker4Path);
      console.log("Sticker 4 pre-download successfully completed.");
    } catch (err) {
      console.error("Could not pre-download sticker 4 to local filesystem:", err);
    }
  }

  // Pre-download Trail Sticker 1
  if (fs.existsSync(trailSticker1Path) && fs.statSync(trailSticker1Path).size > 100) {
    console.log("Trail Sticker 1 already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(trailSticker1FileId, trailSticker1Path);
      console.log("Trail Sticker 1 downloaded.");
    } catch (err) {
      console.error("Error downloading Trail Sticker 1:", err);
    }
  }

  // Pre-download Trail Sticker 2
  if (fs.existsSync(trailSticker2Path) && fs.statSync(trailSticker2Path).size > 100) {
    console.log("Trail Sticker 2 already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(trailSticker2FileId, trailSticker2Path);
      console.log("Trail Sticker 2 downloaded.");
    } catch (err) {
      console.error("Error downloading Trail Sticker 2:", err);
    }
  }

  // Pre-download Trail Sticker 3
  if (fs.existsSync(trailSticker3Path) && fs.statSync(trailSticker3Path).size > 100) {
    console.log("Trail Sticker 3 already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(trailSticker3FileId, trailSticker3Path);
      console.log("Trail Sticker 3 downloaded.");
    } catch (err) {
      console.error("Error downloading Trail Sticker 3:", err);
    }
  }

  // Pre-download Trail Sticker 4
  if (fs.existsSync(trailSticker4Path) && fs.statSync(trailSticker4Path).size > 100) {
    console.log("Trail Sticker 4 already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(trailSticker4FileId, trailSticker4Path);
      console.log("Trail Sticker 4 downloaded.");
    } catch (err) {
      console.error("Error downloading Trail Sticker 4:", err);
    }
  }

  // Pre-download Trail Sticker 5
  if (fs.existsSync(trailSticker5Path) && fs.statSync(trailSticker5Path).size > 100) {
    console.log("Trail Sticker 5 already exists locally. Skipping download.");
  } else {
    try {
      await downloadGDriveFile(trailSticker5FileId, trailSticker5Path);
      console.log("Trail Sticker 5 downloaded.");
    } catch (err) {
      console.error("Error downloading Trail Sticker 5:", err);
    }
  }

  // 2. Add video proxy endpoint as fallback/dynamic backup if needed
  app.get("/api/video-status", (req, res) => {
    const exists = fs.existsSync(destPath);
    const size = exists ? fs.statSync(destPath).size : 0;
    res.json({
      downloaded: exists && size > 1024 * 1024,
      size,
    });
  });

  // 3. Vite or static files middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== "production") {
      console.log("Development mode: Vite middleware attached.");
    }
  });
}

startServer();
