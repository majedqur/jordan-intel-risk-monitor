export interface RiskSignal {
  id: string;
  source: string;
  headline: string;
  summary: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  impact: number; // 0-10
  credibility: number; // 0-100
  timestamp: string;
  collectedAt?: string;
  url?: string;
}

export interface AIAnalystPerspective {
  id: string;
  persona: string;
  opinion: string;
  confidence: number; // 0-100
}

export interface RiskPrediction {
  forecast: string;
  timeframeDays: number;
  verificationCriteria: string;
  previousAccuracy?: string;
}

export interface RegionRisk {
  id: string;
  name: string;
  riskLevel: number; // 0-100
  status: 'critical' | 'high' | 'moderate' | 'stable';
  description: string;
}

export interface SpecialIndicator {
  id: string;
  label: string;
  probability: number; // 0-100
  status: 'critical' | 'high' | 'moderate' | 'stable';
  description: string;
}

export interface RiskData {
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  explanation: string;
  signals: RiskSignal[];
  analysts: AIAnalystPerspective[];
  prediction: RiskPrediction;
  regions: RegionRisk[];
  specialIndicators: SpecialIndicator[];
  timestamp: string;
}
