import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CLOSE_IMG_DIALOG_DELETE, CLOSE_SHUFFLE_DIALOG, EDIT_EVENT, OPEN_DESC_DIALOG, OPEN_DIALOG, OPEN_IMG_DIALOG, OPEN_PRESENCE_DIALOG, OPEN_SHUFFLE_DIALOG, RETURN_EDIT_EVENT_PAGE } from 'src/app/events';
import { createEmptyEvent, event } from 'src/app/interface/event';
import { emptyGroup, group } from 'src/app/interface/group';
import { participant } from 'src/app/interface/participant';
import { GroupService } from 'src/app/service/group.service';
import { HubService } from 'src/app/service/hub.service';
import { TranslateService } from 'src/app/service/translate.service';
import { MatDialog } from '@angular/material/dialog';
import { ShuffleDialogComponent } from '../shuffle-dialog/shuffle-dialog.component';
import { formatDayMonthYear, isValidDate } from 'src/app/helpers/date_time';
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
  isLoading = true;
  shuffleViewOrUpdate = false;  
  imgUrls: {id: string, url: string}[] = [];
  uploadedFiles = new Set<File>();
  pendingPublications = new Map<File, string>();
  private routeSubscription: Subscription;
  private loadVersion = 0;
  private destroyed = false;
  
  constructor(public groupService: GroupService, public router: Router, public intl: TranslateService, private hub: HubService, public dialog: MatDialog, private eventPhotoService: EventphotoService, private route: ActivatedRoute){
    this.hub.subscribe(CLOSE_SHUFFLE_DIALOG, () => this.dialog.closeAll(), this);
    this.hub.subscribe(CLOSE_IMG_DIALOG_DELETE, (data: string[]) => {
      this.imgUrls = this.imgUrls.filter(x => x.id !== data[0]);
    }, this);
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      const id = params.get('id');
      if (this.isSaving && id === this.event.id) return;
      this.getGroup(id, params.get('date'));
    });
  }
  
  async getImgs(){
    const version = this.loadVersion;
    const eventId = this.event.id;
    this.imgUrls = [];
    if (!this.group.events.some(x => x.id === eventId)) return;
    const res = await this.eventPhotoService.getEventPhotos(eventId);
    if (this.destroyed || version !== this.loadVersion || this.event.id !== eventId) return;
    if (res?.error || !Array.isArray(res)) {
      this.intl.showError(res);
      return;
    }
    this.imgUrls = res;
  }

  filesChanged(){
    this.uploadedFiles.clear();
    this.pendingPublications.clear();
  }

  async saveImgs(eventId: string, version: number){
    const input = this.files.nativeElement as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    let failure: any = null;
    for (const file of files) {
      if (this.destroyed || version !== this.loadVersion || this.event.id !== eventId) return;
      if (this.uploadedFiles.has(file)) continue;
      const pendingId = this.pendingPublications.get(file);
      const form = new FormData();
      form.append('fileUpload', file);
      const res = pendingId
        ? await this.eventPhotoService.publishImg(pendingId)
        : await this.eventPhotoService.uploadAsset(form, eventId);
      if (this.destroyed || version !== this.loadVersion || this.event.id !== eventId) return;
      if (res?.error || !res?.id) {
        if (res?.id) this.pendingPublications.set(file, res.id);
        failure = res?.error === 'invalid_image' ? res : {error: 'upload_failed'};
        continue;
      }
      this.imgUrls = [...this.imgUrls.filter(x => x.id !== res.id), res];
      this.uploadedFiles.add(file);
      this.pendingPublications.delete(file);
    }
    if (failure) this.intl.showError(failure);
    else {
      input.value = '';
      this.filesChanged();
    }
  }

  async getGroup(id: string | null, day: string | null){
    const version = ++this.loadVersion;
    this.isLoading = true;
    this.group = structuredClone(emptyGroup);
    this.event = createEmptyEvent();
    this.imgUrls = [];
    this.filesChanged();
    if (this.files) this.files.nativeElement.value = '';
    try {
      const loaded = await this.groupService.init();
      if (this.destroyed || version !== this.loadVersion) return;
      if (!loaded) {
        this.intl.showError({error: 'api_unavailable'});
        return;
      }
      this.group = this.groupService.group;
      if (id) {
        const saved = this.group.events.find(e => e.id === id);
        if (!saved) {
          this.intl.showError({error: 'not_found'});
          this.router.navigate(['/calendar']);
          return;
        }
        this.event = structuredClone(saved);
      } else {
        this.event = createEmptyEvent();
        if (day && isValidDate(day)) this.event.dateStr = day;
      }
      await this.getImgs();
    } finally {
      if (version === this.loadVersion) this.isLoading = false;
    }
  }

  async saveEvent(){
    if (this.isButtonDisabled()) return;
    this.hub.notify(CLOSE_SHUFFLE_DIALOG);
    this.isSaving = true;
    const eventId = this.event.id;
    const version = this.loadVersion;
    try {
      const newEventsList = this.group.events.filter(x => x.id !== this.event.id);
      newEventsList.push(structuredClone(this.event));
      newEventsList.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      const res = await this.groupService.updateEvent(newEventsList);
      if (this.destroyed || version !== this.loadVersion || this.event.id !== eventId) return;
      if (!res?.id) {
        this.intl.showError(res);
        return;
      }
      await this.router.navigate(['/calendar_event'], {queryParams: {id: eventId}, replaceUrl: true});
      if (!this.destroyed && version === this.loadVersion && this.event.id === eventId) await this.saveImgs(eventId, version);
    } finally {
      this.isSaving = false;
    }
  }

  isButtonDisabled(){
    return this.isLoading || this.isSaving || !this.group.id || !this.event.title.trim() || !isValidDate(this.event.dateStr);
  }

  returnPage(){
    if (this.isSaving) return;
    this.dialog.closeAll();
    this.router.navigate(['/calendar'], {queryParams: {date: this.event.dateStr}});
  }

  shuffleParticipants(){
    if (this.isLoading || this.isSaving) return;


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
    const rows: string[][] = [[this.intl.translateWithParams("shuffle_dialog_date_of_shuffle", [fDate])]];

    const participants = this.event.presence
      .map(id => this.group.participants.find(p => p.id === id))
      .filter((p): p is participant => !!p);
    for (let i = 0; i < participants.length; i++) {
      const part = participants[i];
      const next = participants[(i + 1) % participants.length];
      const name = (p: participant) => p.name + (p.role === 'guest' ? '*' : '');
      rows.push([name(part), name(next)]);
    }

    this.hub.notifyArgs(OPEN_DIALOG, {component: ShuffleDialogComponent, data: {rows, template: this.group.template}});
  }

  async openImgModal(img: any){
    if (this.isLoading || this.isSaving) return;
    this.hub.notifyArgs(OPEN_DIALOG, {component: ImgDialogComponent, data: {imgUrl: img.url, imgId: img.id}});

  }

  openDescriptionModal(){
    if (this.isLoading || this.isSaving) return;
    this.hub.notifyArgs(OPEN_DIALOG, {component: DescriptionDialogComponent, data: {desc: this.event.description, updateDesc: (desc: string) => {this.event.description = desc}}});
  }

  openPresenceModal(){
    if (this.isLoading || this.isSaving) return;
    this.hub.notifyArgs(OPEN_DIALOG, {component: PresenceDialogComponent, data: {presence: this.event.presence, participants: this.group.participants, updatePresence: (presence: string[]) => {this.event.presence = presence}}});
  }
  ngOnDestroy(){
    this.destroyed = true;
    this.loadVersion++;
    this.routeSubscription.unsubscribe();
    this.hub.unsubscribe(this);
    this.dialog.closeAll();
  }
}
