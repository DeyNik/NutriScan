import { RouterModule, Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Home } from './features/home/home';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';
import { NgModule } from '@angular/core';
import { Preferences } from './features/preferences/preferences';
import { OnboardingGuard } from './core/guards/onboarding.guard';
import { Scanner } from './features/scanner/scanner';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [LoginGuard] },
  { path: 'preferences', component: Preferences, canActivate: [AuthGuard] }, 
  { path: 'home', component: Home, canActivate: [OnboardingGuard] },
  {path: 'scan', component: Scanner, canActivate: [OnboardingGuard]},
  { path: '**', redirectTo: 'home' }
];


@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled',      
      scrollOffset: [0, 64],          
      //scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}