import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DictationProgress } from '../../../models/dictation.model';

@Component({
  selector: 'app-dictation-stats-widget',
  imports: [CommonModule],
  template: `
    <div class="widget dictation-stats-widget">
      <div class="widget-header">
        <h3>🎧 Dictation Practice</h3>
      </div>
      <div class="widget-content">
        @if (totalSessions() > 0) {
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ totalSessions() }}</div>
              <div class="stat-label">Sessions Completed</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ averageAccuracy() }}%</div>
              <div class="stat-label">Average Accuracy</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ totalSentences() }}</div>
              <div class="stat-label">Sentences Practiced</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ perfectSessions() }}</div>
              <div class="stat-label">Perfect Sessions</div>
            </div>
          </div>
          
          @if (recentSessions().length > 0) {
            <div class="recent-sessions">
              <h4>Recent Sessions</h4>
              <div class="sessions-list">
                @for (session of recentSessions(); track session.exerciseId) {
                  <div class="session-item">
                    <div class="session-info">
                      <span class="session-date">{{ formatDate(session.timestamp) }}</span>
                      <span class="session-accuracy" [class.perfect]="session.overallAccuracy >= 95">
                        {{ session.overallAccuracy.toFixed(1) }}%
                      </span>
                    </div>
                    <div class="session-details">
                      {{ session.sentenceAttempts.length }} sentences
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        } @else {
          <div class="empty-state">
            <p>No dictation practice sessions yet</p>
            <p class="hint">Complete a translation exercise, then try dictation practice!</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dictation-stats-widget {
      background: rgba(26, 31, 58, 0.6);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(167, 139, 250, 0.2);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .widget-header {
      margin-bottom: 1.5rem;
      
      h3 {
        color: #E2E8F0;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      text-align: center;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.5);
      border-radius: 12px;
      border: 1px solid rgba(167, 139, 250, 0.1);
    }

    .stat-value {
      color: #A78BFA;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #94A3B8;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .recent-sessions {
      h4 {
        color: #E2E8F0;
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
      }
    }

    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .session-item {
      background: rgba(15, 23, 42, 0.5);
      border-radius: 8px;
      padding: 0.75rem;
      border: 1px solid rgba(167, 139, 250, 0.1);
    }

    .session-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .session-date {
      color: #94A3B8;
      font-size: 0.875rem;
    }

    .session-accuracy {
      color: #10B981;
      font-weight: 600;
      font-size: 0.875rem;
      
      &.perfect {
        color: #FBBF24;
      }
    }

    .session-details {
      color: #64748B;
      font-size: 0.8125rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      
      p {
        color: #94A3B8;
        margin: 0.5rem 0;
        
        &.hint {
          color: #64748B;
          font-size: 0.875rem;
        }
      }
    }

    @media (prefers-color-scheme: dark) {
      .dictation-stats-widget {
        background: rgba(15, 23, 42, 0.8);
        border-color: rgba(167, 139, 250, 0.3);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationStatsWidgetComponent {
  dictationHistory = input.required<DictationProgress>();
  
  totalSessions = computed(() => {
    const history = this.dictationHistory();
    return Object.keys(history).length;
  });
  
  averageAccuracy = computed(() => {
    const history = this.dictationHistory();
    const sessions = Object.values(history);
    
    if (sessions.length === 0) return 0;
    
    const total = sessions.reduce((sum, session) => sum + session.overallAccuracy, 0);
    return Math.round(total / sessions.length);
  });
  
  totalSentences = computed(() => {
    const history = this.dictationHistory();
    const sessions = Object.values(history);
    
    return sessions.reduce((sum, session) => sum + session.sentenceAttempts.length, 0);
  });
  
  perfectSessions = computed(() => {
    const history = this.dictationHistory();
    const sessions = Object.values(history);
    
    return sessions.filter(session => session.overallAccuracy >= 95).length;
  });
  
  recentSessions = computed(() => {
    const history = this.dictationHistory();
    const sessions = Object.values(history);
    
    return sessions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  });
  
  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  }
}
