// product-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ProductState {
  product: any;
  barcode: string | null;
  aiAnalysis: AiAnalysis | null;
  capturedFrame: string | null;
}

// Updated AiAnalysis interface

export interface AiAnalysis {
  score: number;
  color: 'primary' | 'accent' | 'warn';
  nutrients: {
    name: string;
    percent: number | null;
    levelColor: 'primary' | 'accent' | 'warn';
  }[];
  productMeta?: {
    name: string;
    brand?: string;
    image?: string;
    nutriScore?: string;
    novaGroup?: number;
    ecoScore?: string;
    category?: string;
  };
  dietBadges?: {
    label: string;
    type: 'vegan' | 'vegetarian' | 'gluten-free' | 'keto' | 'low-carb' | string;
  }[];
  advice?: string;
  ingredients?: {
    name: string;
    type: 'safe' | 'caution' | 'avoid';
    reason?: string;
  }[];
  additives?: {
    code: string;
    name?: string;
    purpose?: string;
    riskLevel?: 'low' | 'moderate' | 'high';
    notes?: string;
  }[];
  alerts?: string[];
  summary?: string;
  alternatives?: {
    name: string;
    brand?: string;
    image?: string;
    price?: string;
    rating?: number | string;
    reason?: string;
    url?: string;
  }[];
  homemadeAlternatives?: {
    name: string;
    description?: string;
    videos: Array<{  // Changed from single video to videos array
      title: string;
      videoId: string;
      channelTitle: string;
      thumbnail: string;
      url: string;
    }>;
  }[];
  videos?: {
    title: string;
    channel: string;
    thumbnail: string;
    url: string;
  }[];
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductStateService {
  private productStateSubject = new BehaviorSubject<ProductState | null>(null);
  public productState$: Observable<ProductState | null> = this.productStateSubject.asObservable();

  constructor() { }

  /**
   * Set the current product state (called from scanner after AI analysis)
   */
  setProductState(state: ProductState): void {
    this.productStateSubject.next(state);
  }

  /**
   * Get the current product state value
   */
  getCurrentState(): ProductState | null {
    return this.productStateSubject.value;
  }

  /**
   * Clear the product state (useful for cleanup)
   */
  clearState(): void {
    this.productStateSubject.next(null);
  }

  /**
   * Update AI analysis after it's loaded
   */
  updateAiAnalysis(aiAnalysis: AiAnalysis): void {
    const currentState = this.productStateSubject.value;
    if (currentState) {
      this.productStateSubject.next({
        ...currentState,
        aiAnalysis
      });
    }
  }
}