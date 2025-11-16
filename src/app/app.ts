import { Component, ViewContainerRef, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { ToastContainer } from './components/toast-container/toast-container';
import { ModalService } from './services/modal.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'English Practice Platform';
  
  private viewContainerRef = inject(ViewContainerRef);
  private modalService = inject(ModalService);

  ngOnInit(): void {
    // Register ViewContainerRef for modal service
    this.modalService.setViewContainerRef(this.viewContainerRef);
  }
}
