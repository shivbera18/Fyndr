import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Fyndr Web App Routing & Landing', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  test('renders FYNDR brand logo and navigation links', async () => {
    render(<App />);
    const brandElements = await screen.findAllByText(/FYNDR/i, {}, { timeout: 5000 });
    expect(brandElements.length).toBeGreaterThan(0);

    const overviewLinks = await screen.findAllByText(/Overview/i, {}, { timeout: 5000 });
    expect(overviewLinks.length).toBeGreaterThan(0);
  });

  test('renders main hero headline and call-to-action buttons', async () => {
    render(<App />);
    const heroHeadline = await screen.findByText(/FIND YOURSELF IN/i, {}, { timeout: 5000 });
    expect(heroHeadline).toBeInTheDocument();

    const ctaButton = await screen.findByRole('button', { name: /Create Free Event/i }, { timeout: 5000 });
    expect(ctaButton).toBeInTheDocument();
  });

  test('renders features and FAQ section', async () => {
    render(<App />);
    const faqHeading = await screen.findByText(/Frequently Asked Questions/i, {}, { timeout: 5000 });
    expect(faqHeading).toBeInTheDocument();

    const featuresHeadings = await screen.findAllByText(/Built for modern event photographers/i, {}, { timeout: 5000 });
    expect(featuresHeadings.length).toBeGreaterThan(0);
  });
});


