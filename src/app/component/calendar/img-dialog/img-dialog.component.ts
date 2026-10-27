import { Component } from '@angular/core';
import {  CLOSE_DIALOG, CLOSE_IMG_DIALOG_DELETE, OPEN_IMG_DIALOG } from 'src/app/events';
import { EventphotoService } from 'src/app/service/eventphoto.service';
import { HubService } from 'src/app/service/hub.service';
import { TranslateService } from 'src/app/service/translate.service';

@Component({
  selector: 'app-img-dialog',
  templateUrl: './img-dialog.component.html',
  styleUrls: ['./img-dialog.component.css']
})
export class ImgDialogComponent {
  imgUrl: string = "";
  imgId: string = "";
  isDeleting = false;

  closeDialog(){
    this.hub.notify(CLOSE_DIALOG);
  }

  constructor(private hub: HubService, public intl: TranslateService, private eventPhotoService: EventphotoService){
    this.hub.subscribe(OPEN_IMG_DIALOG, (args: any) => {
      this.imgUrl = args.imgUrl;
      this.imgId = args.imgId;
    }, this);
  }

  async deleteImg(){
    if (this.isDeleting || !confirm(this.intl.translate("prompt_confirm_img_delete"))) return;
    this.isDeleting = true;
    try {
      const res = await this.eventPhotoService.deleteImg(this.imgId);
      if (res?.id) this.hub.notifyArgs(CLOSE_IMG_DIALOG_DELETE, [this.imgId]);
      else this.intl.showError(res);
    } finally {
      this.isDeleting = false;
    }
  }
  ngOnDestroy(){
    this.hub.unsubscribe(this);
  }
}
