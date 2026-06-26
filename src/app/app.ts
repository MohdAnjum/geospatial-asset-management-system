import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

/**
 * Root shell component. Per the assignment it is intentionally thin: it hosts
 * the router outlet (login / dashboard render here) plus a single app-wide
 * <p-toast> so any component can raise notifications via MessageService.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
