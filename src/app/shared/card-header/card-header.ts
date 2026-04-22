import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Tooltip } from '../tooltip/tooltip';

@Component({
    selector: 'app-card-header',
    imports: [Tooltip],
    templateUrl: './card-header.html',
    styleUrl: './card-header.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardHeader {
    cardTitle = input.required<string>();
    tooltipType = input<'go' | 'annotation' | 'study' | 'pop' | null>(null);
    subtitle = input<string | null>(null);
    ready = input<boolean>(false);
}
