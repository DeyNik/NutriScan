import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product-service';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { AiService } from '../../services/ai-service';
import { productInfo } from '../../core/model/product.model';

interface AiAnalysis {
  score: number; // 0–100%
  color: 'primary' | 'accent' | 'warn';
  nutrients: { name: string; percent: number; levelColor: 'primary' | 'accent' | 'warn' }[];
  dietBadges: { label: string; type: string }[];
  advice: string;
  ingredients: { name: string; type: 'safe' | 'caution' | 'avoid' }[];
  alerts: string[];
  summary: string;
  alternatives?: any[];
}

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scanner.html',
  styleUrls: ['./scanner.scss']
})
export class Scanner implements OnInit, OnDestroy {
  @ViewChild('video', { static: false }) videoElem!: ElementRef<HTMLVideoElement>;
  @ViewChild('aiAnalysisSection') aiAnalysisSection!: ElementRef;

  barcode: string | null = null;
  product: any = null;
  aiAnalysis: AiAnalysis | null = null;
  scanning = false;
  notfound = false;
  aiLoading = false;
  capturedFrame: string | null = null;
  isVideoActive = true;
  newScan = true;
  private subscriptions: Subscription[] = [];

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private ngZone: NgZone,
    private aiService: AiService
  ) { }

  ngAfterViewInit(): void {
    // Start camera after view renders
    if (this.isVideoActive) {
      this.startCamera();
    }
  }

  ngOnInit(): void {
    this.startCamera();
  }

  ngOnDestroy(): void {
    // Stop camera
    if (this.videoElem.nativeElement.srcObject) {
      (this.videoElem.nativeElement.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  startCamera(): void {
    if (!this.videoElem) return;  // element might not exist yet
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (this.videoElem && this.videoElem.nativeElement) {
          this.videoElem.nativeElement.srcObject = stream;
        }
      })
      .catch(err => console.error('Camera error', err));
  }

  captureFrameAndScan(): void {
    this.scanning = true;
    this.barcode = null;
    this.product = null;
    this.aiAnalysis = null;
    this.notfound = false;

    const video = this.videoElem.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedFrame = canvas.toDataURL('image/jpeg');
    this.isVideoActive = false;

    canvas.toBlob(blob => {
      if (!blob) return;

      const sub = this.productService.scanBarcode(blob).subscribe(res => {
        if (res.barcodes?.length > 0) {
          this.barcode = res.barcodes[0];

          const prodSub = this.productService.getProduct(this.barcode).subscribe(prod => {
            this.ngZone.run(() => {
              this.product = prod?.product || null;
              this.scanning = false;

              if (this.product) {
                this.analyzeProduct();
              } else {
                this.notfound = true;
              }
            });
          }, () => {
            this.scanning = false;
            this.notfound = true;
          });

          this.subscriptions.push(prodSub);
        } else {
          this.ngZone.run(() => {
            this.scanning = false;
            this.notfound = true;
          });
        }
      });

      this.subscriptions.push(sub);
    }, 'image/jpeg');
  }

  resetScan(): void {
    this.barcode = null;
    this.product = null;
    this.aiAnalysis = null;
    this.scanning = false;
    this.notfound = false;
    this.isVideoActive = true;
    this.capturedFrame = null;

    setTimeout(() => this.startCamera(), 0);
  }


  analyzeProduct(): void {

    const user = this.authService.user$.value;
    const payload: productInfo = {
      product: this.product,
      userPreferences: user?.preferences || {}
    };

    this.aiLoading = true;
    this.aiService.analyzeProduct(payload)
      .then(result => {
        this.ngZone.run(() => {
          this.aiAnalysis = result;

          if (!this.aiAnalysis?.nutrients || this.aiAnalysis.nutrients.every(n => n.percent === null)) {
            if (this.product.nutrient_levels) {
              this.aiAnalysis.nutrients = this.mapNutrientLevels(this.product.nutrient_levels);
            }
          }

          this.aiLoading = false;
        });
      })
      .catch(err => {
        console.error('AI analysis failed', err);
        this.aiLoading = false;
      });
  }

  private mapNutrientLevels(nutrientLevels: any) {
    const mapping: any = {
      high: { percent: 80, levelColor: 'warn' },
      moderate: { percent: 50, levelColor: 'accent' },
      low: { percent: 20, levelColor: 'primary' }
    };

    return Object.keys(nutrientLevels).map(key => {
      const level = nutrientLevels[key];
      return {
        name: key,
        percent: mapping[level]?.percent ?? null,
        levelColor: mapping[level]?.levelColor ?? 'primary'
      };
    });
  }

  viewDetails() {
    if (this.aiAnalysisSection) {
      this.aiAnalysisSection.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

}
