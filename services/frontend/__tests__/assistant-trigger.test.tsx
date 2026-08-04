import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssistantTrigger } from '@/components/assistant/assistant-trigger';

describe('AssistantTrigger', () => {
  it('renders the assistant trigger button', () => {
    render(<AssistantTrigger />);
    // The trigger's accessible name is its aria-label, "Toggle AI Assistant". This test
    // looked for /RO Assistant/i, which never matched — it could not run at all before
    // @testing-library/react was added, so the mismatch was never observed.
    const button = screen.getByRole('button', { name: /Toggle AI Assistant/i });
    expect(button).toBeDefined();
  });
});
