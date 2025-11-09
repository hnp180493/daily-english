import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { ToastContainer } from './components/toast-container/toast-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'English Practice Platform';
  
  // Removed auto anonymous sign-in
  // Users must sign in with Google to use the app
}
