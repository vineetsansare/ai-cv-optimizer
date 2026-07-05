// A customized, robust client-side Markdown to HTML parser tailored specifically for CVs.
// Replicates the Apple/Vineet styling (centered headers, double lines, justified text, space-between flex rows for dates, 2-column skills grids, inline contact SVG icons).

export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown
    // Escape HTML tags to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n')
    .split('\n');

  const processedLines: string[] = [];
  let inSkills = false;
  let skillsListOpen = false;
  let inList = false;
  let justSawH1 = false;

  const mailIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px;"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
  const phoneIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const linkedinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px;"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check for H1 (Name)
    if (line.startsWith('# ')) {
      // Close list or skills list if open
      if (skillsListOpen) { processedLines.push('</ul>'); skillsListOpen = false; }
      if (inList) { processedLines.push('</ul>'); inList = false; }
      inSkills = false;

      const name = line.substring(2).trim();
      processedLines.push(`<h1>${name}</h1>`);
      justSawH1 = true;
      continue;
    }

    // Check for H2 (Sections like EXECUTIVE PROFILE, PROFESSIONAL EXPERIENCE)
    if (line.startsWith('## ')) {
      // Close list or skills list if open
      if (skillsListOpen) { processedLines.push('</ul>'); skillsListOpen = false; }
      if (inList) { processedLines.push('</ul>'); inList = false; }

      const title = line.substring(3).trim();
      processedLines.push(`<h2>${title}</h2>`);

      // Toggle skills grid mode
      if (title.toUpperCase().includes('SKILLS') || title.toUpperCase().includes('COMPETENCIES')) {
        inSkills = true;
      } else {
        inSkills = false;
      }
      justSawH1 = false;
      continue;
    }

    // Subtitle check (immediately after H1)
    if (justSawH1 && line && !line.includes('|') && !line.startsWith('###')) {
      // Clean asterisks if present
      const subtitle = line.replace(/^\*(.*)\*$/, '$1').trim();
      processedLines.push(`<div class="subtitle">${subtitle}</div>`);
      justSawH1 = false;
      continue;
    }

    // Contact info row check
    if (line.includes('|') && (line.includes('@') || line.includes('+') || line.includes('linkedin.com'))) {
      const parts = line.split('|');
      const formattedParts = parts.map((part) => {
        const item = part.trim();
        if (item.includes('@')) {
          return `<span class="contact-item">${mailIcon}<a href="mailto:${item}">${item}</a></span>`;
        } else if (item.includes('linkedin.com')) {
          const displayLink = item.replace(/^(https?:\/\/)?(www\.)?/, '');
          const hrefLink = item.startsWith('http') ? item : `https://${item}`;
          return `<span class="contact-item">${linkedinIcon}<a href="${hrefLink}" target="_blank" rel="noopener noreferrer">${displayLink}</a></span>`;
        } else if (/\+?\d[\d-\s()]{6,}\d/.test(item)) {
          return `<span class="contact-item">${phoneIcon}<span>${item}</span></span>`;
        } else {
          return `<span class="contact-item">${pinIcon}<span>${item}</span></span>`;
        }
      });

      processedLines.push(`<div class="contact-row">${formattedParts.join('')}</div>`);
      justSawH1 = false;
      continue;
    }

    // Reset subtitle flags for other content lines
    if (line) {
      justSawH1 = false;
    }

    // Check for H3 (Job roles & Degrees with 'Title | Dates' alignment syntax)
    if (line.startsWith('### ')) {
      // Close list or skills list if open
      if (skillsListOpen) { processedLines.push('</ul>'); skillsListOpen = false; }
      if (inList) { processedLines.push('</ul>'); inList = false; }

      const titleContent = line.substring(4).trim();
      if (titleContent.includes('|')) {
        const [title, dates] = titleContent.split('|');
        processedLines.push(
          `<div class="role-row">` +
            `<span class="role-title">${title.trim()}</span>` +
            `<span class="role-dates">${dates.trim()}</span>` +
          `</div>`
        );
      } else {
        processedLines.push(`<div class="role-row"><span class="role-title">${titleContent}</span></div>`);
      }
      continue;
    }

    // Check for Italicized Subline immediately following H3 (Company / Location alignment syntax)
    // Matches e.g.: *Company Name | Location*
    if (line.startsWith('*') && line.endsWith('*') && line.includes('|')) {
      const cleanContent = line.substring(1, line.length - 1).trim();
      const [company, location] = cleanContent.split('|');
      processedLines.push(
        `<div class="company-row">` +
          `<span class="company-name">${company.trim()}</span>` +
          `<span class="company-location">${location.trim()}</span>` +
        `</div>`
      );
      continue;
    }

    // Skip horizontal rules (since borders are automatically rendered by CSS headings)
    if (line === '---') {
      continue;
    }

    // Bullet points parsing (lists)
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();

      if (inSkills) {
        // Render 2-column skills grid
        if (!skillsListOpen) {
          processedLines.push('<ul class="skills-list">');
          skillsListOpen = true;
        }

        // Check if item starts with bold text category, e.g. **Mobile Architecture**: Swift...
        const categoryMatch = content.match(/^\*\*(.*?)\*\*:\s*(.*)$/);
        if (categoryMatch) {
          processedLines.push(`<li><strong>${categoryMatch[1]}</strong>${categoryMatch[2]}</li>`);
        } else {
          processedLines.push(`<li>${content}</li>`);
        }
      } else {
        // Standard work bullet list
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        
        // Parse bold text and italics inside bullets
        let formattedContent = content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        processedLines.push(`<li>${formattedContent}</li>`);
      }
      continue;
    }

    // Close lists if we hit a non-bullet line
    if (!bulletMatch && line) {
      if (skillsListOpen) { processedLines.push('</ul>'); skillsListOpen = false; }
      if (inList) { processedLines.push('</ul>'); inList = false; }
    }

    // Parse standard paragraphs
    if (line) {
      let formattedParagraph = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

      processedLines.push(`<p>${formattedParagraph}</p>`);
    } else {
      processedLines.push('');
    }
  }

  // Final list closures
  if (skillsListOpen) processedLines.push('</ul>');
  if (inList) processedLines.push('</ul>');

  return processedLines.join('\n').replace(/\n{2,}/g, '\n');
}

/**
 * Strips markdown symbols to produce a clean plain-text version of the CV.
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/^[-*]\s+/gm, '• ') // Convert bullet points to unicode bullets
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italics
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)') // Format links
    .replace(/^---$/gm, '──────────────────────────────') // Convert HR to clean text dividers
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
    .trim();
}
