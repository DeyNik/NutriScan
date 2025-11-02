import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product-service';
import { forkJoin, from, Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { AiService } from '../../services/ai-service';
import { productInfo } from '../../core/model/product.model';
import { OpenFoodFactsProduct } from '../../core/model/foodProduct.model';
import { Router } from '@angular/router';
import { AiAnalysis, ProductStateService } from '../../services/product-state-service';

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
  product: OpenFoodFactsProduct = null;
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
    private productStateService: ProductStateService,
    private authService: AuthService,
    private ngZone: NgZone,
    private aiService: AiService,
    private router: Router
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
    try {
      const videoEl = this.videoElem?.nativeElement;
      if (videoEl?.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoEl.srcObject = null;
      }
    } catch (err) {
      console.warn('Camera cleanup failed gracefully:', err);
    }

    // Clean up subscriptions safely
    if (this.subscriptions?.length) {
      this.subscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.warn('Subscription cleanup failed:', e);
        }
      });
    }
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
                // Store initial state (without AI analysis yet)
                this.productStateService.setProductState({
                  product: this.product,
                  barcode: this.barcode,
                  aiAnalysis: null,
                  capturedFrame: this.capturedFrame
                });

                // Start AI analysis in background
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

  analyzeProduct(): void {
    const user = this.authService.user$.value;
    const payload = {
      product: this.product,
      userPreferences: user?.preferences || {}
    };

    this.aiLoading = true;

    forkJoin({
      analysis: from(this.aiService.analyzeProduct(payload)),
      recommendations: from(this.aiService.recommendProducts(payload))
    })
      .subscribe({
        next: ({ analysis, recommendations }) => {
          this.ngZone.run(() => {
            // Merge both analysis and recommendation results safely
            this.aiAnalysis = {
              ...analysis,
              alternatives: [
                ...(analysis.alternatives || []),
                ...(recommendations?.recommendations || [])
              ],
              videos: [
                ...(analysis.videos || []),
                ...(recommendations?.videos || [])
              ]
            };

            // Persist the merged result to the product state
            this.productStateService.updateAiAnalysis(this.aiAnalysis);
          });
        },
        error: (err) => {
          console.error('AI processing error', err);
          this.aiLoading = false;
        },
        complete: () => {
          this.aiLoading = false;
        }
      });
  }

  viewDetails(): void {
    // Navigate to details page
    // The ProductDetailsComponent will get data from the service
    this.router.navigate(['/product-details']);
  }

  resetScan(): void {
    this.barcode = null;
    this.product = null;
    this.aiAnalysis = null;
    this.scanning = false;
    this.notfound = false;
    this.isVideoActive = true;
    this.capturedFrame = null;

    // Clear state service
    this.productStateService.clearState();

    setTimeout(() => this.startCamera(), 0);
  }


  // viewDetails() {
  //   if (this.aiAnalysisSection) {
  //     this.aiAnalysisSection.nativeElement.scrollIntoView({
  //       behavior: 'smooth',
  //       block: 'start'
  //     });
  //   }
  // }

  //  viewDetails() {
  //   // Store product data in a service or pass via router state
  //   this.router.navigate(['/product-details'], { 
  //     state: { 
  //       product: this.product,
  //       barcode: this.barcode 
  //     } 
  //   });
  // }

}
