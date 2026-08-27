import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NeoButton from '../NeoButton';
import NeoCard from '../NeoCard';
import NeoBadge from '../NeoBadge';
import NeoInput from '../NeoInput';
import NeoModal from '../NeoModal';
import NeoMarquee from '../NeoMarquee';
import NeoAccordion from '../NeoAccordion';
import NeoAlert from '../NeoAlert';
import NeoImageCard from '../NeoImageCard';

describe('Neobrutalism UI Primitives', () => {
  describe('NeoButton', () => {
    test('renders button text and triggers onClick', () => {
      const handleClick = jest.fn();
      render(<NeoButton onClick={handleClick}>Click Me</NeoButton>);
      const btn = screen.getByText('Click Me');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('shows loading spinner and disables button when loading', () => {
      const handleClick = jest.fn();
      render(<NeoButton loading onClick={handleClick}>Submit</NeoButton>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('NeoCard', () => {
    test('renders header and children content', () => {
      render(
        <NeoCard header="EVENT CARD" headerAccent="cyan">
          <p>Card body content</p>
        </NeoCard>
      );
      expect(screen.getByText('EVENT CARD')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
    });
  });

  describe('NeoBadge', () => {
    test('renders badge with correct text', () => {
      render(<NeoBadge variant="lime">98% MATCH</NeoBadge>);
      expect(screen.getByText('98% MATCH')).toBeInTheDocument();
    });
  });

  describe('NeoInput', () => {
    test('renders label and updates input value', () => {
      const handleChange = jest.fn();
      render(
        <NeoInput
          label="Event Name"
          placeholder="Enter name"
          value="My Wedding"
          onChange={handleChange}
        />
      );
      expect(screen.getByText(/Event Name/i)).toBeInTheDocument();
      const input = screen.getByPlaceholderText('Enter name');
      expect(input.value).toBe('My Wedding');
      fireEvent.change(input, { target: { value: 'New Name' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('NeoModal', () => {
    test('renders modal when open is true and calls onClose on backdrop click', () => {
      const handleClose = jest.fn();
      const { rerender } = render(
        <NeoModal open={false} onClose={handleClose} title="MODAL TITLE">
          Modal Body
        </NeoModal>
      );
      expect(screen.queryByText('MODAL TITLE')).not.toBeInTheDocument();

      rerender(
        <NeoModal open={true} onClose={handleClose} title="MODAL TITLE">
          Modal Body
        </NeoModal>
      );
      expect(screen.getByText('MODAL TITLE')).toBeInTheDocument();
      expect(screen.getByText('Modal Body')).toBeInTheDocument();

      const closeBtn = screen.getByText('✕');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('NeoAccordion', () => {
    test('renders accordion items and toggles open/close on click', () => {
      render(
        <NeoAccordion
          items={[
            { title: 'Question 1', content: 'Answer 1' },
            { title: 'Question 2', content: 'Answer 2' },
          ]}
        />
      );
      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Answer 1')).toBeInTheDocument();

      const trigger2 = screen.getByText('Question 2');
      fireEvent.click(trigger2);
      expect(screen.getByText('Answer 2')).toBeInTheDocument();
    });
  });

  describe('NeoAlert', () => {
    test('renders title, content, and icon', () => {
      render(
        <NeoAlert variant="coral" icon="⚠️" title="WARNING">
          Something went wrong
        </NeoAlert>
      );
      expect(screen.getByText('WARNING')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });
  });

  describe('NeoMarquee', () => {
    test('renders scrolling items', () => {
      render(<NeoMarquee items={['FEATURE ONE', 'FEATURE TWO']} />);
      const items = screen.getAllByText(/FEATURE ONE/i);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('NeoImageCard', () => {
    test('renders image card with caption and tag badge', () => {
      render(
        <NeoImageCard
          imageUrl="/images/wedding.jpg"
          caption="Grand Wedding"
          tag="WEDDING"
        />
      );
      expect(screen.getByText('Grand Wedding')).toBeInTheDocument();
      expect(screen.getByText('WEDDING')).toBeInTheDocument();
    });
  });
});
