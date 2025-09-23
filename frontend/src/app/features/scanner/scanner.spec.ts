import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { CommonModule, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-scanner',
  imports: [JsonPipe, CommonModule],
  templateUrl: './scanner.html',
  styleUrl: './scanner.scss'
})
export class Scanner implements OnInit, OnDestroy {
  @ViewChild('video', { static: true }) videoElem!: ElementRef;
  barcode: string | null = null;
  product: any;
  scanning = false;

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    if (this.videoElem.nativeElement.srcObject) {
      (this.videoElem.nativeElement.srcObject as MediaStream)
        .getTracks()
        .forEach(track => track.stop());
    }
  }

  startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => this.videoElem.nativeElement.srcObject = stream)
      .catch(err => console.error('Camera error', err));
  }

  captureFrameAndScan() {
    this.scanning = true; // show loader

    const video: HTMLVideoElement = this.videoElem.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        if (blob) {
          this.productService.scanBarcode(blob).subscribe(res => {
            if (res.barcodes && res.barcodes.length > 0) {
              this.barcode = res.barcodes[0];
              this.productService.getProduct(this.barcode).subscribe(prod => {
                this.product = prod;
                this.scanning = false;
              });
            } else {
              this.resetScan();
              alert('No barcode detected');
            }
          });
        }
      }, 'image/jpeg');
    }
  }

  viewDetails() {
    console.log('Viewing details for', this.product);
  }

  resetScan() {
    this.barcode = null;
    this.product = null;
    this.scanning = false;
  }
}
