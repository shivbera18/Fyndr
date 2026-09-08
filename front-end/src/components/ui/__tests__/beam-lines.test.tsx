import { render, screen } from '@testing-library/react';
import { Camera, Zap } from 'lucide-react';
import { BeamLines, type BeamSource, type BeamHub } from '../beam-lines';

const SOURCES: [BeamSource, BeamSource, BeamSource] = [
  { icon: <Camera className="size-5" />, boxClass: 'bg-blue-500/10', title: 'Shooter A', sub: 'sub a' },
  { icon: <Camera className="size-5" />, boxClass: 'bg-emerald-500/10', title: 'Shooter B', sub: 'sub b' },
  { icon: <Camera className="size-5" />, boxClass: 'bg-amber-500/10', title: 'Shooter C', sub: 'sub c' },
];
const HUB: BeamHub = { icon: <Zap className="size-4" />, title: 'Live gallery', sub: 'hub sub', pill: 'hub pill' };

describe('BeamLines', () => {
  test('default content is unchanged', () => {
    render(<BeamLines />);
    expect(screen.getByText('1. Photographer Upload')).toBeInTheDocument();
    expect(screen.getByText('Direct to Phone')).toBeInTheDocument();
  });

  test('renders custom sources merging into a custom hub', () => {
    render(<BeamLines sources={SOURCES} hub={HUB} showLabels={false} />);
    expect(screen.getByText('Shooter A')).toBeInTheDocument();
    expect(screen.getByText('Shooter B')).toBeInTheDocument();
    expect(screen.getByText('Shooter C')).toBeInTheDocument();
    expect(screen.getByText('Live gallery')).toBeInTheDocument();
    expect(screen.queryByText('hub pill')).not.toBeInTheDocument();
  });
});
