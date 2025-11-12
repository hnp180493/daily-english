/**
 * Utility for testing notifications in development
 * 
 * Usage in browser console:
 * 
 * // Test success notification
 * window.testNotification('success')
 * 
 * // Test error notification
 * window.testNotification('error')
 * 
 * // Test warning notification
 * window.testNotification('warning')
 * 
 * // Test info notification
 * window.testNotification('info')
 * 
 * // Test review notification
 * window.testReviewNotification(3, 1) // 3 due reviews, 1 urgent
 */

import { ToastService } from './toast.service';
import { ReviewService } from './review.service';

export class NotificationTestUtility {
  static setupGlobalTestFunctions(toastService: ToastService, reviewService: ReviewService): void {
    // Make test functions available globally in development
    if (typeof window !== 'undefined') {
      (window as any).testNotification = (type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        const messages = {
          success: '✓ Thao tác thành công!',
          error: '✕ Đã xảy ra lỗi, vui lòng thử lại',
          warning: '⚠ Cảnh báo: Bạn cần chú ý điều này',
          info: 'ℹ Đây là thông tin hữu ích cho bạn'
        };
        
        toastService.show(messages[type], type, 5000, {
          label: 'Thao tác',
          callback: () => console.log('Action clicked!')
        });
      };
      
      (window as any).testReviewNotification = (dueCount: number = 3, urgentCount: number = 1) => {
        // Manually trigger the private method by calling checkDueReviews
        console.log(`Testing review notification: ${dueCount} due, ${urgentCount} urgent`);
        
        if (urgentCount > 0) {
          const message = urgentCount === 1 
            ? '🔴 Bạn có 1 bài ôn tập khẩn cấp cần làm ngay!'
            : `🔴 Bạn có ${urgentCount} bài ôn tập khẩn cấp cần làm ngay!`;
          
          toastService.show(message, 'warning', 10000, {
            label: 'Xem ngay',
            callback: () => console.log('Navigate to review queue')
          });
        } else if (dueCount > 0) {
          const message = dueCount === 1
            ? '📚 Bạn có 1 bài cần ôn tập trong 24 giờ tới'
            : `📚 Bạn có ${dueCount} bài cần ôn tập trong 24 giờ tới`;
          
          toastService.show(message, 'info', 8000, {
            label: 'Xem danh sách',
            callback: () => console.log('Navigate to review queue')
          });
        }
      };
      
      console.log('📢 Notification test functions loaded!');
      console.log('Try: window.testNotification("success")');
      console.log('Try: window.testReviewNotification(3, 1)');
    }
  }
}
