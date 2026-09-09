import { fireEvent, render, screen } from "@testing-library/react";
import { Waveform } from "../waveform";

function renderWaveform(overrides: Partial<Parameters<typeof Waveform>[0]> = {}) {
  const props = {
    duration: 60,
    start: 10,
    end: 25,
    onChange: jest.fn(),
    onChorus: jest.fn(),
    onReset: jest.fn(),
    canChorus: false,
    ...overrides,
  };
  const view = render(<Waveform {...props} />);
  return { ...props, rerender: view.rerender };
}

describe("Waveform", () => {
  it("labels the trim window and hides Chorus without peaks", () => {
    renderWaveform();
    // Visual readout + sr-only live node share the window text.
    expect(screen.getAllByText("0:10 – 0:25 of 1:00")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Chorus/ })).not.toBeInTheDocument();
  });
  it("shows Chorus with peaks and fires it", () => {
    const { onChorus } = renderWaveform({ peaks: [0.1, 0.9, 0.2], canChorus: true });
    fireEvent.click(screen.getByRole("button", { name: /Chorus/ }));
    expect(onChorus).toHaveBeenCalledTimes(1);
  });

  it("clamps slider moves to a valid window", () => {
    const { onChange } = renderWaveform();
    fireEvent.change(screen.getByLabelText("Trim start"), { target: { value: "24" } });
    expect(onChange).toHaveBeenCalledWith(24, 27);
    fireEvent.change(screen.getByLabelText("Trim end"), { target: { value: "11" } });
    expect(onChange).toHaveBeenCalledWith(10, 13);
  });

  it("fires reset", () => {
    const { onReset } = renderWaveform();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("exposes slider contracts and announces committed windows", () => {
    const { rerender, ...props } = renderWaveform();
    const start = screen.getByLabelText("Trim start");
    expect(start).toHaveAttribute("min", "0");
    expect(start).toHaveAttribute("max", "60");
    expect(start).toHaveAttribute("step", "0.5");
    rerender(<Waveform {...props} start={12} />);
    expect(screen.getAllByText("0:12 – 0:25 of 1:00")).toHaveLength(2);
  });

});
