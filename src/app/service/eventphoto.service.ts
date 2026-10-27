import { Injectable } from '@angular/core';
import { baseApiFetch } from '../helpers/base_request';

@Injectable({providedIn: 'root'})
export class EventphotoService {
  deleteImg(imgId: string){
    return baseApiFetch(`/event-photos/${encodeURIComponent(imgId)}`, {method: 'DELETE'});
  }

  getEventPhotos(eventId: string){
    return baseApiFetch(`/event-photos?eventId=${encodeURIComponent(eventId)}`);
  }

  uploadAsset(asset: FormData, eventId: string){
    asset.set('eventId', eventId);
    return baseApiFetch('/event-photos', {method: 'POST', body: asset});
  }

  publishImg(imgId: string){
    return baseApiFetch(`/event-photos/${encodeURIComponent(imgId)}/publish`, {method: 'POST'});
  }
}
