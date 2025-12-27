import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './component/login/login.component';
import { SettingsComponent } from './component/settings/settings.component';
import { ManageParticipantsComponent } from './component/manage-participants/manage-participants.component';
import { EventsViewComponent } from './component/calendar/events-view/events-view.component';
import { EventManagerComponent } from './component/calendar/event-manager/event-manager.component';
import { ReportComponent } from './component/report/report.component';
import { AuthGuard } from './guards/auth.guard';


const routes: Routes = [
  {path: "", component: LoginComponent, title: "MySmallGroup - Log In"},
  {path: "settings", component: SettingsComponent, canActivate: [AuthGuard]},
  {path: "manage_participants", component: ManageParticipantsComponent, canActivate: [AuthGuard]},
  {path: "calendar", component: EventsViewComponent, canActivate: [AuthGuard]},
  {path: "calendar_event", component: EventManagerComponent, canActivate: [AuthGuard]},
  {path: "report", component: ReportComponent, canActivate: [AuthGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
