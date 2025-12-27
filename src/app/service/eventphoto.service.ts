import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
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

    try {
        const response = await fetch(`${environment.apiUrl}/event-photos`, {
            method: "POST",
            body: asset,
            credentials: "include",
        });

        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        if (data?.error) {
            return null;
        }

        return data;
    }catch(error){
        return null;
    }
  }
}
