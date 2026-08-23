import { GoogleGenAI, type LiveServerMessage, Modality } from '@google/genai';
import express from 'express';
import multer from 'multer';
import type { WebSocketServer } from 'ws';

const geminiRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' },
  },
});

geminiRouter.post('/chat', async (req, res) => {
  try {
    const { messages, useSearch, useMaps, highThinking, lowLatency } = req.body;
    let model = 'gemini-3.5-flash';
    if (highThinking) model = 'gemini-3.1-pro-preview';
    else if (lowLatency) model = 'gemini-3.1-flash-lite';

    // We only use standard contents array for stateless call since we need tools
    // Reconstruct history
    const contents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const tools: any[] = [];
    if (useSearch && model !== 'gemini-3.1-flash-lite') tools.push({ googleSearch: {} });
    if (useMaps && model !== 'gemini-3.1-flash-lite') tools.push({ googleMaps: {} });

    const config: any = {};
    if (tools.length > 0) config.tools = tools;
    if (highThinking) config.thinkingConfig = { thinkingLevel: 'HIGH' }; // String enum

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    res.json({
      text: response.text,
      groundingChunks: chunks,
    });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

geminiRouter.post('/analyze-media', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No media file provided' });
    const { prompt } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } },
          { text: prompt || 'Describe this media.' },
        ],
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Media Analysis Error:', error);
    res.status(500).json({ error: error.message });
  }
});

geminiRouter.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } },
          { text: 'Please transcribe the following audio exactly as spoken.' },
        ],
      },
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Transcription Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export function setupLiveWebsocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs, req) => {
    if (req.url === '/live') {
      try {
        const session = await ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are the Avatar Knight. You are a helpful assistant.',
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audio) clientWs.send(JSON.stringify({ audio }));
              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ interrupted: true }));
              }
            },
          },
        });

        clientWs.on('message', (data) => {
          try {
            const { audio } = JSON.parse(data.toString());
            if (audio) {
              session.sendRealtimeInput({
                audio: { data: audio, mimeType: 'audio/pcm;rate=16000' },
              });
            }
          } catch (err) {
            console.error('Live WS Parse Error:', err);
          }
        });

        clientWs.on('close', () => {
          session.close();
        });
      } catch (err) {
        console.error('Failed to establish Live session:', err);
        clientWs.close();
      }
    }
  });
}

export { geminiRouter };
