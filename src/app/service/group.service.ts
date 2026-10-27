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

        const roles = ['leader', 'member', 'guest'];
        res.participants.sort((a: participant, b: participant) =>
          (roles.indexOf(a.role) < 0 ? 3 : roles.indexOf(a.role)) -
          (roles.indexOf(b.role) < 0 ? 3 : roles.indexOf(b.role)) || a.name.localeCompare(b.name));
        
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
    const saved = structuredClone(name);
    const res = await baseApiFetch("/group/name", {
      method: "PUT",
      body: JSON.stringify({ name: saved }),
    });
    if (res?.id) this.group.name = saved;
    return res;
  }

  async updateGroupParticipants(participants: participant[]){
    const saved = structuredClone(participants);
    const res = await baseApiFetch("/group/participants", {
      method: "PUT",
      body: JSON.stringify({ participants: saved }),
    });
    if (res?.id) this.group.participants = saved;
    return res;
  }

  async updateEvent(events: event[]){
    const saved = structuredClone(events);
    const res = await baseApiFetch("/group/events", {
      method: "PUT",
      body: JSON.stringify({ events: saved }),
    });
    if (res?.id) this.group.events = saved;
    return res;
  }

  async updateTemplate(template: Record<string, any>){
    const saved = structuredClone(template);
    const res = await baseApiFetch("/group/template", {
      method: "PUT",
      body: JSON.stringify({ template: saved }),
    });
    if (res?.id) this.group.template = saved;
    return res;
  }
}
