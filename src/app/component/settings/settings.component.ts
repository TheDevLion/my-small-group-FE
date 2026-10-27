import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SMALL_GROUP_LOADED } from 'src/app/events';
import { checkIfLoggedIn, logout } from 'src/app/helpers/base_request';
import { emptyGroup, group } from 'src/app/interface/group';
import { GroupService } from 'src/app/service/group.service';
import { HubService } from 'src/app/service/hub.service';
import { TranslateService } from 'src/app/service/translate.service';

@Component({
  standalone: false,
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  @ViewChild("editTitleInput") editTitleInput: any;
  @ViewChild("editTemplateInput") editTemplateInput: any;
  
  group: group = emptyGroup;
  newGroupTitle = "";
  isUpdatingTitle = false;
  isSavingAll = false;

  constructor(private router: Router, 
    private groupService: GroupService, public intl: TranslateService, private hub: HubService
    ){
    if (!checkIfLoggedIn())
      this.router.navigate(["/"]);
    
    this.getGroup();
  }

  async getGroup(){
    if (await this.groupService.init()){
      this.group = structuredClone(this.groupService.group);
      this.newGroupTitle = this.group.name;
    }
  }

  async logout(){
    this.groupService.group = emptyGroup;
    await logout();
    this.router.navigate(["/"]);
  }

  changeLanguage(lang: string){
    this.intl.changeLanguage(lang);
  }

  // Small Group Title
  
  handleSmallGroupTitleTyping(event: KeyboardEvent){
    if (event.key === "Enter")
      this.updateSmallGroupTitle();
  }  
  async updateSmallGroupTitle(){
    if (this.isUpdatingTitle || !this.newGroupTitle.trim()) return false;
    if (this.newGroupTitle === this.group.name) return true;
    const title = this.newGroupTitle.trim();
    this.isUpdatingTitle = true;
    try {
      const res = await this.groupService.updateGroupName(title);
      if (!res?.id) {
        this.intl.showError(res);
        return false;
      }
      this.group.name = title;
      this.editTitleInput?.nativeElement.blur();
      return true;
    } finally {
      this.isUpdatingTitle = false;
    }
  }

  async updateSmallGroupTemplate(){
    if (this.isUpdatingTitle || JSON.stringify(this.group.template) === JSON.stringify(this.groupService.group.template)) return;
    this.isUpdatingTitle = true;
    try {
      const res = await this.groupService.updateTemplate(this.group.template);
      if (!res?.id) this.intl.showError(res);
      this.editTemplateInput?.nativeElement.blur();
    } finally {
      this.isUpdatingTitle = false;
    }
  }

  async updateAll(){
    if (this.isSavingAll || this.isUpdatingTitle) return;
    this.isSavingAll = true;
    try {
      if (await this.updateSmallGroupTitle()) await this.updateSmallGroupTemplate();
    } finally {
      this.isSavingAll = false;
    }
  }
}
