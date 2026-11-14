import { render, screen, fireEvent } from '@testing-library/react';
import { PWAInstallModal } from '../PWAInstallModal';
import { PWAInstallButton } from '../PWAInstallButton';
import { PWAStudioCard } from '../PWAStudioCard';

describe('PWA UI Components', () => {
  describe('PWAInstallModal', () => {
    test('offers installation after the modal loads on desktop/Android', async () => {
      const onInstall = jest.fn();
      const onOpenChange = jest.fn();

      render(
        <PWAInstallModal
          open={true}
          onOpenChange={onOpenChange}
          onInstall={onInstall}
          isIOS={false}
        />
      );

      const installBtn = await screen.findByRole('button', { name: /Install App/i });
      fireEvent.click(installBtn);
      expect(onInstall).toHaveBeenCalled();
    });

    test('lets iOS users dismiss the installation guide', async () => {
      const onInstall = jest.fn();
      const onOpenChange = jest.fn();

      render(
        <PWAInstallModal
          open={true}
          onOpenChange={onOpenChange}
          onInstall={onInstall}
          isIOS={true}
        />
      );

      fireEvent.click(await screen.findByRole('button', { name: /Got It!/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('PWAInstallButton', () => {
    test('renders custom label when provided in button variant', () => {
      // Simulate beforeinstallprompt so canInstall is true
      const mockPromptEvent = new Event('beforeinstallprompt');
      Object.assign(mockPromptEvent, {
        platforms: ['web'],
        prompt: jest.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      });
      window.dispatchEvent(mockPromptEvent);

      render(<PWAInstallButton variant="button" label="Download App" />);
      expect(screen.getByText('Download App')).toBeInTheDocument();
    });

    test('renders header pill variant when specified', () => {
      render(<PWAInstallButton variant="header" label="Quick Install" />);
      expect(screen.getByText('Quick Install')).toBeInTheDocument();
    });
  });

  describe('PWAStudioCard', () => {
    test('renders studio card with features and installation readiness', () => {
      render(<PWAStudioCard />);

      expect(screen.getByText(/Desktop & Mobile App/i)).toBeInTheDocument();
      expect(screen.getByText(/1-Click Launch/i)).toBeInTheDocument();
      expect(screen.getByText(/Offline Vault/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero Tab Clutter/i)).toBeInTheDocument();
    });
  });
});
