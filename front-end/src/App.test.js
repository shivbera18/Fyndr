import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Fyndr Web App Routing & Landing', () => {
  test('renders FYNDR brand logo and navigation links', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/FYNDR/i);
    expect(brandElements.length).toBeGreaterThan(0);

    const overviewLinks = screen.getAllByText(/Overview/i);
    expect(overviewLinks.length).toBeGreaterThan(0);
  });

  test('renders main hero headline and call-to-action buttons', () => {
    render(<App />);
    const heroHeadline = screen.getByText(/FIND YOURSELF IN/i);
    expect(heroHeadline).toBeInTheDocument();

    const ctaButton = screen.getByText(/Start free/i);
    expect(ctaButton).toBeInTheDocument();
  });

  test('renders features and FAQ section', () => {
    render(<App />);
    const faqHeading = screen.getByText(/EVERYTHING YOU NEED TO KNOW/i);
    expect(faqHeading).toBeInTheDocument();

    const subSecondSearch = screen.getByText(/SUB-SECOND SEARCH/i);
    expect(subSecondSearch).toBeInTheDocument();
  });
});
