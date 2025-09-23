import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppUser } from '../../core/model/user.model';


@Component({
    selector: 'app-preferences',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './preferences.html',
    styleUrls: ['./preferences.scss']
})
export class Preferences {
    diet = '';
    allergies: string[] = [];
    healthConcerns: string[] = [];
    showError: boolean = false;

    customAllergy = '';
    customHealthConcern = '';

    diets = ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Gluten-free', 'Dairy-free'];
    allergyOptions = ['Peanuts', 'Tree nuts', 'Gluten', 'Dairy', 'Soy', 'Eggs', 'Shellfish'];
    healthOptions = ['Hypertension', 'Diabetes', 'High cholesterol', 'Weight loss', 'Athletic performance'];

    constructor(private authService: AuthService, private db: Firestore, private router: Router) { }

    ngOnInit() {
        this.authService.user$.subscribe((user: AppUser | null) => {
            if (!user) return;

            // Pre-fill fields if preferences exist
            if (user.preferences) {
                this.diet = user.preferences.diet;
                this.allergies = [...user.preferences.allergies];
                this.healthConcerns = [...user.preferences.healthConcerns];
            }
        });
    }

    addCustom(list: string[], value: string, type: 'allergy' | 'health') {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return;

    // Remove placeholder in-place
    if (type === 'allergy') {
        const noneIndex = list.indexOf('None');
        if (noneIndex > -1) list.splice(noneIndex, 1);
        const noneOptIndex = this.allergyOptions.indexOf('None');
        if (noneOptIndex > -1) this.allergyOptions.splice(noneOptIndex, 1);
    } else if (type === 'health') {
        const naIndex = list.indexOf('N/A');
        if (naIndex > -1) list.splice(naIndex, 1);
        const naOptIndex = this.healthOptions.indexOf('N/A');
        if (naOptIndex > -1) this.healthOptions.splice(naOptIndex, 1);
    }

    // Add the new custom value
    list.push(trimmed);

    // Add to options if not already present
    if (type === 'allergy' && !this.allergyOptions.includes(trimmed)) {
        this.allergyOptions.push(trimmed);
    }
    if (type === 'health' && !this.healthOptions.includes(trimmed)) {
        this.healthOptions.push(trimmed);
    }

    // Reset input
    if (type === 'allergy') this.customAllergy = '';
    if (type === 'health') this.customHealthConcern = '';
}


    toggleSelection(list: string[], item: string) {
        if (list.includes(item)) {
            list.splice(list.indexOf(item), 1);
        } else {
            list.push(item);
        }
    }

    async savePreferences() {
        const user = this.authService.user$.value;
        if (!user) return;

        // ❌ Block saving if no diet selected
        if (!this.diet) {
            this.showError = true;
            return;
        }

        const ref = doc(this.db, `users/${user.uid}`);
        await setDoc(
            ref,
            {
                preferences: {
                    diet: this.diet, // ✅ always required
                    allergies: this.allergies.length ? this.allergies : [],
                    healthConcerns: this.healthConcerns.length ? this.healthConcerns : [],
                },
                onboardingComplete: true,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        this.router.navigate(['/home']);
    }


}
