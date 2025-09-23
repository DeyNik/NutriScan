export interface Preferences {
  diet: string;
  allergies: string[];
  healthConcerns: string[];
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  onboardingComplete: boolean;
  preferences?: Preferences;
  createdAt?: Date;
  updatedAt?: Date;
}
