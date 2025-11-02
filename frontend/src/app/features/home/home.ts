import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-home',
  imports: [RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
    constructor(private router: Router, private authService:AuthService) { }
  ngOnInit(){
    this.authService.user$.subscribe(user => {
    if (user) {
      console.log('Current user from Firestore:', user);
      if (user.preferences) {
        console.log('Preferences:', user.preferences);
      }
    }
  });
  }
  showScanner() {
    this.router.navigate(['/scan']);
  }
}
