import { Component } from '@angular/core';
import { SMALL_GROUP_LOADED } from 'src/app/events';
import { emptyGroup, group } from 'src/app/interface/group';
import { createEmptyParticipant, participant } from 'src/app/interface/participant';
import { GroupService } from 'src/app/service/group.service';
import { HubService } from 'src/app/service/hub.service';
import { TranslateService } from 'src/app/service/translate.service';

@Component({
  standalone: false,
  selector: 'app-manage-participants',
  templateUrl: './manage-participants.component.html',
  styleUrls: ['./manage-participants.component.css']
})
export class ManageParticipantsComponent {
  group: group = emptyGroup;
  participants: participant[] = [];
  isSaving = false;
  saveButtonClass = "button_disabled";
  
  constructor(private hub: HubService, private groupService: GroupService, public intl:TranslateService){
   this.getGroup();
  }

  async getGroup(){
    if (await this.groupService.init()){
      this.group = this.groupService.group;
      this.participants = structuredClone(this.group.participants);
    }
  }

  checkIfParticipantsNeedToBeUpdated(){
    if (this.participants.length !== this.group.participants.length){
      this.saveButtonClass = "";
      return;
    }
    else {
      for(let part of this.participants){
        let relatedPart = this.group.participants.filter((x: participant) => x.id === part.id)?.[0];
        if(!relatedPart){
          this.saveButtonClass = "";
          return;
        }else{
          if (part.name !== relatedPart.name || part.alias !== relatedPart.alias || part.role !== relatedPart.role){
            this.saveButtonClass = "";
            return;
          }            
        }
      }
    }

    this.saveButtonClass = "button_disabled";
  }

  addNewParticipant(){
    if(this.participants.length < 30){
      this.participants.push(createEmptyParticipant());
      this.checkIfParticipantsNeedToBeUpdated();
    }else{
      alert(this.intl.translate("alert_max_participants_added"));
    }
  }

  deleteParticipant(participant: participant){
    if (this.group.events.some(e => e.presence.includes(participant.id))) {
      this.intl.showError({error: 'participant_in_use'});
      return;
    }
    this.participants = this.participants.filter(x => x.id !== participant.id);
    this.checkIfParticipantsNeedToBeUpdated();
  }

  async saveParticipants(){
    this.checkIfParticipantsNeedToBeUpdated();

    if (this.isSaving || this.saveButtonClass) return;
    const changed = this.participants.filter(p => {
      const saved = this.group.participants.find(x => x.id === p.id);
      return !saved || p.name !== saved.name || p.alias !== saved.alias || p.role !== saved.role;
    });
    if (changed.some(p => !p.name.trim() || !['leader', 'member', 'guest'].includes(p.role))) {
      this.intl.showError({error: 'invalid_payload'});
      return;
    }
    this.isSaving = true;
    try {
      const res = await this.groupService.updateGroupParticipants(this.participants);
      if (!res?.id) this.intl.showError(res);
      this.checkIfParticipantsNeedToBeUpdated();
    } finally {
      this.isSaving = false;
    }
  }
}
