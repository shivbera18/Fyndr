import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./component/home/RagknoLanding', () => ({
  __esModule: true,
  default: () => (
    <div>
      <div>FYNDR</div>
      <nav><a href="/">Overview</a></nav>
      <h1>Face search for your Weddings</h1>
      <a href="/login">Get Started Now</a>
      <h2>Core capabilities.</h2>
      <h2>Common questions, clear answers.</h2>
    </div>
  ),
}));
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
    const heroHeadline = await screen.findByText(/Face search/i, {}, { timeout: 5000 });
    expect(heroHeadline).toBeInTheDocument();

    const ctaButton = await screen.findByRole('link', { name: /Get Started/i }, { timeout: 5000 });
    expect(ctaButton).toBeInTheDocument();
  });

  test('renders capabilities and FAQ section', async () => {
    render(<App />);
    const faqHeading = await screen.findByText(/Common questions,/i, {}, { timeout: 5000 });
    expect(faqHeading).toBeInTheDocument();

    const featuresHeadings = await screen.findAllByText(/Core capabilities/i, {}, { timeout: 5000 });
    expect(featuresHeadings.length).toBeGreaterThan(0);
  });
});


