import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell', () => {
  it('renders the empty input and result regions', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '入力' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '結果' })).toBeInTheDocument();
  });

  it('collapses the complete input region', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: /入力/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('入力モジュール準備中')).not.toBeVisible();
  });
});
