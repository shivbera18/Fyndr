import { fireEvent, render, screen } from "@testing-library/react";
import { Waveform } from "../waveform";

function renderWaveform(overrides: Partial<Parameters<typeof Waveform>[0]> = {}) {
  const onChange = jest.fn();
  const onChorus = jest.fn();
  const onReset = jest.fn();
  render(
    <Waveform
      duration={60}
      start={10}
      end={25}
      onChange={onChange}
      onChorus={onChorus}
      onReset={onReset}
      canChorus={false}
      {...overrides}
    />
  );
  return { onChange, onChorus, onReset };
}

describe("Waveform", () => {
  it("labels the trim window and hides Chorus without peaks", () => {
    renderWaveform();
    expect(screen.getByText("0:10 – 0:25 of 1:00")).toBeInTheDocument();
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
});
