export interface productInfo{
    product: any,
    userPreferences: any
}

export interface AiAnalysis {
  score: number;
  color: 'primary' | 'accent' | 'warn';   // <-- allow these strings
  nutrients: { name: string; percent: number; levelColor: 'green' | 'orange' | 'red' }[];
  dietBadges: { label: string; type: 'ok' | 'warn' | 'avoid' }[];
  ingredients: { name: string; type: 'safe' | 'caution' | 'avoid' }[];
  alerts: string[];
  summary: string;
  alternatives?: any[];
}