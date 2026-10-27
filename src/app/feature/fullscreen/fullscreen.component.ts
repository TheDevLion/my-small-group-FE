import { Component } from '@angular/core';
import { closeFullScreen, openFullScreen } from 'src/app/helpers/general';

@Component({
  selector: 'app-fullscreen',
  templateUrl: './fullscreen.component.html',
  styleUrls: ['./fullscreen.component.css']
})
export class FullscreenComponent {
  get isFullScreen(){ return !!document.fullscreenElement; }

  async toggleFullScreen(){
    try {
      if (this.isFullScreen) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may be unavailable or denied by the browser.
    }
  }
}
