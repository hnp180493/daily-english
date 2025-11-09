import { Injectable, signal } from '@angular/core';

export interface FlyingPoint {
  id: string;
  points: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PointsAnimationService {
  private flyingPoints = signal<FlyingPoint[]>([]);
  
  getFlyingPoints() {
    return this.flyingPoints.asReadonly();
  }

  /**
   * Trigger points animation and return a promise that resolves when animation completes
   * This allows the caller to delay the actual points addition until animation finishes
   */
  triggerPointsAnimation(points: number, sourceElement: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const rect = sourceElement.getBoundingClientRect();
      const headerPoints = document.querySelector('.points-display');
      
      if (!headerPoints) {
        console.warn('Header points element not found');
        resolve();
        return;
      }
      
      const targetRect = headerPoints.getBoundingClientRect();
      
      // Add highlight to source element
      sourceElement.classList.add('points-highlight');
      setTimeout(() => {
        sourceElement.classList.remove('points-highlight');
      }, 1000);
      
      const flyingPoint: FlyingPoint = {
        id: `point-${Date.now()}-${Math.random()}`,
        points,
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        endX: targetRect.left + targetRect.width / 2,
        endY: targetRect.top + targetRect.height / 2,
        timestamp: Date.now()
      };
      
      this.flyingPoints.update(points => [...points, flyingPoint]);
      
      // Add highlight to header points when animation reaches it (at 1200ms)
      setTimeout(() => {
        headerPoints.classList.add('points-highlight');
        
        // Resolve promise when highlight animation completes (at 1200ms + 800ms = 2000ms)
        setTimeout(() => {
          headerPoints.classList.remove('points-highlight');
          resolve();
        }, 800);
      }, 1200);
      
      // Remove flying point after animation completes
      setTimeout(() => {
        this.flyingPoints.update(points => 
          points.filter(p => p.id !== flyingPoint.id)
        );
      }, 1700);
    });
  }
}
