import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AppUser } from '../../core/model/user.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, CommonModule, AsyncPipe],
  template: `
    <div class="profile-dialog">
      <!-- Close button -->
      <button class="close-btn" mat-dialog-close aria-label="Close">✕</button>

      <!-- Heading -->
      <h2>User Profile</h2>

      <!-- Profile Content -->
      <div class="profile-content" *ngIf="user$ | async as user; else loading">
        <p><strong>Name:</strong> {{ user.displayName || 'N/A' }}</p>
        <p><strong>Email:</strong> {{ user.email }}</p>

        <div *ngIf="user.preferences">
          <p><strong>Diet:</strong></p>
          <span class="chip">{{ user.preferences.diet }}</span>

          <p *ngIf="user.preferences.allergies?.length"><strong>Allergies:</strong></p>
          <ng-container *ngFor="let a of user.preferences.allergies">
            <span class="chip">{{ a }}</span>
          </ng-container>

          <p *ngIf="user.preferences.healthConcerns?.length"><strong>Health Concerns:</strong></p>
          <ng-container *ngFor="let h of user.preferences.healthConcerns">
            <span class="chip">{{ h }}</span>
          </ng-container>
          
        </div>
      </div>

      <ng-template #loading>
        <p class="loading-text">Loading user details...</p>
      </ng-template>

      <!-- Actions -->
      <div class="actions">
        <button mat-stroked-button color="success" (click)="editPreferences()">
          Edit Preferences
        </button>
      </div>
    </div>
  `,
  styles: [`
    .profile-dialog {
      position: relative;
      padding: 40px 36px;
      background: white;//#e8f5e9; 
      //border-radius: 20px;
      min-width: 500px;
      max-width: 650px;
      font-family: 'Verdana', sans-serif;
      box-shadow: 0 16px 40px rgba(46, 125, 50, 0.25);
      text-align: left;
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      font-size: 1.6rem;
      background: none;
      border: none;
      cursor: pointer;
      color: #2e7d32;
      transition: color 0.2s;
    }
    .close-btn:hover {
      color: #1b5e20;
    }

    h2 {
      margin: 0 0 28px;
      text-align: center;
      color: #1b5e20;
      font-weight: bold;
      font-size: 2.2rem;
    }

    .profile-content p {
      margin: 12px 0 6px;
      font-size: 1.1rem;
      color: #2e7d32;
    }

    .chip {
      display: inline-block;
      padding: 6px 12px;
      margin: 4px 4px 4px 0;
      border-radius: 16px;
      background-color: #a5d6a7;
      color: #1b5e20;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .loading-text {
      text-align: center;
      font-style: italic;
      color: #388e3c;
    }

    .actions {
      text-align: center;
      margin-top: 32px;
    }

    .actions button {
      border-radius: 50px;
      font-weight: 600;
      padding: 10px 36px;
      font-size: 1rem;
      transition: background 0.2s, transform 0.2s;
    }
    .actions button:hover {
      background: #1b5e20;
      color: #fff;
      transform: translateY(-2px);
    }
  `]
})
export class User {
  user$: Observable<AppUser | null>;

  constructor(private authService: AuthService, private router: Router,   private dialogRef: MatDialogRef<User>) {
    this.user$ = this.authService.user$;
  }

  editPreferences() {
      this.dialogRef.close();
    // Navigate to the Preferences page so user can edit
    this.router.navigate(['/preferences']);
  }
}
