import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { AiAnalysis, productInfo } from '../core/model/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private API_URL = 'https://world.openfoodfacts.org/api/v0/product';

  constructor(private http: HttpClient) { }

  // This is the main function that gets product data based on a barcode
  getProduct(barcode: string): Observable<any> {
    // Use a pipe to handle the API call and potential errors
    return this.http.get(`${this.API_URL}/${barcode}.json`).pipe(
      // Catch any HTTP errors (like a 404 Not Found)
      catchError(error => {
        // Check if the error is a 404
        if (error.status === 404 && barcode.length === 13) {
          // If it's a 13-digit barcode, try again with the first digit truncated
          const truncatedBarcode = barcode.substring(1);
          console.log(`Product not found for ${barcode}. Retrying with truncated barcode: ${truncatedBarcode}`);
          // Recursively call getProduct with the truncated barcode
          return this.getProduct(truncatedBarcode);
        }
        // If the error is not a 404 or the barcode is not 13 digits, re-throw the error
        return throwError(() => new Error('Product not found or other API error'));
      })
    );
  }

  private API_URL_PY = 'http://localhost:8000'; // Python backend


  scanBarcode(imageData: Blob): Observable<any> {
    const formData = new FormData();
    formData.append('file', imageData, 'frame.jpg');
    return this.http.post(this.API_URL_PY +'/scan/', formData);
  }

  // analyzeProduct(productInfo: productInfo):Observable<AiAnalysis>{
  //       return this.http.post<AiAnalysis>(this.API_URL_PY +'/analyze/', productInfo);
  // }
  
}
