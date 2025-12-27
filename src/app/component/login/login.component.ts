import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { checkIfLoggedIn, clearSessionState, login, saveSessionState } from 'src/app/helpers/base_request';
import { isMobile, openFullScreen } from 'src/app/helpers/general';
import { GroupService } from 'src/app/service/group.service';
import { TranslateService } from 'src/app/service/translate.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  inputType = "password";
  passcode = "";
  invalidPasswordMessage = "";
  isLoading = false;

  constructor(
    public intl: TranslateService,
    private groupService: GroupService,
    private router: Router
  ){
    if(checkIfLoggedIn())
      this.router.navigate(["/settings"]);
  }

  toggleInput(event: Event){
    event.preventDefault();
    this.inputType = this.inputType === "password" ? "text" : "password";
  }

  async loginAttempt(){
    this.isLoading = true;
    
    let res = await login(this.passcode);

    if (res?.error === "api_unavailable"){
      this.invalidPasswordMessage = this.intl.translate("api_unavailable");
      clearSessionState();
    }
    else if (res?.error === "wrong_password"){
      this.invalidPasswordMessage = this.intl.translate("invalid_password");
      clearSessionState();
    }
    else if (!res?.groupID){
      this.invalidPasswordMessage = this.intl.translate("api_unavailable");
      clearSessionState();
    }
    else{
      this.invalidPasswordMessage = this.intl.translate("success_password");
      saveSessionState(res.groupID);
      if (await this.groupService.init()){
        this.router.navigate(['/settings']);
      }else {
        clearSessionState();
      }
    }

    this.isLoading = false;
  }
}
