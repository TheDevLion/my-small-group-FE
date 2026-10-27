import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-fullscreen',
  templateUrl: './fullscreen.component.html',
  styleUrls: ['./fullscreen.component.css']
})
export class FullscreenComponent {
  isFullScreen = !!document.fullscreenElement;

  @HostListener('document:fullscreenchange')
  fullscreenChanged(){
    this.isFullScreen = !!document.fullscreenElement;
  }

  async toggleFullScreen(){
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may be unavailable or denied by the browser.
    }
  }
}
