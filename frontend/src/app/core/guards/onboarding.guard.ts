import { Injectable } from "@angular/core";
import { Auth } from "@angular/fire/auth";
import { Firestore, doc, getDoc } from "@angular/fire/firestore";
import { Router } from "@angular/router";
import { onAuthStateChanged } from "firebase/auth";


@Injectable({ providedIn: 'root' })
export class OnboardingGuard {
  constructor(private auth: Auth, private db: Firestore, private router: Router) {}

  canActivate(): Promise<boolean> {
    return new Promise((resolve) => {
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          const userRef = doc(this.db, `users/${user.uid}`);
          const snapshot = await getDoc(userRef);

          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data['onboardingComplete']) {
              resolve(true); // ✅ onboarding done → go home
            } else {
              this.router.navigate(['/preferences']);
              resolve(false); // 🚧 redirect if onboarding incomplete
            }
          } else {
            this.router.navigate(['/login']);
            resolve(false);
          }
        } else {
          this.router.navigate(['/login']);
          resolve(false);
        }
      });
    });
  }
}
