import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Fyndr Web App Routing & Landing', () => {
  test('renders FYNDR brand logo and navigation links', async () => {
    render(<App />);
    const brandElements = await screen.findAllByText(/FYNDR/i);
    expect(brandElements.length).toBeGreaterThan(0);

    const overviewLinks = await screen.findAllByText(/Overview/i);
    expect(overviewLinks.length).toBeGreaterThan(0);
  });

  test('renders main hero headline and call-to-action buttons', async () => {
    render(<App />);
    const heroHeadline = await screen.findByText(/FIND YOURSELF IN/i);
    expect(heroHeadline).toBeInTheDocument();

    const ctaButton = await screen.findByRole('button', { name: /Create Free Event/i });
    expect(ctaButton).toBeInTheDocument();
  });

  test('renders features and FAQ section', async () => {
    render(<App />);
    const faqHeading = await screen.findByText(/Frequently Asked Questions/i);
    expect(faqHeading).toBeInTheDocument();

    const featuresHeadings = await screen.findAllByText(/Built for modern event photographers/i);
    expect(featuresHeadings.length).toBeGreaterThan(0);
  });
});

