import React, { useState, useEffect, useCallback, useRef, ErrorInfo, ReactNode, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, ShieldAlert, TrendingUp, TrendingDown, Minus, Info, Globe, AlertCircle, Terminal, Mail, LifeBuoy, Copy, Check } from 'lucide-react';
import { analyzeGlobalRisk, updateRiskSignals, updateRiskScore, fetchDashboardSummary, fetchLatestSignals, fetchStrategicAnalysis } from './services/geminiService';
import { RiskData, RiskSignal } from './types';
import { RiskMeter } from './components/RiskMeter';
import { SignalList } from './components/SignalList';
import { RiskMap } from './components/RiskMap';
import { AnalystPerspectives } from './components/AnalystPerspectives';
import { PredictionCard } from './components/PredictionCard';
import { BreakingNews } from './components/BreakingNews';
import { LiveTV } from './components/LiveTV';
import { SpecialIndicators } from './components/SpecialIndicators';
import { cn } from './lib/utils';
import { db, auth } from './firebase';
import { doc, collection, onSnapshot, setDoc, query, orderBy, limit, getDoc, getDocFromServer, getDocs, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, copied: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, copied: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  copyError = () => {
    const errorText = `Error: ${this.state.error?.message}\nStack: ${this.state.error?.stack}`;
    navigator.clipboard.writeText(errorText);
    (this as any).setState({ copied: true });
    setTimeout(() => (this as any).setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center relative overflow-hidden selection:bg-red-500/30" dir="rtl">
          {/* Background Grid Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-radial-[circle_at_center] from-red-500/5 via-transparent to-transparent" />
          
          <div className="max-w-lg w-full space-y-8 relative z-10">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30 rotate-12 animate-pulse">
                <ShieldAlert size={48} className="text-red-500 -rotate-12" />
              </div>
              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-xl uppercase tracking-tighter">
                CRITICAL_FAILURE
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-white tracking-tight">فشل في مزامنة البيانات الاستخباراتية</h1>
                <div className="h-1 w-20 bg-red-600 mx-auto rounded-full" />
              </div>
              <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto">
                واجهت "نواة الاستخبارات" خطأً تقنياً غير متوقع أثناء تحليل تدفقات البيانات الميدانية. تم عزل العطل لضمان سلامة بقية النظام.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
              >
                <RefreshCw size={20} />
                إعادة تشغيل النظام
              </button>
              
              <button 
                onClick={this.copyError}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
              >
                {this.state.copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                {this.state.copied ? "تم النسخ" : "نسخ بيانات الخطأ"}
              </button>
            </div>

            <div className="flex justify-center pt-2">
              <a 
                href="mailto:MajedQur23@gmail.com?subject=Intelligence%20Core%20Error%20Report&body=Error%20Details:%20"
                className="text-[10px] text-zinc-500 hover:text-red-500 transition-colors uppercase tracking-[0.2em] flex items-center gap-2"
              >
                <Mail size={12} />
                أو التبليغ المباشر عبر البريد الإلكتروني
              </a>
            </div>

            <div className="pt-8 border-t border-zinc-900">
              <div className="flex items-center justify-center gap-6 text-zinc-600">
                <div className="flex items-center gap-2">
                  <Terminal size={14} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Error_Code: 0x882X</span>
                </div>
                <div className="flex items-center gap-2">
                  <LifeBuoy size={14} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Status: Isolated</span>
                </div>
              </div>
            </div>

            {((import.meta as any).env.DEV) && (
              <div className="mt-8 text-left">
                <div className="flex items-center gap-2 mb-2 px-4">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Stack Trace (Dev Only)</span>
                </div>
                <pre className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl text-[10px] text-red-400/80 overflow-auto max-h-48 font-mono leading-relaxed shadow-inner">
                  {this.state.error?.stack || this.state.error?.toString()}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const t = {
  title: "استخبارات مخاطر الشرق الأوسط",
  lastUpdate: "آخر مزامنة للنظام",
  analysisSummary: "توليف مخاطر الذكاء الاصطناعي",
  trend: "اتجاه المخاطر",
  confidence: "ثقة الذكاء الاصطناعي",
  probabilistic: "المنطق الاحتمالي",
  disclaimer: "تقييم مخاطر ناتج عن الذكاء الاصطناعي بناءً على تدفقات البيانات في الوقت الفعلي. ليس نصيحة مالية أو استراتيجية. التركيز على استقرار منطقة الشرق الأوسط والأردن. يتم تحليل المصادر الميدانية والتقارير الاستخباراتية المتاحة لتقديم رؤية شاملة.",
  footer: "نواة استخبارات الذكاء الاصطناعي - مركز عمليات الشرق الأوسط",
  rising: "متزايد",
  falling: "متناقص",
  stable: "مستقر",
  signals: "تدفق الاستخبارات الميدانية",
  impact: "التأثير",
  analysts: "وجهات نظر محللي الذكاء الاصطناعي",
  confidenceLabel: "الثقة",
  update: "تحديث التحليل الآن",
  riskMap: "خريطة التهديدات الإقليمية",
  specialIndicators: "مؤشرات التنبؤ الحرجة"
};

const ENABLE_BACKGROUND_AI_REFRESH = import.meta.env.VITE_ENABLE_BACKGROUND_AI_REFRESH === 'true';
const HAS_GEMINI = Boolean(import.meta.env.VITE_GEMINI_API_KEY);
const ENABLE_ADMIN_LOGIN = import.meta.env.VITE_ENABLE_ADMIN_LOGIN === 'true';

// Mock historical data for initial state
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [allSignals, setAllSignals] = useState<RiskSignal[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [lastCollectorRunAt, setLastCollectorRunAt] = useState<Date | null>(null);
  const [collectorSavedCount, setCollectorSavedCount] = useState<number>(0);
  const systemRelativeTime = !relativeTime
    ? ""
    : relativeTime === "الآن"
      ? "تمت الآن"
      : relativeTime;

  const formatRelativeTime = (date: Date | null) => {
    if (!date) return "";
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "الآن";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    return date.toLocaleDateString('ar-EG');
  };

  const collectorRelativeTime = !lastCollectorRunAt
    ? ""
    : formatRelativeTime(lastCollectorRunAt) === "الآن"
      ? "قبل قليل"
      : formatRelativeTime(lastCollectorRunAt);

  useEffect(() => {
    const updateTime = () => setRelativeTime(formatRelativeTime(lastUpdated));
    const timer = setInterval(updateTime, 30000);
    updateTime();
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const [updatingSignals, setUpdatingSignals] = useState(false);
  const [updatingScore, setUpdatingScore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const [lastManualRefresh, setLastManualRefresh] = useState<number>(0);
  const lastManualRefreshRef = useRef<number>(0);
  const REFRESH_COOLDOWN = 30000; // 30 seconds cooldown for manual refresh

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!ENABLE_ADMIN_LOGIN) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      handleApiError(err, "تسجيل الدخول");
    }
  };

  const loadingRef = useRef(loading);
  const updatingSignalsRef = useRef(updatingSignals);
  const updatingScoreRef = useRef(updatingScore);
  const allSignalsRef = useRef<RiskSignal[]>(allSignals);
  const blockedUntilRef = useRef<number>(0); // Global rate limit protection
  const firstLoadRef = useRef<boolean>(true); // Initial load protection

  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { updatingSignalsRef.current = updatingSignals; }, [updatingSignals]);
  useEffect(() => { updatingScoreRef.current = updatingScore; }, [updatingScore]);
  useEffect(() => { allSignalsRef.current = allSignals; }, [allSignals]);

  const handleApiError = useCallback((err: any, context: string) => {
    console.error(`Error ${context}:`, err);
    const errorMsg = err?.message || "";
    const errorString = (errorMsg + " " + JSON.stringify(err)).toLowerCase();
    
    const isQuotaError = 
      errorString.includes("quota") || 
      errorString.includes("limit") || 
      errorString.includes("429") || 
      errorString.includes("resource_exhausted") ||
      errorString.includes("exceeded quota") ||
      errorString.includes("quota_exhausted");

    if (isQuotaError) {
      const waitTime = 60000;
      blockedUntilRef.current = Date.now() + waitTime;
      setCountdown(waitTime / 1000);
      setError("تم تجاوز حد الطلبات المسموح به (Quota Exceeded). سيتم إيقاف الطلبات مؤقتاً.");
    } else if (errorString.includes("api_timeout")) {
      setError("النظام مشغول حالياً. يرجى الانتظار ثوانٍ معدودة...");
    } else {
      setError(`فشل في ${context}. جاري المحاولة لاحقاً...`);
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const fetchData = useCallback(async (isManual = false) => {
    const now = Date.now();
    
    // Global rate limit protection (Requirement 4)
    if (now < blockedUntilRef.current) {
      const remaining = Math.ceil((blockedUntilRef.current - now) / 1000);
      setError(`النظام في وضع التبريد. يرجى الانتظار ${remaining} ثانية.`);
      return;
    }

    // Throttling for manual refresh
    if (isManual && now - lastManualRefreshRef.current < REFRESH_COOLDOWN) {
      setError("يرجى الانتظار 30 ثانية بين طلبات التحديث اليدوي.");
      return;
    }
    
    // Prevent overlapping fetches
    if (loadingRef.current) return;
    
    setLoading(true);
    setProgress(0);
    setError(null);
    
    if (isManual) {
      lastManualRefreshRef.current = now;
      setLastManualRefresh(now);
    }

    const stages = [
      "جاري الاتصال بالأقمار الصناعية...",
      "مسح قنوات تيليجرام العبرية...",
      "تحليل تدفقات الجزيرة والمصادر الإيرانية...",
      "توليف مخاطر الأمن القومي الأردني...",
      "توليد التوقعات الاستراتيجية...",
      "تجهيز التقرير النهائي..."
    ];

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      // Faster initial progress, then slower as it gets higher
      let increment = 0;
      if (currentProgress < 60) {
        increment = Math.random() * 20; // Very fast start
      } else if (currentProgress < 90) {
        increment = Math.random() * 5; // Moderate middle
      } else if (currentProgress < 98) {
        increment = Math.random() * 0.5; // Slow end
      } else {
        increment = Math.random() * 0.05; // Extremely slow crawl to 99.9%
      }
      
      currentProgress += increment;
      
      if (currentProgress >= 99.9) {
        currentProgress = 99.9;
      }
      
      setProgress(Math.floor(currentProgress));
      const stageIndex = Math.min(Math.floor((currentProgress / 100) * stages.length), stages.length - 1);
      setProgressText(stages[stageIndex]);
    }, 250);

    try {
      const data = await analyzeGlobalRisk();
      clearInterval(progressInterval);
      setProgress(100);
      setProgressText("اكتمل التحليل بنجاح");
      
      if (!data) throw new Error("No data received");
      
      const updateTime = new Date();
      const dataToSave = {
        ...data,
        lastUpdated: updateTime.toISOString(),
        signals: [] // Don't store signals in the risk doc, they go to the collection
      };

      // Save to Firestore
      try {
        await setDoc(doc(db, 'system', 'risk'), dataToSave);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'system/risk');
      }

      // Save signals to Firestore collection
      const signalsPromises = data.signals.map(signal => 
        setDoc(doc(db, 'signals', signal.id), signal).catch(err => handleFirestoreError(err, OperationType.WRITE, `signals/${signal.id}`))
      );
      await Promise.all(signalsPromises);
      
      if (isManual) {
        setError("تم تحديث التحليل الاستخباراتي بنجاح.");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err: any) {
      console.error("Error in fetchData:", err);
      clearInterval(progressInterval);
      handleApiError(err, "تحليل المخاطر");
    } finally {
      setLoading(false);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  }, [handleApiError]);

  const refreshSignals = useCallback(async (isManual = false) => {
    const now = Date.now();

    // Global rate limit protection
    if (now < blockedUntilRef.current) return;

    if (isManual && now - lastManualRefreshRef.current < REFRESH_COOLDOWN) {
      setError("يرجى الانتظار 30 ثانية بين طلبات التحديث اليدوي.");
      return;
    }
    
    if (updatingSignalsRef.current || loadingRef.current) return;

    setUpdatingSignals(true);
    if (isManual) {
      lastManualRefreshRef.current = now;
      setLastManualRefresh(now);
    }
    
    try {
      // Use the new granular signal fetching
      const newSignals = await fetchLatestSignals(allSignalsRef.current);
      if (newSignals && newSignals.length > 0) {
        const signalsPromises = newSignals.map(signal => 
          setDoc(doc(db, 'signals', signal.id), signal).catch(err => handleFirestoreError(err, OperationType.WRITE, `signals/${signal.id}`))
        );
        await Promise.all(signalsPromises);
        if (isManual) {
          setError("تم العثور على أخبار جديدة وتحديث الاستخبارات.");
          setTimeout(() => setError(null), 3000);
        }
      } else if (isManual) {
        setError("لا توجد أخبار جديدة حالياً في المصادر الميدانية.");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      handleApiError(err, "تحديث الاستخبارات الميدانية");
    } finally {
      setUpdatingSignals(false);
    }
  }, [handleApiError]);

  const clearSignals = useCallback(async () => {
    if (!user) return;
    
    setUpdatingSignals(true);
    try {
      const signalsColRef = collection(db, 'signals');
      while (true) {
        const q = query(signalsColRef, limit(100));
        const snap = await getDocs(q);

        if (snap.empty) {
          break;
        }

        const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        if (snap.docs.length < 100) {
          break;
        }
      }

      setError("تم مسح كافة الأخبار بنجاح.");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      handleApiError(err, "مسح الأخبار");
    } finally {
      setUpdatingSignals(false);
    }
  }, [user, handleApiError]);

  const refreshScore = useCallback(async (isManual = false) => {
    const now = Date.now();

    // Global rate limit protection
    if (now < blockedUntilRef.current) return;

    if (isManual && now - lastManualRefreshRef.current < REFRESH_COOLDOWN) {
      setError("يرجى الانتظار 30 ثانية بين طلبات التحديث اليدوي.");
      return;
    }

    if (updatingScoreRef.current || loadingRef.current) return;

    setUpdatingScore(true);
    if (isManual) {
      lastManualRefreshRef.current = now;
      setLastManualRefresh(now);
    }

    try {
      // Use the new granular score update
      const scoreUpdate = await updateRiskScore(riskData?.score || 50, riskData?.explanation || "", riskData?.specialIndicators);
      const updateTime = new Date();
      
      // Get current data to merge
      const riskDocRef = doc(db, 'system', 'risk');
      const currentSnap = await getDoc(riskDocRef);
      const currentData = currentSnap.exists() ? currentSnap.data() : {};

      const updatedData = {
        ...currentData,
        ...scoreUpdate,
        lastUpdated: updateTime.toISOString()
      };

      try {
        await setDoc(riskDocRef, updatedData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'system/risk');
      }
    } catch (err) {
      handleApiError(err, "تحديث الدرجة");
    } finally {
      setUpdatingScore(false);
    }
  }, [handleApiError, riskData]);

  const refreshStrategicAnalysis = useCallback(async (isManual = false) => {
    const now = Date.now();
    if (now < blockedUntilRef.current) return;
    if (loadingRef.current) return;

    setLoading(true);
    try {
      const analysis = await fetchStrategicAnalysis();
      const riskDocRef = doc(db, 'system', 'risk');
      const currentSnap = await getDoc(riskDocRef);
      const currentData = currentSnap.exists() ? currentSnap.data() : {};

      const updatedData = {
        ...currentData,
        ...analysis,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(riskDocRef, updatedData);
    } catch (err) {
      handleApiError(err, "التحليل الاستراتيجي");
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  const smartUpdate = useCallback(async () => {
    if (!HAS_GEMINI) {
      setError("التحديث اليدوي بالذكاء الاصطناعي غير مفعّل في النسخة العامة. الأخبار تتحدث تلقائيًا من الخادم.");
      setTimeout(() => setError(null), 4000);
      return;
    }

    // A truly smart update: refresh signals and score, but only do full analysis if needed
    await Promise.all([
      refreshSignals(false),
      refreshScore(false)
    ]);
  }, [refreshSignals, refreshScore]);

  const seedInitialData = useCallback(async () => {
    const riskDocRef = doc(db, 'system', 'risk');
    const snap = await getDoc(riskDocRef);
    const data = snap.exists() ? snap.data() as RiskData : null;
    
    if (!data || !data.specialIndicators || data.specialIndicators.length === 0) {
      const initialData: RiskData = {
        score: data?.score || 50,
        trend: data?.trend || 'stable',
        explanation: data?.explanation || "جاري تهيئة النظام الاستخباراتي وتحميل البيانات الميدانية...",
        specialIndicators: [
          { id: 'energy-risk', label: "احتمالية استهداف منشآت الطاقة بالأردن", probability: 0, status: 'stable', description: "جاري تحليل المخاطر المحيطة بمنشآت الطاقة..." },
          { id: 'ceasefire-risk', label: "احتمالية وقف إطلاق النار", probability: 0, status: 'stable', description: "جاري رصد المفاوضات والتحركات الدبلوماسية..." },
          { id: 'economic-risk', label: "احتمالية حدوث أزمة اقتصادية بالأردن", probability: 0, status: 'stable', description: "جاري تقييم المؤشرات الاقتصادية الكلية..." }
        ],
        analysts: data?.analysts || [],
        signals: data?.signals || [],
        regions: data?.regions || [],
        prediction: data?.prediction || {
          forecast: "جاري تحليل التوقعات الاستراتيجية بناءً على المعطيات الميدانية والجيوسياسية الحالية. يرجى الانتظار...",
          timeframeDays: 7,
          verificationCriteria: "مراقبة التقارير الميدانية وتصريحات المسؤولين.",
          previousAccuracy: "قيد التقييم"
        },
        timestamp: data?.timestamp || new Date().toISOString()
      };
      await setDoc(riskDocRef, initialData);
      setRiskData(initialData);

      if (HAS_GEMINI) {
        await fetchData(false);
      }
    }
  }, [fetchData]);

  useEffect(() => {
    // Test Connection
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'system', 'risk'));
        await seedInitialData();
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setError("خطأ في الاتصال بقاعدة البيانات. يرجى التأكد من الإعدادات.");
        }
      }
    }
    testConnection();

    // Subscribe to Global Risk Data
    const riskDocRef = doc(db, 'system', 'risk');
    const unsubscribeRisk = onSnapshot(riskDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as RiskData & { lastUpdated: string };
        setRiskData(data);
        if (data.lastUpdated) {
          setLastUpdated(new Date(data.lastUpdated));
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'system/risk'));

    // Subscribe to Signals
    const signalsColRef = collection(db, 'signals');
    const signalsQuery = query(signalsColRef, orderBy('timestamp', 'desc'), limit(100));
    const unsubscribeSignals = onSnapshot(signalsQuery, (querySnap) => {
      const signals: RiskSignal[] = [];
      querySnap.forEach((doc) => {
        signals.push(doc.data() as RiskSignal);
      });
      setAllSignals(signals);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'signals'));

    const collectorDocRef = doc(db, 'system', 'collector');
    const unsubscribeCollector = onSnapshot(collectorDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as { lastRunAt?: string; savedCount?: number };
        if (data.lastRunAt) {
          setLastCollectorRunAt(new Date(data.lastRunAt));
        }
        setCollectorSavedCount(typeof data.savedCount === 'number' ? data.savedCount : 0);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'system/collector'));

    return () => {
      unsubscribeRisk();
      unsubscribeSignals();
      unsubscribeCollector();
    };
  }, [handleApiError]);

  useEffect(() => {
    if (!ENABLE_BACKGROUND_AI_REFRESH) {
      return;
    }

    // Optional AI polling. Leave disabled by default so the UI can stay "live"
    // from Firestore updates without spending tokens in the background.
    const newsInterval = setInterval(async () => {
      refreshSignals(false);
    }, 5 * 60 * 1000); 

    // وظيفة التحديث الدوري لمؤشرات لوحة التحكم (كل 10 دقائق)
    const scoreInterval = setInterval(async () => {
      refreshScore(false);
    }, 10 * 60 * 1000);

    // وظيفة التحديث الدوري للتحليل الاستراتيجي (كل ساعة)
    const aiInterval = setInterval(() => {
      refreshStrategicAnalysis(false);
    }, 60 * 60 * 1000); 

    return () => {
      clearInterval(newsInterval);
      clearInterval(scoreInterval);
      clearInterval(aiInterval);
    };
  }, [refreshSignals, refreshScore, refreshStrategicAnalysis]);

  return (
    <div 
      className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-500/30 relative overflow-x-hidden rtl"
      dir="rtl"
    >
      {/* Grid Background */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(#3f3f46 0.5px, transparent 0.5px)`, 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Background Earth Image */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')`,
          }}
        />
        {/* Radial Gradient Overlay for focus */}
        <div className="absolute inset-0 bg-radial-[circle_at_center] from-transparent via-black/60 to-black" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
      </div>

      {/* Loading Overlay - Only show full screen if no data exists */}
      {loading && !riskData && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-radial-[circle_at_center] from-red-500/10 via-transparent to-transparent animate-pulse" />
          <div className="max-w-md w-full space-y-8 text-center relative z-10">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30 animate-spin-slow">
                <ShieldAlert size={48} className="text-red-500" />
              </div>
              <motion.div 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-xl"
              >
                INITIALIZING_CORE
              </motion.div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">جاري تشغيل نواة الاستخبارات</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  <span>{progressText}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                  />
                </div>
              </div>
              <p className="text-zinc-500 text-[10px] leading-relaxed uppercase tracking-[0.2em]">
                يتم الآن مسح المصادر الميدانية وتوليف مخاطر الشرق الأوسط...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Loading Bar - Show when updating existing data */}
      {(loading || updatingSignals || updatingScore) && riskData && (
        <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-zinc-900/50 overflow-hidden">
          <motion.div 
            initial={{ width: "0%", x: "-100%" }}
            animate={{ 
              width: loading ? `${progress}%` : "100%",
              x: (updatingSignals || updatingScore) && !loading ? ["-100%", "100%"] : "0%"
            }}
            transition={{ 
              width: { duration: 0.5 },
              x: (updatingSignals || updatingScore) && !loading ? { duration: 1.5, repeat: Infinity, ease: "linear" } : { duration: 0 }
            }}
            className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"
          />
        </div>
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500/50 backdrop-blur-md"
          >
            <AlertCircle size={18} />
            <span className="text-xs font-black uppercase tracking-widest">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-zinc-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-500 p-1.5 rounded-lg">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">{t.title}</h1>
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 bg-zinc-500/10 border border-zinc-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                مراقب الأردن - Firestore Live
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Status Indicator */}
            <div className={cn(
              "hidden lg:flex items-center gap-2 px-3 py-1 border rounded-full transition-all duration-500",
              countdown > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : 
              (loading || updatingSignals || updatingScore) ? "bg-blue-500/10 border-blue-500/30 text-blue-500" :
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                countdown > 0 ? "bg-amber-500 animate-pulse" : 
                (loading || updatingSignals || updatingScore) ? "bg-blue-500 animate-spin" :
                "bg-emerald-500"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                {countdown > 0 ? `QUOTA_REST: ${countdown}s` : 
                 (loading || updatingSignals || updatingScore) ? "CORE: PROCESSING" : 
                 "CORE: ACTIVE"}
              </span>
            </div>

            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                {t.lastUpdate}: {systemRelativeTime}
              </div>
            )}
            {collectorRelativeTime && (
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                آخر جلب أخبار: {collectorRelativeTime}
                {collectorSavedCount > 0 ? ` • +${collectorSavedCount}` : ""}
              </div>
            )}
            {HAS_GEMINI && (
              <button 
                onClick={() => smartUpdate()}
                disabled={loading || updatingSignals || updatingScore || (Date.now() - lastManualRefresh < REFRESH_COOLDOWN)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-red-900/40 active:scale-95 border border-red-500/50"
              >
                <RefreshCw size={12} className={cn((loading || updatingSignals || updatingScore) && "animate-spin")} />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  تحديث ذكي
                </span>
              </button>
            )}

            {!user ? (
              ENABLE_ADMIN_LOGIN ? (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all text-[9px] font-bold uppercase tracking-widest border border-zinc-700/50"
              >
                <Terminal size={10} />
                Admin
              </button>
              ) : null
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                  {user.displayName?.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {allSignals.length > 0 && (
        <BreakingNews
          signals={allSignals
            .filter((signal) => signal.impact >= 7 || signal.sentiment === 'negative')
            .slice(0, 10)}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Intelligence Briefing */}
          <div className="lg:col-span-5 space-y-6">
            {/* Risk Meter & Synthesis Group */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl space-y-6 shadow-2xl shadow-black/50 relative group">
              <button 
                onClick={() => refreshScore(true)}
                disabled={updatingScore || (Date.now() - lastManualRefresh < REFRESH_COOLDOWN)}
                className="absolute top-4 right-4 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="تحديث التقييم فقط"
              >
                <RefreshCw size={12} className={cn(updatingScore && "animate-spin")} />
              </button>
              <RiskMeter 
                score={riskData?.score || 0} 
                trend={riskData?.trend || 'stable'} 
                loading={updatingScore}
              />
              
              {!riskData && !loading && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                    <ShieldAlert size={24} className="text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 text-xs font-bold">لا توجد بيانات حالية. يرجى الضغط على تحديث ذكي.</p>
                </div>
              )}

              {riskData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="pt-8 border-t border-zinc-800/50 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-500">
                      <ShieldAlert size={14} />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">{t.analysisSummary}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      {relativeTime && (
                        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{systemRelativeTime}</span>
                      )}
                      <span className="text-[8px] text-zinc-600 font-mono">CONFIDENCE: {riskData.score > 70 ? 'HIGH' : 'MODERATE'}</span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-red-500/20 rounded-full" />
                    <p className="text-zinc-200 text-sm leading-relaxed font-bold italic pl-2">
                      "{riskData.explanation}"
                    </p>
                  </div>

                  <div className="flex items-center gap-6 pt-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t.trend}</span>
                      <div className="flex items-center gap-1.5">
                        {riskData.trend === 'rising' ? <TrendingUp size={12} className="text-red-500" /> :
                         riskData.trend === 'falling' ? <TrendingDown size={12} className="text-emerald-500" /> :
                         <Minus size={12} className="text-zinc-500" />}
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-tighter",
                          riskData.trend === 'rising' ? "text-red-500" :
                          riskData.trend === 'falling' ? "text-emerald-500" :
                          "text-zinc-500"
                        )}>
                          {t[riskData.trend as keyof typeof t]}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t.confidence}</span>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">{t.probabilistic}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* AI Analysts - Now more compact and integrated */}
            {riskData && riskData.analysts && (
              <AnalystPerspectives 
                analysts={riskData.analysts} 
                title={t.analysts}
                relativeTime={systemRelativeTime}
              />
            )}

            {riskData && (
              <PredictionCard 
                prediction={riskData.prediction} 
                relativeTime={systemRelativeTime}
              />
            )}

            <SpecialIndicators 
              indicators={riskData?.specialIndicators || []} 
              title={t.specialIndicators} 
              relativeTime={systemRelativeTime}
              onRefresh={HAS_GEMINI ? () => refreshScore(true) : undefined}
              loading={updatingScore}
            />
          </div>

          {/* Right Column: Live Data Streams */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Feed & TV Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {riskData && (
                  <SignalList 
                    signals={allSignals} 
                    title={t.signals} 
                    impactLabel={t.impact} 
                    onRefresh={HAS_GEMINI ? () => refreshSignals(true) : undefined}
                    onClear={clearSignals}
                    isAdmin={!!user}
                    loading={updatingSignals}
                    disabled={Date.now() - lastManualRefresh < REFRESH_COOLDOWN}
                  />
                )}
              </div>
              <div className="space-y-6">
                <LiveTV />
              </div>
            </div>

            {/* Map & Timeline Group */}
            <div className="space-y-6">
              {riskData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <RiskMap 
                  regions={riskData.regions} 
                  title={t.riskMap} 
                  relativeTime={systemRelativeTime}
                />
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <footer className="mt-24 pt-8 border-t border-zinc-900 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] leading-relaxed">
              {t.disclaimer}
            </p>
            <p className="text-[10px] text-zinc-800 font-bold uppercase tracking-widest">
              &copy; 2026 {t.footer}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
