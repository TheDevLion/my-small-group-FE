import { Injectable } from '@angular/core';
import { baseApiFetch, getSessionState, getSessionVersion } from '../helpers/base_request';
import { participant } from '../interface/participant';
import { emptyGroup, group } from '../interface/group';
import { event } from '../interface/event';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  group: group = structuredClone(emptyGroup);
  private loading?: Promise<boolean>;
  
  constructor() {}

  async init(){
    if (this.loading) return this.loading;
    this.loading = this.loadGroup();
    try { return await this.loading; }
    finally { this.loading = undefined; }
  }

  private async loadGroup(){
    const session = getSessionState();
    const version = getSessionVersion();
    if (!session.loggedIn) {
      this.group = structuredClone(emptyGroup);
      return false;
    }
    if (this.group.id !== session.groupID) this.group = structuredClone(emptyGroup);
    try {
      if (!this.group.id || !this.group.name){
        const res = await this.getGroupInfo();

        if (!res || res.error || version !== getSessionVersion() || res.id !== session.groupID){
          return false;
        }

        res.events ??= [];
        res.participants ??= [];
        res.template ??= {};
        if (!Array.isArray(res.events) || !Array.isArray(res.participants) ||
            res.events.some((e: any) => !e || typeof e.id !== 'string' || typeof e.title !== 'string' ||
              typeof e.dateStr !== 'string' || !Array.isArray(e.presence) || e.presence.some((id: any) => typeof id !== 'string')) ||
            res.participants.some((p: any) => !p || typeof p.id !== 'string' || typeof p.name !== 'string')) return false;
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
    const version = getSessionVersion();
    if (!getSessionState().loggedIn || this.group.id !== getSessionState().groupID) return {error: 'unauthorized'};
    const saved = structuredClone(name);
    const res = await baseApiFetch("/group/name", {
      method: "PUT",
      body: JSON.stringify({ name: saved, updatedAt: this.group.updatedAt }),
    });
    if (version !== getSessionVersion()) return {error: 'unauthorized'};
    if (res?.id && !res.error) {
      this.group.name = saved;
      this.group.updatedAt = res.updatedAt;
    }
    return res;
  }

  async updateGroupParticipants(participants: participant[]){
    const version = getSessionVersion();
    if (!getSessionState().loggedIn || this.group.id !== getSessionState().groupID) return {error: 'unauthorized'};
    const saved = structuredClone(participants);
    const res = await baseApiFetch("/group/participants", {
      method: "PUT",
      body: JSON.stringify({ participants: saved, updatedAt: this.group.updatedAt }),
    });
    if (version !== getSessionVersion()) return {error: 'unauthorized'};
    if (res?.id && !res.error) {
      this.group.participants = saved;
      this.group.updatedAt = res.updatedAt;
    }
    return res;
  }

  async updateEvent(events: event[]){
    const version = getSessionVersion();
    if (!getSessionState().loggedIn || this.group.id !== getSessionState().groupID) return {error: 'unauthorized'};
    const saved = structuredClone(events);
    const res = await baseApiFetch("/group/events", {
      method: "PUT",
      body: JSON.stringify({ events: saved, updatedAt: this.group.updatedAt }),
    });
    if (version !== getSessionVersion()) return {error: 'unauthorized'};
    if (res?.id && !res.error) {
      this.group.events = saved;
      this.group.updatedAt = res.updatedAt;
    }
    return res;
  }

  async updateTemplate(template: Record<string, any>){
    const version = getSessionVersion();
    if (!getSessionState().loggedIn || this.group.id !== getSessionState().groupID) return {error: 'unauthorized'};
    const saved = structuredClone(template);
    const res = await baseApiFetch("/group/template", {
      method: "PUT",
      body: JSON.stringify({ template: saved, updatedAt: this.group.updatedAt }),
    });
    if (version !== getSessionVersion()) return {error: 'unauthorized'};
    if (res?.id && !res.error) {
      this.group.template = saved;
      this.group.updatedAt = res.updatedAt;
    }
    return res;
  }
}
