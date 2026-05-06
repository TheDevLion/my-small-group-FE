import { Injectable } from '@angular/core';
import { baseApiFetch } from '../helpers/base_request';

@Injectable({
  providedIn: 'root'
})
export class EventphotoService {

  constructor() { }

  async deleteImg(imgId: string){
    const res = await baseApiFetch(`/event-photos/${encodeURIComponent(imgId)}`, {
      method: "DELETE",
    });
    return res?.id ?? null;
  }

  async getEventPhotos(eventId: string){
    const res = await baseApiFetch(`/event-photos?eventId=${encodeURIComponent(eventId)}`, {
      method: "GET",
    });

    if (res?.error){
      return [];
    }

    return res ?? [];
  }

  async uploadAsset(asset: FormData, eventId: string){    
    asset.append("eventId", eventId);

    const res = await baseApiFetch("/event-photos", {
      method: "POST",
      body: asset,
    });

    if (res?.error) {
      return null;
    }

    return res ?? null;
  }
}
