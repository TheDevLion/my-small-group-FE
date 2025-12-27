import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { checkIfLoggedIn } from '../helpers/base_request';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    if (checkIfLoggedIn())
      return true;

    this.router.navigate(['/']);
    return false;
  }
}
