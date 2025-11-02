import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  onSnapshot,
  DocumentReference,
  DocumentData,
} from '@angular/fire/firestore';
import { AppUser } from '../core/model/user.model';


@Injectable({ providedIn: 'root' })
export class AuthService {
  // Observable for the current user
  user$ = new BehaviorSubject<AppUser | null>(null);

  constructor(private auth: Auth, private db: Firestore) {
    onAuthStateChanged(this.auth, async (user: User | null) => {
      console.log('🔥 Auth State Changed → user:', user);

      if (user) {
        const ref: DocumentReference<DocumentData> = doc(
          this.db,
          `users/${user.uid}`
        );

        // Listen in real-time to Firestore user document
        onSnapshot(ref, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Partial<AppUser>;

            const userData: AppUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              onboardingComplete: data.onboardingComplete ?? false,
              preferences: data.preferences,
              createdAt: data.createdAt
                ? new Date((data.createdAt as any).seconds * 1000)
                : undefined,
              updatedAt: data.updatedAt
                ? new Date((data.updatedAt as any).seconds * 1000)
                : undefined,
            };

            this.user$.next(userData);
          } else {
            // No Firestore profile yet → fallback to bare Auth user
            const authUser: AppUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              onboardingComplete: false,
            };
            this.user$.next(authUser);
          }
        });
      } else {
        this.user$.next(null);
      }
    });
  }

  // Login
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
signup(email: string, password: string, name: string) {
  return createUserWithEmailAndPassword(this.auth, email, password).then(
    async (cred) => {
      // Update Auth profile with displayName
      await updateProfile(cred.user, { displayName: name });

      // Also save in Firestore
      const ref = doc(this.db, `users/${cred.user.uid}`);
      return setDoc(ref, {
        displayName: name,      // Firestore
        uid: cred.user.uid,
        email,
        onboardingComplete: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  );
}

  // Reset password
  resetPassword(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  // Logout
  logout() {
    return signOut(this.auth).then(() => {
      this.user$.next(null); // clear local state
      console.log('User signed out');
    });
  }
}
