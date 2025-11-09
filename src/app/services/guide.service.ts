import { Injectable } from '@angular/core';

export interface GuideSection {
  id: string;
  title: string;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class GuideService {
  
  async getGuideContent(): Promise<GuideSection[]> {
    try {
      const response = await fetch('/README.md');
      const markdown = await response.text();
      return this.parseMarkdown(markdown);
    } catch (error) {
      console.error('Error loading README:', error);
      return [];
    }
  }
  
  private parseMarkdown(markdown: string): GuideSection[] {
    const sections: GuideSection[] = [];
    
    // Split by h2 headers (##)
    const parts = markdown.split(/^## /gm);
    
    // Skip first part (title and intro)
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const lines = part.split('\n');
      const title = lines[0].replace(/^#+\s*/, '').trim();
      const content = lines.slice(1).join('\n').trim();
      
      const id = this.generateId(title);
      const htmlContent = this.markdownToHtml(content);
      
      sections.push({
        id,
        title,
        content: htmlContent
      });
    }
    
    return sections;
  }
  
  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  private markdownToHtml(markdown: string): string {
    let html = markdown;
    
    // Code blocks (must be before inline code)
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
      return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Headers h4 (####)
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    
    // Headers h3 (###)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Split into lines for list processing
    const lines = html.split('\n');
    const processed: string[] = [];
    let inList = false;
    let listType = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Unordered list
      if (line.match(/^- (.+)$/)) {
        if (!inList || listType !== 'ul') {
          if (inList) processed.push(`</${listType}>`);
          processed.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        processed.push(line.replace(/^- (.+)$/, '<li>$1</li>'));
      }
      // Ordered list
      else if (line.match(/^\d+\. (.+)$/)) {
        if (!inList || listType !== 'ol') {
          if (inList) processed.push(`</${listType}>`);
          processed.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        processed.push(line.replace(/^\d+\. (.+)$/, '<li>$1</li>'));
      }
      // Not a list item
      else {
        if (inList) {
          processed.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        processed.push(line);
      }
    }
    
    if (inList) {
      processed.push(`</${listType}>`);
    }
    
    html = processed.join('\n');
    
    // Paragraphs (avoid wrapping headers, lists, code blocks)
    html = html.replace(/^(?!<[hulo\/]|<li|<pre)(.+)$/gm, (match) => {
      return match.trim() ? `<p>${match}</p>` : '';
    });
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    return html;
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
