import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssistantMarkdown } from '@/components/assistant/assistant-markdown';

/**
 * The model answers in markdown and the panel used to print it inside a <p>, so operators
 * saw literal asterisks and hashes. The emphasis is load-bearing here: it is what separates
 * a sourced figure from the prose around it.
 *
 * The sample is a real answer from the deployed assistant.
 */
const ANSWER = `Based on the findings for Unit E01 as of 2020-09-15, the recommendation is to **WAIT**.

### **Economics & Trade-offs**
*   **Daily Energy Penalty:** $0.15/day [modeled]
*   **CIP Cost:** $5,000 [modeled]
*   **Break-even Point:** 2,707 days
`;

describe('AssistantMarkdown', () => {
  it('renders emphasis as markup, not as literal asterisks', () => {
    const { container } = render(<AssistantMarkdown>{ANSWER}</AssistantMarkdown>);

    expect(container.querySelectorAll('strong').length).toBeGreaterThan(0);
    expect(screen.getByText('WAIT').tagName).toBe('STRONG');
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).not.toContain('###');
  });

  it('renders headings and bullet lists structurally', () => {
    const { container } = render(<AssistantMarkdown>{ANSWER}</AssistantMarkdown>);

    expect(container.querySelector('h3')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('keeps the figures and their provenance labels intact', () => {
    const { container } = render(<AssistantMarkdown>{ANSWER}</AssistantMarkdown>);

    for (const fragment of ['$0.15/day', '$5,000', '2,707 days', '[modeled]']) {
      expect(container.textContent).toContain(fragment);
    }
  });

  it('renders plain prose without introducing markup', () => {
    const { container } = render(
      <AssistantMarkdown>{"I don't know — no evidence for that unit."}</AssistantMarkdown>,
    );
    expect(container.textContent).toBe("I don't know — no evidence for that unit.");
    expect(container.querySelector('strong')).toBeNull();
  });

  it('puts wide tables in their own scroll container so the panel does not widen', () => {
    const table = '| unit | score |\n| --- | --- |\n| B03 | 92 |\n';
    const { container } = render(<AssistantMarkdown>{table}</AssistantMarkdown>);

    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });
});
