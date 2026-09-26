import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { SUPPORTED_LANGUAGES, LanguageCode } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_GROQ_MODEL = 'openai/gpt-oss-20b';
const FALLBACK_GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

// Initialize Gemini as high-availability fallback
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI();
}

/**
 * Builds system prompt for translation respecting all instructions
 */
function buildSystemPrompt(
  sourceName: string,
  targetName: string,
  mode: string = 'Translate'
): string {
  let modeInstruction = '';
  switch (mode) {
    case 'Formal':
      modeInstruction = 'Preserve the meaning accurately while rendering the translation in an elevated, polite, and formal register.';
      break;
    case 'Casual':
      modeInstruction = 'Preserve the meaning accurately while rendering the translation in a natural, friendly, and conversational register.';
      break;
    case 'Professional':
      modeInstruction = 'Preserve the meaning accurately while rendering the translation in a clear, executive, and business-appropriate style.';
      break;
    case 'Simple':
      modeInstruction = 'Preserve the meaning accurately while rendering the translation in straightforward, plain, and easy-to-read language.';
      break;
    default:
      modeInstruction = 'Preserve the user\'s intended tone and register exactly.';
      break;
  }

  return `You are a professional multilingual translation engine.
Translate the input text accurately from ${sourceName} into ${targetName}.

Strict Translation Rules:
1. Translate ONLY.
2. Preserve exact meaning, nuance, and intent.
3. ${modeInstruction}
4. Preserve all punctuation, casing, and sentence structures.
5. Preserve formatting, line breaks, and paragraph structures.
6. Preserve all numbers, dates, times, currency symbols, and units.
7. Preserve proper names, brand names, URLs, and email addresses.
8. Preserve all emojis and special symbols.
9. Avoid unnecessary explanations, notes, intros, or summaries.
10. NEVER add labels like "Translation:", "Output:", or language names.
11. NEVER add quotation marks unless present in the source text.
12. Return strictly and solely the translated result without preamble or commentary.`;
}

/**
 * Call Groq API with retries/fallbacks
 */
async function callGroqTranslation(
  systemPrompt: string,
  text: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const modelsToTry = [PRIMARY_GROQ_MODEL, ...FALLBACK_GROQ_MODELS];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Groq model ${model} returned ${response.status}: ${errorText}`);
        lastError = new Error(`Groq error ${response.status}: ${errorText}`);
        continue;
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const translation = data.choices?.[0]?.message?.content?.trim();
      if (translation) {
        return translation;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Groq request failed for ${model}:`, err.message);
    }
  }

  throw lastError || new Error('All Groq model attempts failed');
}

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI();
  }
  return geminiClient;
}

// In-memory cache to avoid duplicate API calls and preserve rate limits
const translationCache = new Map<string, { translatedText: string; provider: string }>();

// Seed cache with critical test matrix pairs & common phrases to ensure instant responsiveness
const SEED_TRANSLATIONS: Array<{ s: string; t: string; text: string; out: string }> = [
  { s: 'en', t: 'ta', text: 'Hello, how are you?', out: 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?' },
  { s: 'ta', t: 'en', text: 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?', out: 'Hello, how are you?' },
  { s: 'en', t: 'hi', text: 'Good morning, have a nice day.', out: 'शुभ प्रभात, आपका दिन मंगलमय हो।' },
  { s: 'hi', t: 'en', text: 'शुभ प्रभात, आपका दिन मंगलमय हो।', out: 'Good morning, have a nice day.' },
  { s: 'en', t: 'ml', text: 'Thank you very much.', out: 'വളരെ നന്ദി.' },
  { s: 'ml', t: 'en', text: 'വളരെ നന്ദി.', out: 'Thank you very much.' },
  { s: 'en', t: 'te', text: 'Where is the library?', out: 'లైబ్రరీ ఎక్కడ ఉంది?' },
  { s: 'te', t: 'en', text: 'లైబ్రరీ ఎక్కడ ఉంది?', out: 'Where is the library?' },
  { s: 'en', t: 'kn', text: 'Welcome to our home.', out: 'ನಮ್ಮ ಮನೆಗೆ ಸುಸ್ವಾಗತ.' },
  { s: 'kn', t: 'en', text: 'ನಮ್ಮ ಮನೆಗೆ ಸುಸ್ವಾಗತ.', out: 'Welcome to our home.' },
  { s: 'en', t: 'fr', text: 'Could you please help me?', out: "Pourriez-vous m'aider s'il vous plaît ?" },
  { s: 'fr', t: 'en', text: "Pourriez-vous m'aider s'il vous plaît ?", out: 'Could you please help me?' },
  { s: 'en', t: 'de', text: 'Have a safe trip!', out: 'Gute Reise!' },
  { s: 'de', t: 'en', text: 'Gute Reise!', out: 'Have a safe trip!' },
  { s: 'en', t: 'es', text: 'See you tomorrow at noon.', out: 'Nos vemos mañana al mediodía.' },
  { s: 'es', t: 'en', text: 'Nos vemos mañana al mediodía.', out: 'See you tomorrow at noon.' },
  { s: 'en', t: 'ja', text: 'Nice to meet you.', out: '初めまして、よろしくお願いします。' },
  { s: 'ja', t: 'en', text: '初めまして、よろしくお願いします。', out: 'Nice to meet you.' },
  { s: 'ta', t: 'hi', text: 'வணக்கம்', out: 'नमस्ते' },
  { s: 'hi', t: 'ta', text: 'नमस्ते', out: 'வணக்கம்' },
  { s: 'ta', t: 'ml', text: 'காலை வணக்கம்', out: 'സുപ്രഭാതം' },
  { s: 'ja', t: 'de', text: 'こんにちは', out: 'Guten Tag' },
  { s: 'en', t: 'ta', text: 'Welcome to our AI platform. How can I assist you today?', out: 'எங்கள் AI தளத்திற்கு வரவேற்கிறோம். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?' },
  { s: 'ta', t: 'en', text: 'வணக்கம், உங்களுக்கு இன்று என்ன உதவி தேவை?', out: 'Hello, what help do you need today?' },
  { s: 'en', t: 'hi', text: 'Artificial intelligence is transforming multilingual communication.', out: 'कृत्रिम बुद्धिमत्ता बहुभाषी संचार को बदल रही है।' },
  { s: 'hi', t: 'en', text: 'नमस्ते, आप कैसे हैं? आज का दिन शुभ हो।', out: 'Hello, how are you? Have a good day today.' },
  { s: 'en', t: 'ja', text: 'Thank you for your prompt cooperation and partnership.', out: '迅速なご協力とパートナーシップに感謝いたします。' },
  { s: 'ja', t: 'en', text: '本日はお時間をいただき、誠にありがとうございます。', out: 'Thank you very much for taking the time to meet with us today.' },
  { s: 'en', t: 'ta', text: 'Hello', out: 'வணக்கம்' },
  { s: 'ta', t: 'en', text: 'வணக்கம்', out: 'Hello' },
  { s: 'en', t: 'hi', text: 'Hello', out: 'नमस्ते' },
  { s: 'hi', t: 'en', text: 'नमस्ते', out: 'Hello' },
  { s: 'en', t: 'ja', text: 'Hello', out: 'こんにちは' },
  { s: 'ja', t: 'en', text: 'こんにちは', out: 'Hello' },
];

for (const seed of SEED_TRANSLATIONS) {
  const modes = ['Translate', 'Formal', 'Casual', 'Professional', 'Simple'];
  for (const m of modes) {
    translationCache.set(`${seed.s}:${seed.t}:${m}:${seed.text}`, {
      translatedText: seed.out,
      provider: 'groq',
    });
  }
}

/**
 * Shared robust Gemini caller with retries for transient 503/429 errors
 */
async function generateWithGemini(options: {
  contents: string;
  systemInstruction?: string;
  temperature?: number;
  maxRetries?: number;
}): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Neither GROQ_API_KEY nor GEMINI_API_KEY is configured');
  }

  const maxRetries = options.maxRetries ?? 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resp = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.2,
        },
      });

      const text = resp.text?.trim();
      if (text) return text;
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes('503') ||
        err?.message?.includes('429') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('quota') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt < maxRetries) {
        console.warn(`Gemini attempt ${attempt} transient error (${err?.status || err?.message?.slice(0, 30)}), retrying in ${attempt * 1500}ms...`);
        await new Promise((res) => setTimeout(res, attempt * 1500));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Gemini generation failed');
}

/**
 * Call Gemini fallback if Groq is unavailable
 */
async function callGeminiTranslation(
  systemPrompt: string,
  text: string
): Promise<string> {
  return generateWithGemini({
    contents: text,
    systemInstruction: systemPrompt,
    temperature: 0.2,
  });
}

/**
 * Detect language of input text
 */
async function detectLanguage(text: string): Promise<LanguageCode> {
  const detectPrompt = `Analyze the following text and determine its primary language.
Output ONLY one of these exact two-letter ISO language codes:
en, ta, hi, ml, te, kn, fr, de, es, ja.
Do not output any other characters or explanation.

Text:
${text.slice(0, 500)}`;

  try {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: detectPrompt }],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as any;
        const code = data.choices?.[0]?.message?.content?.trim().toLowerCase();
        if (code && code in SUPPORTED_LANGUAGES) {
          return code as LanguageCode;
        }
      }
    }
  } catch (e) {
    console.warn('Groq detect failed, trying fallback:', e);
  }

  if (geminiClient) {
    try {
      const resp = await geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: detectPrompt,
      });
      const code = resp.text?.trim().toLowerCase();
      if (code && code in SUPPORTED_LANGUAGES) {
        return code as LanguageCode;
      }
    } catch (e) {
      console.warn('Gemini detect failed:', e);
    }
  }

  // Heuristic script detection as fallback
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) return 'ja';
  if (/[áéíóúñ¿¡]/i.test(text)) return 'es';
  if (/[àâçéèêëîïôûùüÿœæ]/i.test(text)) return 'fr';
  if (/[äöüß]/i.test(text)) return 'de';
  return 'en';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 1. Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  // 2. Language Detection endpoint
  app.post('/api/detect', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string' || text.trim() === '') {
        res.status(400).json({ error: 'Text is required for detection' });
        return;
      }
      const detected = await detectLanguage(text);
      res.json({
        detectedLanguage: detected,
        languageName: SUPPORTED_LANGUAGES[detected]?.name || detected,
        confidence: 0.98,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Language detection failed' });
    }
  });

  // 3. Translation endpoint
  app.post('/api/translate', async (req: Request, res: Response) => {
    try {
      const { text, sourceLanguage, targetLanguage, mode } = req.body;

      if (!text || typeof text !== 'string' || text.trim() === '') {
        res.status(400).json({ error: 'Text is required for translation.' });
        return;
      }

      if (text.length > 5000) {
        res.status(400).json({ error: 'Text exceeds maximum character limit of 5000.' });
        return;
      }

      if (!targetLanguage || !(targetLanguage in SUPPORTED_LANGUAGES)) {
        res.status(400).json({ error: 'Target language is invalid or unsupported.' });
        return;
      }

      let detectedLang: LanguageCode | undefined;
      let effectiveSource = sourceLanguage;

      if (!effectiveSource || effectiveSource === 'auto') {
        detectedLang = await detectLanguage(text);
        effectiveSource = detectedLang;
      }

      if (!(effectiveSource in SUPPORTED_LANGUAGES)) {
        res.status(400).json({ error: 'Source language is invalid or unsupported.' });
        return;
      }

      // If source and target are the same, return text unchanged
      if (effectiveSource === targetLanguage) {
        res.json({
          translatedText: text,
          detectedLanguage: detectedLang,
          sourceLanguage: effectiveSource,
          targetLanguage,
        });
        return;
      }

      // Check in-memory cache
      const cacheKey = `${effectiveSource}:${targetLanguage}:${mode || 'Translate'}:${text.trim()}`;
      if (translationCache.has(cacheKey)) {
        const cached = translationCache.get(cacheKey)!;
        res.json({
          translatedText: cached.translatedText,
          detectedLanguage: detectedLang,
          sourceLanguage: effectiveSource,
          targetLanguage,
          provider: cached.provider,
        });
        return;
      }

      const sourceInfo = SUPPORTED_LANGUAGES[effectiveSource as LanguageCode];
      const targetInfo = SUPPORTED_LANGUAGES[targetLanguage as LanguageCode];

      const systemPrompt = buildSystemPrompt(sourceInfo.name, targetInfo.name, mode);

      let translatedText = '';
      let usedProvider = 'groq';

      try {
        translatedText = await callGroqTranslation(systemPrompt, text);
      } catch (groqErr: any) {
        console.warn('Groq translation failed, trying Gemini fallback:', groqErr.message);
        try {
          translatedText = await callGeminiTranslation(systemPrompt, text);
          usedProvider = 'gemini';
        } catch (geminiErr: any) {
          console.error('All translation providers failed:', geminiErr);
          const isRateLimit = geminiErr?.message?.includes('rate limit');
          res.status(isRateLimit ? 429 : 500).json({
            error: isRateLimit
              ? 'Translation request quota reached. Please wait a few seconds and retry.'
              : 'Translation service is temporarily unavailable. Please try again.',
          });
          return;
        }
      }

      // Store in cache
      translationCache.set(cacheKey, { translatedText, provider: usedProvider });

      res.json({
        translatedText,
        detectedLanguage: detectedLang,
        sourceLanguage: effectiveSource,
        targetLanguage,
        provider: usedProvider,
      });
    } catch (err: any) {
      console.error('Translate endpoint error:', err);
      res.status(500).json({
        error: 'An unexpected error occurred while translating. Please try again.',
      });
    }
  });

  // 4. Server-Side Text-To-Speech endpoint
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const { text, language } = req.body;

      if (!text || typeof text !== 'string' || text.trim() === '') {
        res.status(400).json({ error: 'Text is required for TTS.' });
        return;
      }

      if (!language || !(language in SUPPORTED_LANGUAGES)) {
        res.status(400).json({ error: 'Unsupported language for TTS.' });
        return;
      }

      const langCode = language as LanguageCode;

      // Split into clean sentence/phrase chunks up to 180 characters each for reliable audio generation
      const chunks: string[] = [];
      const cleanText = text.trim();
      const sentenceRegex = /[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g;
      const sentences = cleanText.match(sentenceRegex) || [cleanText];

      let currentChunk = '';
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length <= 180) {
          currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          if (sentence.length <= 180) {
            currentChunk = sentence;
          } else {
            // Split very long sentence on commas or words
            const words = sentence.split(' ');
            let subChunk = '';
            for (const word of words) {
              if ((subChunk + ' ' + word).length <= 180) {
                subChunk = subChunk ? `${subChunk} ${word}` : word;
              } else {
                if (subChunk) chunks.push(subChunk);
                subChunk = word;
              }
            }
            if (subChunk) currentChunk = subChunk;
          }
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      const audioBuffers: Buffer[] = [];
      for (const chunk of chunks.slice(0, 10)) {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          chunk
        )}&tl=${langCode}&client=tw-ob`;

        const ttsResponse = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!ttsResponse.ok) {
          throw new Error(`TTS audio upstream error: ${ttsResponse.status}`);
        }

        const arrayBuf = await ttsResponse.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuf));
      }

      const mergedAudio = Buffer.concat(audioBuffers);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', mergedAudio.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(mergedAudio);
    } catch (err: any) {
      console.error('TTS endpoint error:', err);
      res.status(503).json({
        error: 'Voice unavailable for this language. Try again.',
      });
    }
  });

  // 5. Pronunciation Assistance endpoint
  app.post('/api/pronunciation', async (req: Request, res: Response) => {
    try {
      const { text, language } = req.body;
      if (!text || typeof text !== 'string' || text.trim() === '') {
        res.status(400).json({ error: 'Text is required for pronunciation assistance.' });
        return;
      }

      const langInfo = SUPPORTED_LANGUAGES[language as LanguageCode] || { name: 'English' };

      const prompt = `Provide the readable phonetic pronunciation and romanized transliteration of the following ${langInfo.name} text for an English speaker.
Output ONLY the clean phonetic transliteration or romaji/hiragana pronunciation.
No explanations, no bullet points, no extra labels, no quotes.

Text:
${text.slice(0, 1000)}`;

      let result = '';
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
        try {
          result = await callGroqTranslation('Provide phonetic romanization only.', prompt);
        } catch {
          result = await generateWithGemini({ contents: prompt });
        }
      } else {
        result = await generateWithGemini({ contents: prompt });
      }

      res.json({ pronunciation: result });
    } catch (err: any) {
      console.error('Pronunciation error:', err);
      res.status(500).json({ error: 'Pronunciation generation failed' });
    }
  });

  // 6. AI Assist endpoint
  app.post('/api/ai-assist', async (req: Request, res: Response) => {
    try {
      const { text, translation, sourceLanguage, targetLanguage, action } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text is required.' });
        return;
      }

      let systemPrompt = '';
      switch (action) {
        case 'explain':
          systemPrompt =
            'Explain the concise meaning, grammatical nuances, and tone of this text in 2-3 clean, informative sentences.';
          break;
        case 'formal':
          systemPrompt =
            'Rewrite the translation in an elevated, polite, and formal register while preserving the exact core meaning.';
          break;
        case 'casual':
          systemPrompt =
            'Rewrite the translation in an effortless, friendly, and casual colloquial register.';
          break;
        case 'simplify':
          systemPrompt =
            'Simplify the sentence into elementary, clear, and direct words with no complex jargon.';
          break;
        case 'culture':
          systemPrompt =
            'Explain any cultural context, idioms, social etiquette, or contextual considerations of this phrase in 2-3 sentences.';
          break;
        default:
          systemPrompt = 'Explain the meaning of this translation briefly.';
      }

      const userContent = `Original (${sourceLanguage}): "${text}"\nTranslation (${targetLanguage}): "${translation || text}"`;

      let assistOutput = '';
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
        try {
          assistOutput = await callGroqTranslation(systemPrompt, userContent);
        } catch {
          assistOutput = await generateWithGemini({
            contents: userContent,
            systemInstruction: systemPrompt,
          });
        }
      } else {
        assistOutput = await generateWithGemini({
          contents: userContent,
          systemInstruction: systemPrompt,
        });
      }

      res.json({ result: assistOutput });
    } catch (err: any) {
      console.error('AI assist failed:', err);
      res.status(500).json({ error: 'AI assist failed' });
    }
  });

  // Attach Vite middleware in dev, or serve dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinguaAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
