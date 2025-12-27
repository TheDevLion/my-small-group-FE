import { Injectable } from '@angular/core';
import { baseApiFetch } from '../helpers/base_request';
import { participant } from '../interface/participant';
import { emptyGroup, group } from '../interface/group';
import { event } from '../interface/event';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  group: group = emptyGroup;
  
  constructor() {}

  async init(){
    try {
      if (!this.group.id || !this.group.name){
        const res = await this.getGroupInfo();

        if (!res || res.error){
          return false;
        }

        const sortedParticipants = res.participants.filter((x: participant) => x.role === "leader").sort((a: participant, b: participant) => a.name > b.name ? 1 : -1)
        .concat(res.participants.filter((x: participant) => x.role === "member").sort((a: participant, b: participant) => a.name > b.name ? 1 : -1))
        .concat(res.participants.filter((x: participant) => x.role === "guest").sort((a: participant, b: participant) => a.name > b.name ? 1 : -1));        
        res.participants = sortedParticipants;
        
        this.group = res;
      }
      return true;
    }catch(error){
      console.log(error);
      return false;
    }
    
  }

  async getGroupInfo(){
    const res = await baseApiFetch("/group", { method: "GET" });
    return res?.error ? null : res;
  }

  async updateGroupName(name: string){
    const res = await baseApiFetch("/group/name", {
      method: "PUT",
      body: JSON.stringify({ name: name }),
    });
    return res;
  }

  async updateGroupParticipants(participants: participant[]){
    const res = await baseApiFetch("/group/participants", {
      method: "PUT",
      body: JSON.stringify({ participants: participants }),
    });
    return res;
  }

  async updateEvent(events: event[]){
    const res = await baseApiFetch("/group/events", {
      method: "PUT",
      body: JSON.stringify({ events: events }),
    });
    return res;
  }

  async updateTemplate(template: Record<string, any>){
    const res = await baseApiFetch("/group/template", {
      method: "PUT",
      body: JSON.stringify({ template: template }),
    });
    return res;
  }
}
