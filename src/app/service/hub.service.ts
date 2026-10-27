import { Injectable } from '@angular/core';
import { HubEvent } from '../events';

@Injectable({
  providedIn: 'root'
})
export class HubService {
  events: HubEvent[] = [];
  
  constructor() {
  }

  subscribe(event: string, f: Function, owner: object){
      let ev: HubEvent = {eventId: event, function: f, owner};
      this.events.push(ev);    
  }

  unsubscribe(owner: object){
    this.events = this.events.filter(x => x.owner !== owner);
  }

  notify(event: string){
    let eventsSubscribed = this.events.filter(x => x.eventId === event);    
    for(let ev of eventsSubscribed){
      ev.function();
    }
  }

  notifyArgs(event: string, args: any){
    let eventsSubscribed = this.events.filter(x => x.eventId === event);    
    for(let ev of eventsSubscribed){
      ev.function(args);
    }
  }
}
