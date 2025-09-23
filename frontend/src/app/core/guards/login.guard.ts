import { Injectable } from "@angular/core";
import { Auth } from "@angular/fire/auth";
import { CanActivate, Router } from "@angular/router";
import { onAuthStateChanged } from "firebase/auth";


@Injectable({providedIn:'root'})

export class LoginGuard implements CanActivate{
    constructor(private auth:Auth, private router:Router){}

    canActivate():Promise<boolean>{
        return new Promise((resolve)=>{
            onAuthStateChanged(this.auth, (user)=>{
                if(user){
                    this.router.navigate(['/home'],{queryParams:{msg:'alreadyLoggedIn'}});
                    resolve(false);
                }else{
                    resolve(true);
                }
            });
        });
    }
}