import chalk from 'chalk';

/**
 * Simple terminal markdown renderer using chalk
 * Renders markdown content with colors and formatting for CLI display
 */

interface CodeBlock {
  language: string;
  code: string;
}

/**
 * Applies syntax highlighting to code blocks
 * @param code - Code content
 * @param language - Programming language
 * @returns Highlighted code string
 */
function highlightCode(code: string, language: string): string {
  const lines = code.split('\n');
  
  // Simple syntax highlighting based on language
  if (language === 'javascript' || language === 'typescript' || language === 'js' || language === 'ts') {
    return lines.map(line => {
      // Comments
      if (line.trim().startsWith('//')) {
        return chalk.gray(line);
      }
      
      // Keywords
      line = line.replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|from|class|extends|new)\b/g, 
        match => chalk.magenta(match));
      
      // Strings
      line = line.replace(/(['"`])(?:(?=(\\?))\2.)*?\1/g, match => chalk.green(match));
      
      // Numbers
      line = line.replace(/\b\d+\b/g, match => chalk.yellow(match));
      
      return chalk.cyan(line);
    }).join('\n');
  } else if (language === 'bash' || language === 'sh' || language === 'shell') {
    return lines.map(line => {
      // Comments
      if (line.trim().startsWith('#')) {
        return chalk.gray(line);
      }
      
      // Commands
      line = line.replace(/^(\s*)(npm|node|git|cd|ls|mkdir|rm|cp|mv|cat|echo)\b/g, 
        (match, spaces, cmd) => spaces + chalk.cyan(cmd));
      
      // Flags
      line = line.replace(/\s(-{1,2}[a-zA-Z-]+)/g, match => chalk.yellow(match));
      
      return line;
    }).join('\n');
  } else if (language === 'json') {
    return lines.map(line => {
      // Keys
      line = line.replace(/"([^"]+)":/g, (match, key) => chalk.cyan(`"${key}"`) + ':');
      
      // String values
      line = line.replace(/:\s*"([^"]*)"/g, (match, value) => ': ' + chalk.green(`"${value}"`));
      
      // Numbers and booleans
      line = line.replace(/:\s*(true|false|\d+)/g, (match, value) => ': ' + chalk.yellow(value));
      
      return line;
    }).join('\n');
  } else if (language === 'diff') {
    return lines.map(line => {
      if (line.startsWith('+')) return chalk.green(line);
      if (line.startsWith('-')) return chalk.red(line);
      if (line.startsWith('@@')) return chalk.cyan(line);
      return chalk.gray(line);
    }).join('\n');
  }
  
  // Default: just return with cyan color
  return chalk.cyan(code);
}

/**
 * Extracts and highlights code blocks
 * @param markdown - Markdown content
 * @returns Object with processed markdown and code blocks
 */
function extractCodeBlocks(markdown: string): { markdown: string; codeBlocks: CodeBlock[] } {
  const codeBlocks: CodeBlock[] = [];
  let index = 0;
  
  const processed = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'text';
    codeBlocks.push({ language, code: code.trim() });
    return `__CODE_BLOCK_${index++}__`;
  });
  
  return { markdown: processed, codeBlocks };
}

/**
 * Renders markdown content for terminal display
 * @param markdown - Raw markdown content
 * @param maxWidth - Maximum width for text wrapping (default: 80)
 * @returns Formatted string for terminal display
 */
export function renderMarkdown(markdown: string, maxWidth: number = 100): string {
  // Extract code blocks first
  const { markdown: processed, codeBlocks } = extractCodeBlocks(markdown);
  
  const lines = processed.split('\n');
  const output: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines in some contexts
    if (!trimmed && inList) {
      inList = false;
      output.push('');
      continue;
    }
    
    // Code block placeholders
    if (trimmed.startsWith('__CODE_BLOCK_')) {
      const blockIndex = parseInt(trimmed.match(/__CODE_BLOCK_(\d+)__/)?.[1] || '0');
      const block = codeBlocks[blockIndex];
      
      if (block) {
        output.push('');
        output.push(chalk.dim('┌' + '─'.repeat(maxWidth - 2) + '┐'));
        
        const highlighted = highlightCode(block.code, block.language);
        highlighted.split('\n').forEach(codeLine => {
          // Truncate long lines
          const displayLine = codeLine.length > maxWidth - 4 
            ? codeLine.substring(0, maxWidth - 7) + '...'
            : codeLine;
          output.push(chalk.dim('│ ') + displayLine);
        });
        
        output.push(chalk.dim('└' + '─'.repeat(maxWidth - 2) + '┘'));
        output.push('');
      }
      continue;
    }
    
    // Mermaid diagrams
    if (trimmed === '```mermaid' || trimmed.startsWith('```mermaid')) {
      output.push('');
      output.push(chalk.dim('┌' + '─'.repeat(maxWidth - 2) + '┐'));
      output.push(chalk.dim('│ ') + chalk.yellow('📊 Mermaid Diagram'));
      output.push(chalk.dim('│ ') + chalk.gray('(View in markdown file for visual diagram)'));
      output.push(chalk.dim('└' + '─'.repeat(maxWidth - 2) + '┘'));
      output.push('');
      
      // Skip until end of mermaid block
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        i++;
      }
      continue;
    }
    
    // Headers
    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const text = trimmed.replace(/^#+\s*/, '');
      
      output.push('');
      if (level === 1) {
        output.push(chalk.bold.cyan(text.toUpperCase()));
        output.push(chalk.cyan('═'.repeat(Math.min(text.length, maxWidth))));
      } else if (level === 2) {
        output.push(chalk.bold.yellow(text));
        output.push(chalk.yellow('─'.repeat(Math.min(text.length, maxWidth))));
      } else if (level === 3) {
        output.push(chalk.bold.white('  ' + text));
      } else {
        output.push(chalk.white('    ' + text));
      }
      output.push('');
      continue;
    }
    
    // Horizontal rules
    if (trimmed === '---' || trimmed === '___' || trimmed === '***') {
      output.push(chalk.dim('─'.repeat(maxWidth)));
      continue;
    }
    
    // Blockquotes
    if (trimmed.startsWith('>')) {
      const text = trimmed.replace(/^>\s*/, '');
      output.push(chalk.dim('│ ') + chalk.gray(text));
      continue;
    }
    
    // Unordered lists
    if (trimmed.match(/^[-*+]\s/)) {
      const text = trimmed.replace(/^[-*+]\s/, '');
      const formatted = formatInlineMarkdown(text);
      output.push('  ' + chalk.cyan('•') + ' ' + formatted);
      inList = true;
      continue;
    }
    
    // Ordered lists
    if (trimmed.match(/^\d+\.\s/)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        const [, num, text] = match;
        const formatted = formatInlineMarkdown(text);
        output.push('  ' + chalk.cyan(num + '.') + ' ' + formatted);
        inList = true;
        continue;
      }
    }
    
    // Regular paragraphs
    if (trimmed) {
      const formatted = formatInlineMarkdown(trimmed);
      output.push(formatted);
    } else {
      output.push('');
    }
  }
  
  return output.join('\n');
}

/**
 * Formats inline markdown (bold, italic, code, links)
 * @param text - Text with inline markdown
 * @returns Formatted text with chalk styling
 */
function formatInlineMarkdown(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, (_, content) => chalk.bold(content));
  
  // Italic
  text = text.replace(/\*(.+?)\*/g, (_, content) => chalk.italic(content));
  text = text.replace(/_(.+?)_/g, (_, content) => chalk.italic(content));
  
  // Inline code
  text = text.replace(/`([^`]+)`/g, (_, content) => chalk.bgBlack.cyan(` ${content} `));
  
  // Links - show both text and URL
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => 
    chalk.blue(linkText) + chalk.dim(` (${url})`));
  
  return text;
}

/**
 * Renders a preview of markdown content with pagination
 * @param markdown - Full markdown content
 * @param maxLines - Maximum lines to show (default: 50)
 * @returns Preview string
 */
export function renderMarkdownPreview(markdown: string, maxLines: number = 50): string {
  const rendered = renderMarkdown(markdown);
  const lines = rendered.split('\n');
  
  if (lines.length <= maxLines) {
    return rendered;
  }
  
  const preview = lines.slice(0, maxLines).join('\n');
  const remaining = lines.length - maxLines;
  
  return preview + '\n\n' + 
    chalk.dim(`... (${remaining} more lines - see full report in AI-CRITICAL-FINDINGS.md)`);
}

