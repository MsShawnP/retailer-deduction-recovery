import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ChapterNav from "./ChapterNav";

describe("ChapterNav", () => {
  it("renders all 4 chapter tabs", () => {
    render(<ChapterNav active={1} onChange={() => {}} />);
    expect(screen.getByText(/The Problem/)).toBeInTheDocument();
    expect(screen.getByText(/Why This Happens/)).toBeInTheDocument();
    expect(screen.getByText(/The Evidence Gap/)).toBeInTheDocument();
    expect(screen.getByText(/What to Do About It/)).toBeInTheDocument();
  });

  it("marks the active tab with the active class", () => {
    render(<ChapterNav active={3} onChange={() => {}} />);
    const tab3 = screen.getByText(/The Evidence Gap/).closest("button")!;
    const tab1 = screen.getByText(/The Problem/).closest("button")!;
    expect(tab3.className).toContain("active");
    expect(tab1.className).not.toContain("active");
  });

  it("calls onChange with the correct chapter id on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChapterNav active={1} onChange={onChange} />);

    await user.click(screen.getByText(/Why This Happens/));
    expect(onChange).toHaveBeenCalledWith(2);

    await user.click(screen.getByText(/What to Do About It/));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("renders chapter numbers 1–4", () => {
    const { container } = render(<ChapterNav active={1} onChange={() => {}} />);
    const nums = container.querySelectorAll(".chapter-num");
    expect(nums).toHaveLength(4);
    expect([...nums].map((n) => n.textContent)).toEqual(["1", "2", "3", "4"]);
  });

  it("updates active styling when active prop changes", () => {
    const { rerender } = render(<ChapterNav active={1} onChange={() => {}} />);
    const tab1 = screen.getByText(/The Problem/).closest("button")!;
    expect(tab1.className).toContain("active");

    rerender(<ChapterNav active={4} onChange={() => {}} />);
    expect(tab1.className).not.toContain("active");
    const tab4 = screen.getByText(/What to Do About It/).closest("button")!;
    expect(tab4.className).toContain("active");
  });
});
