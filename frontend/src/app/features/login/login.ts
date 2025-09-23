import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { AuthService } from '../../services/auth-service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})


export class Login {
  email: string = '';
  password: string = '';
  errorMsg: string = '';

  // Signup form fields
  signupName = '';
  signupEmail = '';
  signupPassword = '';
  signupAllergies = '';
  signupHealthConcerns = '';

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) {

  }



  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['msg'] === 'alreadyLoggedIn') {
        alert("You are already logged In!")
      }
    })
  }

  login() {
    this.authService.login(this.email, this.password)
      .then(() => {
        this.router.navigate(['/home']);
      })
      .catch(err => {
        this.errorMsg = err.message;
      });
  }

  signup() {
    this.authService.signup(this.signupEmail, this.signupPassword, this.signupName)
      .then(() => {
        this.router.navigate(['/preferences']); // after bare account creation
      })
      .catch(err => this.errorMsg = err.message);
  }

  @ViewChild('container') container!: ElementRef;

  toggleSignUp() {
    this.container.nativeElement.classList.add('right-panel-active');
  }

  toggleSignIn() {
    this.container.nativeElement.classList.remove('right-panel-active');
  }
}
