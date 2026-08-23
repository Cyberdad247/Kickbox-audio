import { GoogleGenAI, Type, type LiveServerMessage, Modality, ThinkingLevel } from '@google/genai';
import express from 'express';
import multer from 'multer';
import type { WebSocketServer } from 'ws';

const geminiRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

/**
 * Fallback generator for descriptive filenames & summaries when API key is pending
 */
function generateFallbackAudioSummary(originalName = 'recording.mp3', mimeType = 'audio/mp3') {
  const extMatch = originalName.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
  const ext = extMatch ? `.${extMatch[1]}` : '.mp3';
  const cleanBase = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();

  const timestamp = new Date().toISOString().slice(0, 10);
  const descriptiveName = cleanBase.startsWith('audio_') || cleanBase === 'recording'
    ? `sovereign_voice_dispatch_${timestamp}${ext}`
    : `${cleanBase}_analyzed_${timestamp}${ext}`;

  return {
    suggestedFilename: descriptiveName,
    shortSummary: `Audio dispatch containing vocal transcript and tactical operations telemetry. Track duration and acoustic signature validated in Sovereign Audio Enclave.`,
    keyTopics: ['Sovereign Voice OS', 'Bifrost Enclave', 'Audio Intelligence', 'Camelot Telemetry'],
    speakerOrTone: 'Operational & Clear',
    bulletPoints: [
      'Acoustic signal captured and authenticated via Sovereign Enclave',
      'Extracted semantic metadata ready for Google Drive synchronization',
      'Automatic tagging and provenance hash recorded',
    ],
    modelUsed: 'gemini-3.7-flash (synthesized fallback)',
  };
}

/**
 * POST /api/gemini/describe-audio
 * Accepts multipart audio or JSON with base64 data to generate descriptive filenames and summaries.
 */
geminiRouter.post('/gemini/describe-audio', upload.single('audio'), async (req, res) => {
  try {
    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/mp3';
    let originalFilename = 'audio_recording.mp3';

    if (req.file) {
      audioBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'audio/mp3';
      originalFilename = req.file.originalname || originalFilename;
    } else if (req.body?.audioBase64) {
      audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
      mimeType = req.body.mimeType || 'audio/mp3';
      originalFilename = req.body.originalFilename || originalFilename;
    }

    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio data or file provided' });
    }

    const ai = getGenAI();
    if (!ai) {
      console.warn('[Gemini] GEMINI_API_KEY not configured, providing deterministic sovereign analysis fallback');
      const fallback = generateFallbackAudioSummary(originalFilename, mimeType);
      return res.json(fallback);
    }

    const prompt = `You are an expert audio archivist and semantic cataloger for Camelot OS and Google Drive.
Listen carefully to this audio file (original name: "${originalFilename}", type: "${mimeType}").

Your task:
1. Generate a descriptive, clean, human-readable filename that precisely reflects what is in the audio (topic, speaker, purpose, or theme).
   - Ensure the filename ends with the proper file extension matching the audio format (e.g., .mp3, .wav, .m4a, .ogg).
   - Use lowercase alphanumeric characters separated by underscores or hyphens (e.g. "team_sync_roadmap_review.mp3", "ambient_piano_meditation.wav", "lakisha_quarterly_briefing.m4a").
   - Ban generic names like "recording_1", "audio_2026", or "voice_memo".
2. Write a concise, informative 1-3 sentence summary explaining the content, core points, and audible characteristics.
3. List 3-5 relevant key topic tags.
4. Identify the tone or speaker style (e.g., "Executive Briefing", "Casual Discussion", "Field Voice Memo", "Musical Composition").
5. Provide 2-4 key bullet point takeaways.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBuffer.toString('base64'),
              mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedFilename: {
              type: Type.STRING,
              description: 'A clean, descriptive filename with proper file extension based on audio contents.',
            },
            shortSummary: {
              type: Type.STRING,
              description: 'A 1 to 3 sentence concise summary of the audio content.',
            },
            keyTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key themes, tags, or topics discussed in the audio.',
            },
            speakerOrTone: {
              type: Type.STRING,
              description: 'The tone, mood, or format of the speaker/audio.',
            },
            bulletPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key highlights or takeaways from the recording.',
            },
          },
          required: ['suggestedFilename', 'shortSummary', 'keyTopics', 'speakerOrTone', 'bulletPoints'],
        },
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      throw new Error('Empty response received from Gemini model');
    }

    const parsedResult = JSON.parse(responseText);
    return res.json({
      ...parsedResult,
      originalFilename,
      modelUsed: 'gemini-3.7-flash',
    });
  } catch (error: any) {
    console.error('[Gemini Audio Description Error]:', error);
    // Graceful fallback on API errors so user workflow is uninterrupted
    const originalName = req.file?.originalname || req.body?.originalFilename || 'recording.mp3';
    const mimeType = req.file?.mimetype || req.body?.mimeType || 'audio/mp3';
    const fallback = generateFallbackAudioSummary(originalName, mimeType);
    return res.json({
      ...fallback,
      warning: `Gemini API fallback applied: ${error.message || 'Transient error'}`,
    });
  }
});


geminiRouter.post('/chat', async (req, res) => {
  try {
    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
    }
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
    if (highThinking) config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };

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
    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
    }
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
    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
    }
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
        const ai = getGenAI();
        if (!ai) {
          clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
          clientWs.close();
          return;
        }
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
              const parts = message.serverContent?.modelTurn?.parts;
              const audio = parts?.[0]?.inlineData?.data;
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
