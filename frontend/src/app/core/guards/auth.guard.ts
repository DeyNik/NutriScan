import { Injectable } from "@angular/core";
import { Auth } from "@angular/fire/auth";
import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from "@angular/router";
import { onAuthStateChanged } from "firebase/auth";

@Injectable({providedIn: 'root'})

export class AuthGuard implements CanActivate{
    constructor(private auth:Auth, private router:Router){}

    canActivate(): Promise<boolean> {
        return new Promise((resolve)=>{
            onAuthStateChanged(this.auth, (user)=>{
                if(user){
                    resolve(true);
                }else{
                    this.router.navigate(['/login']);
                    resolve(false);
                }
            })
        })   
    }
}