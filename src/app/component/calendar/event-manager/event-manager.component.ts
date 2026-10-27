import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CLOSE_IMG_DIALOG_DELETE, CLOSE_SHUFFLE_DIALOG, EDIT_EVENT, OPEN_DESC_DIALOG, OPEN_DIALOG, OPEN_IMG_DIALOG, OPEN_PRESENCE_DIALOG, OPEN_SHUFFLE_DIALOG, RETURN_EDIT_EVENT_PAGE } from 'src/app/events';
import { createEmptyEvent, event } from 'src/app/interface/event';
import { emptyGroup, group } from 'src/app/interface/group';
import { participant } from 'src/app/interface/participant';
import { GroupService } from 'src/app/service/group.service';
import { HubService } from 'src/app/service/hub.service';
import { TranslateService } from 'src/app/service/translate.service';
import { MatDialog } from '@angular/material/dialog';
import { ShuffleDialogComponent } from '../shuffle-dialog/shuffle-dialog.component';
import { formatDayMonthYear } from 'src/app/helpers/date_time';
import { EventphotoService } from 'src/app/service/eventphoto.service';
import { ImgDialogComponent } from '../img-dialog/img-dialog.component';
import { DescriptionDialogComponent } from '../description-dialog/description-dialog.component';
import { PresenceDialogComponent } from '../presence-dialog/presence-dialog.component';

@Component({
  selector: 'app-event-manager',
  templateUrl: './event-manager.component.html',
  styleUrls: ['./event-manager.component.css']
})
export class EventManagerComponent {  
  @ViewChild("files") files: any;

  group: group = emptyGroup;
  event: event = createEmptyEvent();  
  isSaving = false;
  shuffleViewOrUpdate = false;  
  imgUrls: {id: string, url: string}[] = [];
  uploadedFiles = new Set<File>();
  pendingPublications = new Map<File, string>();
  
  constructor(public groupService: GroupService, public router: Router, public intl: TranslateService, private hub: HubService, public dialog: MatDialog, private eventPhotoService: EventphotoService){
    this.hub.subscribe(EDIT_EVENT, (args: event) => {
      this.event = structuredClone(args);
      this.getImgs();
    });
    this.hub.subscribe(CLOSE_SHUFFLE_DIALOG, () => this.dialog.closeAll());
    this.getGroup();
  }
  
  async getImgs(){
    const eventId = this.event.id;
    this.imgUrls = [];
    if (!this.group.events.some(x => x.id === eventId)) return;
    const res = await this.eventPhotoService.getEventPhotos(eventId);
    if (this.event.id !== eventId) return;
    if (res?.error) {
      this.intl.showError(res);
      return;
    }
    this.imgUrls = res;
    for (const photo of res.filter((p: any) => p.pending)) {
      const published = await this.eventPhotoService.publishImg(photo.id);
      if (this.event.id !== eventId) return;
      if (published?.error) this.intl.showError(published);
    }
  }

  filesChanged(){
    this.uploadedFiles.clear();
    this.pendingPublications.clear();
  }

  async saveImgs(){
    const input = this.files.nativeElement as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    let failed = false;
    for (const file of files) {
      if (this.uploadedFiles.has(file)) continue;
      const pendingId = this.pendingPublications.get(file);
      const form = new FormData();
      form.append('fileUpload', file);
      const res = pendingId
        ? await this.eventPhotoService.publishImg(pendingId)
        : await this.eventPhotoService.uploadAsset(form, this.event.id);
      if (res?.error || !res?.id) {
        if (res?.id) this.pendingPublications.set(file, res.id);
        failed = true;
        continue;
      }
      this.imgUrls = [...this.imgUrls.filter(x => x.id !== res.id), res];
      this.uploadedFiles.add(file);
      this.pendingPublications.delete(file);
    }
    if (failed) this.intl.showError({error: 'upload_failed'});
    else {
      input.value = '';
      this.filesChanged();
    }
  }

  async getGroup(){
    if (await this.groupService.init()){
      this.group = this.groupService.group;
    }
  }  
  
  async saveEvent(){
    if (this.isButtonDisabled()) return;
    this.hub.notify(CLOSE_SHUFFLE_DIALOG);
    this.isSaving = true;
    try {
      const newEventsList = this.group.events.filter(x => x.id !== this.event.id);
      newEventsList.push(structuredClone(this.event));
      newEventsList.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      const res = await this.groupService.updateEvent(newEventsList);
      if (!res?.id) {
        this.intl.showError(res);
        return;
      }
      await this.saveImgs();
    } finally {
      this.isSaving = false;
    }
  }

  isButtonDisabled(){
    return this.isSaving || !this.event.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(this.event.dateStr);
  }

  returnPage(){
    setTimeout(() => this.hub.notifyArgs(RETURN_EDIT_EVENT_PAGE, this.event.dateStr), 50);
    this.hub.notify(CLOSE_SHUFFLE_DIALOG);
    this.router.navigate(['/calendar']);
  }

  shuffleParticipants(){    


    const shuffle = (array: string[]) => { 
      for (let i = array.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [array[i], array[j]] = [array[j], array[i]];
      } 
      return array; 
    }; 

    if (this.shuffleViewOrUpdate)
      this.event.presence = shuffle(this.event.presence);
    
    let fDate = formatDayMonthYear(new Date(this.event.dateStr + "T00:00"));
    let desc = `${this.intl.translateWithParams("shuffle_dialog_date_of_shuffle", [fDate])}\n`;

    for(let i = 0; i < this.event.presence.length; i++){
      if (i < this.event.presence.length - 1){
        const part = this.group.participants.find(x => x.id === this.event.presence[i])
        const nextPart = this.group.participants.find(x => x.id === this.event.presence[i + 1]);

        desc += `${part?.role === "guest" ? part?.name + "*" : part?.name} ${this.group.template['shuffle_connector_word']} ${nextPart?.role === "guest" ? nextPart?.name + "*" : nextPart?.name}\n`;
      }
      else if (i === this.event.presence.length - 1){
        const part = this.group.participants.find(x => x.id === this.event.presence[i]);
        const nextPart = this.group.participants.find(x => x.id === this.event.presence[0]);

        desc += `${part?.role === "guest" ? part?.name + "*" : part?.name} ${this.group.template['shuffle_connector_word']} ${nextPart?.role === "guest" ? nextPart?.name + "*" : nextPart?.name}\n`;
      }
    }

    this.hub.notifyArgs(OPEN_DIALOG, {component: ShuffleDialogComponent, data: {desc: desc, template: this.group.template}});
  }

  async openImgModal(img: any){
    this.hub.notifyArgs(OPEN_DIALOG, {component: ImgDialogComponent, data: {imgUrl: img.url, imgId: img.id}});
    this.hub.subscribe(CLOSE_IMG_DIALOG_DELETE, (data: any[]) => {
      this.imgUrls = this.imgUrls.filter((x: any) => x.id !== data[0]);
      this.dialog.closeAll();
    });
  }

  openDescriptionModal(){
    this.hub.notifyArgs(OPEN_DIALOG, {component: DescriptionDialogComponent, data: {desc: this.event.description, updateDesc: (desc: string) => {this.event.description = desc}}});
  }

  openPresenceModal(){
    this.hub.notifyArgs(OPEN_DIALOG, {component: PresenceDialogComponent, data: {presence: this.event.presence, participants: this.group.participants, updatePresence: (presence: string[]) => {this.event.presence = presence}}});
  }
}
