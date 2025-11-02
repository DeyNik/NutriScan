import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AiAnalysis, ProductState, ProductStateService } from '../../services/product-state-service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-details',
  imports: [CommonModule],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss'
})
export class ProductDetails {
  product: any = null;
  barcode: string | null = null;
  aiAnalysis: AiAnalysis | null = null;
  aiLoading = false;
  capturedFrame: string | null = null;

  private stateSubscription?: Subscription;

  constructor(
    private router: Router,
    private productStateService: ProductStateService
  ) { }

  ngOnInit() {
    // Subscribe to product state changes
    this.stateSubscription = this.productStateService.productState$.subscribe(
      (state: ProductState | null) => {
        if (!state || !state.product) {
          // No product data, redirect to scanner
          console.log("no data");

          this.router.navigate(['/scan']);
          return;
        }

        // Update component properties from state
        this.product = state.product;
        this.barcode = state.barcode;
        this.capturedFrame = state.capturedFrame;

        // Check if AI analysis is available
        if (state.aiAnalysis) {
          this.aiAnalysis = state.aiAnalysis;
          this.aiLoading = false;
        } else {
          // AI analysis is still loading
          this.aiLoading = true;
        }
      }
    );

    // Also check current state immediately (in case observable hasn't fired yet)
    const currentState = this.productStateService.getCurrentState();
    if (!currentState || !currentState.product) {
      this.router.navigate(['/scan']);
    }
  }

  ngOnDestroy() {
    if (this.stateSubscription) {
      this.stateSubscription.unsubscribe();
    }
  }

  scanAnother() {
    // Clear state and navigate back to scanner
    this.productStateService.clearState();
    this.router.navigate(['/scan']);
  }

  // Helper method to get safe image URL
  getProductImage(): string {
    return this.product?.image_front_url ||
      this.aiAnalysis?.productMeta?.image ||
      this.capturedFrame ||
      'assets/placeholder.png';
  }

  // Helper method to check if we have nutrient data
  hasNutrients(): boolean {
    return this.aiAnalysis?.nutrients && this.aiAnalysis.nutrients.length > 0;
  }

  // Helper method to check if we have additives
  hasAdditives(): boolean {
    return this.aiAnalysis?.additives && this.aiAnalysis.additives.length > 0;
  }

  // Helper method to check if we have allergens
  hasAllergens(): boolean {
    return !!(this.product?.allergens_from_ingredients ||
      (this.product?.allergens_tags && this.product.allergens_tags.length > 0));
  }

  // Helper method to get allergen text
  getAllergenText(): string {
    return this.product?.allergens_from_ingredients ||
      this.product?.allergens_tags?.join(', ') ||
      '';
  }

  // Helper method to check if we have alerts
  hasAlerts(): boolean {
    return this.aiAnalysis?.alerts && this.aiAnalysis.alerts.length > 0;
  }

  // Helper method to check if we have alternatives
  hasAlternatives(): boolean {
    return this.aiAnalysis?.alternatives && this.aiAnalysis.alternatives.length > 0;
  }

  hasHomeAlternatives(): boolean {
    return this.aiAnalysis?.homemadeAlternatives && this.aiAnalysis.homemadeAlternatives.length > 0;
  }

  hasVideos(): boolean {
    return this.aiAnalysis?.videos && this.aiAnalysis.videos.length > 0;
  }

  getYoutubeThumbnail(videoUrl: string): string {
    const match = videoUrl?.match(/v=([^&]+)/);
    const videoId = match ? match[1] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'assets/food-placeholder.jpg';
  }

  openVideo(videoUrl: string): void {
    window.open(videoUrl, '_blank');
  }


  // Helper method to get score color class
  getScoreColorClass(): string {
    if (!this.aiAnalysis) return 'bg-secondary';

    switch (this.aiAnalysis.color) {
      case 'primary': return 'bg-success';
      case 'accent': return 'bg-warning text-dark';
      case 'warn': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
