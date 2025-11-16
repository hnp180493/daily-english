import { Injectable, signal, ComponentRef, ViewContainerRef, Type } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private viewContainerRef = signal<ViewContainerRef | null>(null);
  private activeModalRef = signal<ComponentRef<any> | null>(null);

  setViewContainerRef(vcr: ViewContainerRef): void {
    this.viewContainerRef.set(vcr);
  }

  open<T>(component: Type<T>): ComponentRef<T> | null {
    const vcr = this.viewContainerRef();
    if (!vcr) {
      console.error('[ModalService] ViewContainerRef not set');
      return null;
    }

    // Close existing modal if any
    this.close();

    // Create component
    const componentRef = vcr.createComponent(component);
    this.activeModalRef.set(componentRef);

    return componentRef;
  }

  close(): void {
    const modalRef = this.activeModalRef();
    if (modalRef) {
      modalRef.destroy();
      this.activeModalRef.set(null);
    }
  }
}
