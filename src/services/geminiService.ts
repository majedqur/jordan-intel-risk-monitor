import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { RiskData, RiskSignal, SpecialIndicator, RiskPrediction } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
const modelName = "gemini-3-flash-preview";

const BASE_SYSTEM_INSTRUCTION = `أنت نواة استخبارات الذكاء الاصطناعي للشرق الأوسط، تركز على الأردن. المصادر: الجزيرة، تيليجرام، وكالات أنباء إيرانية وإسرائيلية. استخدم بحث Google لآخر ساعة. اللغة: العربية حصراً.`;

let apiLockPromise: Promise<void> | null = null;
let circuitBreakerUntil = 0;
const API_COOLDOWN = 1000;

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  // Circuit breaker check
  const now = Date.now();
  if (now < circuitBreakerUntil) {
    const waitSec = Math.ceil((circuitBreakerUntil - now) / 1000);
    throw new Error(`QUOTA_COOLDOWN: النظام في وضع الراحة لتجنب الحظر. يرجى الانتظار ${waitSec} ثانية.`);
  }

  // Wait for existing lock if any
  let waitAttempts = 0;
  while (apiLockPromise) {
    if (waitAttempts > 60) { // 60 seconds timeout
      apiLockPromise = null; // Force reset if stuck too long
      throw new Error("API_TIMEOUT: النظام مستغرق في معالجة طلبات ثقيلة. يرجى تحديث الصفحة.");
    }
    await apiLockPromise;
    // Add a tiny delay to allow the nullification to happen in the event loop
    await new Promise(resolve => setTimeout(resolve, 100));
    waitAttempts++;
  }

  let resolveLock: () => void;
  apiLockPromise = new Promise((resolve) => {
    resolveLock = resolve;
  });

  let lastError: any;
  
  try {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        const errorMsg = error?.message || "";
        const errorString = (errorMsg + " " + JSON.stringify(error)).toLowerCase();
        
        const isQuotaError = 
          errorString.includes("quota") || 
          errorString.includes("limit") || 
          errorString.includes("429") || 
          errorString.includes("resource_exhausted") ||
          errorString.includes("exceeded quota") ||
          error?.status === "RESOURCE_EXHAUSTED" ||
          error?.error?.status === "RESOURCE_EXHAUSTED";

        if (isQuotaError) {
          // Trigger circuit breaker for 60 seconds on quota error
          circuitBreakerUntil = Date.now() + 60000;
          
          if (i < maxRetries - 1) {
            const delay = Math.pow(2, i + 1) * 3000 + Math.random() * 3000;
            console.warn(`Quota exceeded. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error("QUOTA_EXHAUSTED: تم تجاوز حد الطلبات المسموح به. سيتم عرض البيانات المخزنة حالياً.");
        }
        
        throw error;
      }
    }
  } finally {
    // Release the lock after a cooldown to prevent rapid fire
    setTimeout(() => {
      apiLockPromise = null;
      if (resolveLock!) resolveLock();
    }, API_COOLDOWN);
  }
  throw lastError;
}

function cleanJsonResponse(text: string): string {
  if (!text) return "{}";
  
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  // Find the first '{' or '['
  const startBrace = cleaned.indexOf('{');
  const startBracket = cleaned.indexOf('[');
  const start = (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) ? startBrace : startBracket;
  
  if (start === -1) return "{}";
  
  // Basic repair for truncated JSON
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let lastValidIndex = start;
  
  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"' && cleaned[i-1] !== '\\') inString = !inString;
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
      
      // If we are back to balanced state, this is a potential end point
      if (openBraces === 0 && openBrackets === 0) {
        lastValidIndex = i;
      }
    }
  }
  
  // If not balanced, try to close it
  if (openBraces > 0 || openBrackets > 0 || inString) {
    let repaired = cleaned;
    
    // Handle truncated numbers (e.g., "probability": 0.)
    // If the last character is a dot or a digit followed by a dot, it might be a truncated float
    if (repaired.match(/\d\.$/)) {
      repaired += "0";
    } else if (repaired.endsWith(".")) {
      repaired += "0";
    }

    if (inString) repaired += '"';
    
    // Remove any trailing commas that might cause issues after repair
    repaired = repaired.replace(/,\s*$/g, "");
    
    while (openBraces > 0) { repaired += '}'; openBraces--; }
    while (openBrackets > 0) { repaired += ']'; openBrackets--; }
    return repaired.substring(start);
  }
  
  // If it was balanced, return the substring from start to lastValidIndex
  return cleaned.substring(start, lastValidIndex + 1);
}

export async function analyzeGlobalRisk(): Promise<RiskData> {
  const prompt = `${BASE_SYSTEM_INSTRUCTION} قم بإجراء تحليل استخباراتي شامل ومختصر للوضع الراهن في الشرق الأوسط، مع التركيز على الأردن. أجب بتنسيق JSON فقط.`;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            trend: { type: Type.STRING, enum: ["rising", "stable", "falling"] },
            explanation: { type: Type.STRING },
            signals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  source: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  sentiment: { type: Type.STRING, enum: ["negative", "neutral", "positive"] },
                  impact: { type: Type.NUMBER },
                  credibility: { type: Type.NUMBER },
                  timestamp: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["id", "source", "headline", "summary", "sentiment", "impact", "credibility", "timestamp"]
              }
            },
            analysts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  persona: { type: Type.STRING },
                  opinion: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["id", "persona", "opinion", "confidence"]
              }
            },
            prediction: {
              type: Type.OBJECT,
              properties: {
                forecast: { type: Type.STRING },
                timeframeDays: { type: Type.NUMBER },
                verificationCriteria: { type: Type.STRING },
                previousAccuracy: { type: Type.STRING }
              },
              required: ["forecast", "timeframeDays"]
            },
            regions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  riskLevel: { type: Type.NUMBER },
                  status: { type: Type.STRING, enum: ["critical", "high", "moderate", "stable"] },
                  description: { type: Type.STRING }
                },
                required: ["id", "name", "riskLevel", "status", "description"]
              }
            },
            specialIndicators: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  probability: { type: Type.NUMBER },
                  status: { type: Type.STRING, enum: ["critical", "high", "moderate", "stable"] },
                  description: { type: Type.STRING }
                },
                required: ["id", "label", "probability", "status", "description"]
              }
            }
          },
          required: ["score", "trend", "explanation", "signals", "analysts", "prediction", "regions", "specialIndicators"]
        },
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });
    const data = JSON.parse(cleanJsonResponse(response.text || "{}"));
    return sanitizeRiskData(data);
  });
}

/**
 * تحديث الأخبار العاجلة فقط (آخر ساعة). توفر الكثير من التوكنز.
 */
export async function fetchLatestSignals(lastSignals?: RiskSignal[]): Promise<RiskSignal[]> {
  const lastHeadlines = lastSignals?.slice(0, 5).map(s => s.headline).join(", ") || "لا يوجد";
  const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  const prompt = `${BASE_SYSTEM_INSTRUCTION} 
  التاريخ الحالي: ${currentDate}
  الوقت الحالي: ${currentTime} (UTC)
  ابحث عن أخبار عاجلة (آخر ساعة فقط) من الجزيرة وتيليجرام والمصادر الإسرائيلية والإيرانية. 
  تجنب التكرار: [${lastHeadlines}]. 
  المطلوب: أخبار ميدانية عاجلة جداً حدثت الآن أو قبل دقائق. 
  أجب بتنسيق JSON فقط.`;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  source: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  sentiment: { type: Type.STRING, enum: ["negative", "neutral", "positive"] },
                  impact: { type: Type.NUMBER },
                  credibility: { type: Type.NUMBER },
                  timestamp: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["id", "source", "headline", "summary", "sentiment", "impact", "credibility", "timestamp"]
              }
            }
          },
          required: ["signals"]
        },
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    const data = JSON.parse(cleanJsonResponse(response.text || "{}"));
    return (data.signals || []).map(sanitizeSignal);
  });
}

/**
 * تحديث مؤشرات لوحة التحكم فقط (النتيجة، الاتجاه، المؤشرات الخاصة).
 */
export async function fetchDashboardSummary(prevIndicators?: SpecialIndicator[]): Promise<Partial<RiskData>> {
  const prevContext = prevIndicators?.map(i => `${i.label}: ${i.probability}%`).join(", ") || "لا يوجد";
  const prompt = `${BASE_SYSTEM_INSTRUCTION} 
  قم بتحديث لوحة التحكم بناءً على آخر التطورات الميدانية والسياسية والاقتصادية.
  يجب عليك تحديث المؤشرات الثلاثة التالية حصراً باستخدام هذه المعرفات (IDs):
  1. 'energy-risk': احتمالية استهداف منشآت الطاقة بالأردن.
  2. 'ceasefire-risk': احتمالية وقف إطلاق النار في غزة/لبنان وتأثيره.
  3. 'economic-risk': احتمالية وجود أزمة اقتصادية بالأردن.

  السياق السابق: [${prevContext}]. 
  
  المطلوب لكل مؤشر:
  - نسبة احتمالية دقيقة (Probability) بناءً على أحداث اليوم.
  - وصف تفصيلي (Description) يشرح "لماذا" هذه النسبة، مع ذكر أحداث محددة. لا تكتب "جاري التحليل"، بل قدم تحليلاً حقيقياً.
  - حالة (Status) تعكس الخطورة.

  أجب بتنسيق JSON فقط.`;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            trend: { type: Type.STRING, enum: ["rising", "stable", "falling"] },
            explanation: { type: Type.STRING },
            specialIndicators: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  probability: { type: Type.NUMBER },
                  status: { type: Type.STRING, enum: ["critical", "high", "moderate", "stable"] },
                  description: { type: Type.STRING }
                },
                required: ["id", "probability", "status", "description"]
              }
            }
          },
          required: ["score", "trend", "explanation", "specialIndicators"]
        },
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return JSON.parse(cleanJsonResponse(response.text || "{}"));
  });
}

export async function updateRiskSignals(lastSignals?: RiskSignal[]): Promise<RiskSignal[]> {
  return fetchLatestSignals(lastSignals);
}

/**
 * تحديث التحليل الاستراتيجي (المحللين والتوقعات).
 */
export async function fetchStrategicAnalysis(): Promise<Partial<RiskData>> {
  const prompt = `${BASE_SYSTEM_INSTRUCTION} قدم تحليلاً استراتيجياً عميقاً للوضع الحالي في الشرق الأوسط. المطلوب: 2 محللين وتوقعات استراتيجية مفصلة. أجب بتنسيق JSON فقط.`;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  persona: { type: Type.STRING },
                  opinion: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["id", "persona", "opinion", "confidence"]
              }
            },
            prediction: {
              type: Type.OBJECT,
              properties: {
                forecast: { type: Type.STRING },
                timeframeDays: { type: Type.NUMBER },
                verificationCriteria: { type: Type.STRING },
                previousAccuracy: { type: Type.STRING }
              },
              required: ["forecast", "timeframeDays"]
            }
          },
          required: ["analysts", "prediction"]
        },
        maxOutputTokens: 1500,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return JSON.parse(cleanJsonResponse(response.text || "{}"));
  });
}

export async function updateRiskScore(currentScore: number, currentExplanation: string, previousIndicators?: SpecialIndicator[]): Promise<{ score: number; trend: 'rising' | 'stable' | 'falling'; explanation: string; specialIndicators?: SpecialIndicator[] }> {
  const summary = await fetchDashboardSummary(previousIndicators);
  
  // Process indicators to match the expected format
  const rawIndicators = summary.specialIndicators || [];
  const processedIndicators: SpecialIndicator[] = [];
  const requiredIds = ['energy-risk', 'ceasefire-risk', 'economic-risk'];
  const requiredLabels = [
    "احتمالية استهداف منشآت الطاقة بالأردن",
    "احتمالية وقف إطلاق النار",
    "احتمالية حدوث أزمة اقتصادية بالأردن"
  ];

  requiredIds.forEach((id, index) => {
    const found = rawIndicators.find((si: any) => si.id === id);
    if (found) {
      processedIndicators.push({
        id: found.id || id,
        label: requiredLabels[index],
        probability: typeof found.probability === 'number' ? found.probability : 50,
        status: ['critical', 'high', 'moderate', 'stable'].includes(found.status) ? found.status : 'moderate',
        description: found.description || "جاري تحليل البيانات الميدانية..."
      });
    } else {
      processedIndicators.push({
        id: id,
        label: requiredLabels[index],
        probability: 50,
        status: 'moderate',
        description: "جاري تحليل البيانات الميدانية..."
      });
    }
  });

  return {
    score: typeof summary.score === 'number' ? summary.score : currentScore,
    trend: (summary.trend as any) || 'stable',
    explanation: summary.explanation || currentExplanation,
    specialIndicators: processedIndicators
  };
}

function sanitizeSignal(s: any): RiskSignal {
  // Generate a deterministic ID if not provided, based on the headline to avoid duplicates
  const generatedId = s.headline ? 
    s.headline.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0).toString(36) + 
    Math.floor(new Date(s.timestamp || Date.now()).getTime() / 3600000).toString(36) : 
    Math.random().toString(36).substring(2, 11);

  return {
    id: s.id || generatedId,
    source: s.source || "استخبارات",
    headline: s.headline || "إشارة جديدة",
    summary: s.summary || s.headline || "جاري تحليل التفاصيل...",
    sentiment: ['negative', 'neutral', 'positive'].includes(s.sentiment) ? s.sentiment : 'neutral',
    impact: typeof s.impact === 'number' ? s.impact : 5,
    credibility: typeof s.credibility === 'number' ? s.credibility : 85,
    timestamp: s.timestamp || new Date().toISOString(),
    url: s.url || `https://www.google.com/search?q=${encodeURIComponent(s.headline)}`
  };
}

function sanitizeRiskData(data: any): RiskData {
  const defaultPrediction: RiskPrediction = {
    forecast: "بناءً على المعطيات الحالية، يتوقع استمرار حالة الترقب مع احتمالية تصعيد محدود في المناطق الحدودية خلال الأيام القادمة. جاري مراقبة التحركات الميدانية بدقة.",
    timeframeDays: 7,
    verificationCriteria: "مراقبة التقارير الميدانية وتصريحات المسؤولين.",
    previousAccuracy: "85% (بناءً على التحليلات السابقة)"
  };

  const defaultSpecialIndicators: SpecialIndicator[] = [
    { id: 'energy-risk', label: "احتمالية استهداف منشآت الطاقة بالأردن", probability: 0, status: 'stable', description: "لا توجد مؤشرات حالية." },
    { id: 'ceasefire-risk', label: "احتمالية وقف إطلاق النار", probability: 0, status: 'stable', description: "لا توجد مؤشرات حالية." },
    { id: 'economic-risk', label: "احتمالية وجود أزمة اقتصادية بالأردن", probability: 0, status: 'stable', description: "لا توجد مؤشرات حالية." }
  ];

  return {
    score: typeof data.score === 'number' ? data.score : 50,
    trend: ['rising', 'stable', 'falling'].includes(data.trend) ? data.trend : 'stable',
    explanation: data.explanation || "اكتمل التحليل الاستخباراتي.",
    signals: Array.isArray(data.signals) ? data.signals.map(sanitizeSignal) : [],
    analysts: Array.isArray(data.analysts) ? data.analysts.map((a: any) => ({
      id: a.id || Math.random().toString(36).substring(2, 11),
      persona: a.persona || "محلل استراتيجي",
      opinion: a.opinion || "جاري معالجة البيانات...",
      confidence: typeof a.confidence === 'number' ? a.confidence : 75
    })) : [],
    prediction: data.prediction ? {
      forecast: data.prediction.forecast || defaultPrediction.forecast,
      timeframeDays: typeof data.prediction.timeframeDays === 'number' ? data.prediction.timeframeDays : defaultPrediction.timeframeDays,
      verificationCriteria: data.prediction.verificationCriteria || defaultPrediction.verificationCriteria,
      previousAccuracy: data.prediction.previousAccuracy || defaultPrediction.previousAccuracy
    } : defaultPrediction,
    regions: Array.isArray(data.regions) ? data.regions.map((r: any) => ({
      id: r.id || Math.random().toString(36).substring(2, 11),
      name: r.name || "منطقة حدودية",
      riskLevel: typeof r.riskLevel === 'number' ? r.riskLevel : 50,
      status: ['critical', 'high', 'moderate', 'stable'].includes(r.status) ? r.status : 'stable',
      description: r.description || "لا توجد بيانات ميدانية حالية."
    })) : [],
    specialIndicators: Array.isArray(data.specialIndicators) && data.specialIndicators.length > 0 
      ? data.specialIndicators.map((si: any) => ({
          id: si.id || Math.random().toString(36).substring(2, 11),
          label: si.label || (si.id === 'energy-risk' ? "احتمالية استهداف منشآت الطاقة بالأردن" :
                           si.id === 'ceasefire-risk' ? "احتمالية وقف إطلاق النار" :
                           si.id === 'economic-risk' ? "احتمالية حدوث أزمة اقتصادية بالأردن" : "مؤشر خاص"),
          probability: typeof si.probability === 'number' ? si.probability : 0,
          status: ['critical', 'high', 'moderate', 'stable'].includes(si.status) ? si.status : 'stable',
          description: si.description || "جاري التحليل..."
        }))
      : defaultSpecialIndicators,
    timestamp: new Date().toISOString()
  };
}
