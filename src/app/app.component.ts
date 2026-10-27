import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GroupService } from './service/group.service';
import { emptyGroup } from './interface/group';
import { TranslateService } from './service/translate.service';
import { checkIfLoggedIn } from './helpers/base_request';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'mySmallGroup';

  constructor(private intl: TranslateService, private groups: GroupService, private router: Router, private dialog: MatDialog){}

  @HostListener('window:session-expired')
  sessionExpired(){
    this.groups.group = structuredClone(emptyGroup);
    this.dialog.closeAll();
    this.router.navigate(['/']);
  }

  

  checkIfLoggedIn(){
    return checkIfLoggedIn();
  }
}
