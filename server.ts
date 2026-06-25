import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Configure body-parser with high limits to allow media file uploads (base64)
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ limit: "60mb", extended: true }));

// Initialize GoogleGenAI server-side with telemetry headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint for Audio/Video transcription using Gemini Multimodal input
app.post("/api/transcribe", async (req, res) => {
  try {
    const { fileBase64, mimeType, language } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: "Arquivo ou tipo MIME ausente." });
    }

    // Prepare parts with inline data
    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: fileBase64,
      },
    };

    const promptText = `Você é um transcritor profissional e assistente especialista em áudio e vídeo.
Sua tarefa é transcrever de forma literal, precisa e completa todo o áudio inteligível contido no arquivo de mídia fornecido.

Por favor:
1. Transcreva as falas no idioma original predominante (o usuário indicou preferência por: ${language || "Detectar Automaticamente"}).
2. Organize o texto de forma estruturada com parágrafos legíveis e cabeçalhos apropriados.
3. Se houver falas claras, adicione marcas de tempo aproximadas no formato [MM:SS] ou [HH:MM:SS] no início de parágrafos relevantes ou mudanças de assunto.
4. Identifique as vozes dos interlocutores como "Orador 1", "Orador 2", etc., se houver múltiplos falantes distintos.
5. Retorne a resposta final inteiramente formatada com títulos elegantes usando Markdown (sem rodeios, sem introduções explicativas, vá direto para a transcrição formatada).
6. Se o arquivo não contiver falas ou áudio inteligível, informe de forma amigável em Markdown.`;

    const textPart = {
      text: promptText,
    };

    // Use gemini-3.5-flash for media understanding (highly efficient, huge context window)
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [audioPart, textPart] },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Transcription API error:", error);
    res.status(500).json({
      error: "Falha na transcrição de áudio: " + (error.message || "Erro interno do servidor"),
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
