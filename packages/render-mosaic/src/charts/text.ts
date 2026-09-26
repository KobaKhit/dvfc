import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import { wrapChartRender } from './helpers.js';

/**
 * Generate a text chart (narrative Markdown blocks)
 */
export function generateTextChart(chart: ChartSpec, _ctx: GeneratorContext): string {
  const content = chart.content || '';
  
  // Simple Markdown to HTML conversion (basic subset)
  const htmlContent = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return wrapChartRender(
    chart.id,
    `      container${chart.id}.innerHTML = \`
        <div style="padding: 0.35rem 0.15rem 0.25rem; line-height: 1.55; color: #102129; font-size: 0.92rem;">
          <p>${htmlContent}</p>
        </div>
      \`;`
  );
}
