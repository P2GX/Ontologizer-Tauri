import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WelcomeService } from './welcome.service';

@Component({
  selector: 'app-welcome-dialog',
  imports: [RouterLink],
  templateUrl: './welcome-dialog.html',
  styleUrl: './welcome-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeDialog {
  private readonly service = inject(WelcomeService);
  readonly visible = this.service.visible;

  close(): void {
    this.service.dismiss();
  }
}
