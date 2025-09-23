import { Component, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth-service';
import { User } from './features/user/user';
import { filter } from 'rxjs';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  isLoggedIn = false;

  protected readonly title = signal('nutriScan');

  constructor(private dialog: MatDialog, private authService: AuthService, private router: Router, private auth: Auth) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const fragment = this.router.parseUrl(this.router.url).fragment;
        if (fragment) {
          const el = document.getElementById(fragment);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
  }


  ngOnInit() {
    onAuthStateChanged(this.auth, (user: any | null) => {
      this.isLoggedIn = !!user;
    });
    // Reset activeFragment when route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.activeFragment = null;
      });
  }

  activeFragment: string = '';

  setActive(fragment: string) {
    this.activeFragment = fragment;
  }

  openUserDialog() {
    this.dialog.open(User, {
      width: '500px',
    });
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }

  navigateToSection() {
    this.router.navigate(['/home'], { fragment: 'trust' });
  }
}
