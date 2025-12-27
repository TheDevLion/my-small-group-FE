import { Component } from '@angular/core';
import { closeFullScreen, openFullScreen } from 'src/app/helpers/general';

@Component({
  selector: 'app-fullscreen',
  templateUrl: './fullscreen.component.html',
  styleUrls: ['./fullscreen.component.css']
})
export class FullscreenComponent {
  isFullScreen = true;

  toggleFullScreen(){
    if (this.isFullScreen)
      closeFullScreen();
    else
      openFullScreen();

    this.isFullScreen = !this.isFullScreen;
  }

}
