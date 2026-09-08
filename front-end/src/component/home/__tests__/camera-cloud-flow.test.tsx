import { render, screen, fireEvent, act } from '@testing-library/react';
import { CameraCloudFlow } from '../CameraCloudFlow';

jest.useFakeTimers();

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }),
      configurable: true,
    });
  }
  if (!window.IntersectionObserver) {
    Object.defineProperty(window, 'IntersectionObserver', {
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
      configurable: true,
    });
  }
});

const digits = (el: HTMLElement) => Number((el.textContent ?? '').replace(/[^0-9]/g, ''));

describe('CameraCloudFlow', () => {
  test('renders four levels and the fire button', () => {
    render(<CameraCloudFlow />);
    expect(screen.getByText(/Shooter A · Canon/)).toBeInTheDocument();
    expect(screen.getByText('FTP ingest')).toBeInTheDocument();
    expect(screen.getByText('AI pipeline')).toBeInTheDocument();
    expect(screen.getByText('Live gallery')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fire a test shot/ })).toBeInTheDocument();
  });

  test('selecting a camera shows its login in the console', () => {
    render(<CameraCloudFlow />);
    expect(screen.getByTestId('flow-detail').textContent).not.toMatch(/evt_a3f9/);
    fireEvent.click(screen.getByRole('button', { name: /Shooter B · Nikon/ }));
    expect(screen.getByTestId('flow-detail').textContent).toMatch(/evt_a3f9.*_c/);
  });

  test('a fired shot travels the path and lands in the gallery', async () => {
    render(<CameraCloudFlow />);
    expect(digits(screen.getByTestId('gallery-count'))).toBe(1248);
    fireEvent.click(screen.getByRole('button', { name: /Fire a test shot/ }));
    expect(screen.getByRole('button', { name: /Shooter A · Canon/ })).toHaveClass('border-emerald-500/70');
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.getByTestId('flow-status').textContent).toMatch(/226 Transfer complete/);
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(digits(screen.getByTestId('gallery-count'))).toBe(1249);
    expect(screen.getByTestId('flow-status').textContent).toMatch(/live in the gallery/);
  });

  test('stepper pills select stages by step', () => {
    render(<CameraCloudFlow />);
    const pill = screen.getByRole('button', { name: 'Step 3: Pipeline' });
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('flow-detail').textContent).toMatch(/face-indexed/);
  });

  test('gallery tiles are real photos', () => {
    render(<CameraCloudFlow />);
    const imgs = screen.getAllByAltText(/Guest gallery photo/);
    expect(imgs.length).toBe(4);
    expect((imgs[0] as HTMLImageElement).src).toContain('picsum.photos');
  });
});
