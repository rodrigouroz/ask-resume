import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("Ask Rodrigo public interface", () => {
  it("presents professional experience before independent projects", () => {
    render(<App />);

    const experience = screen.getByRole("heading", { name: "Professional experience" });
    const projects = screen.getByRole("heading", { name: "Independent projects" });

    expect(
      experience.compareDocumentPosition(projects) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("switches the public resume and assistant to Spanish", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "ES" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Ingeniero de software que lleva productos desde la ambigüedad hasta la operación.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Trabaja como Fullstack Software Engineer, contribuyendo a la plataforma web en TypeScript, integraciones de producto, funcionalidades con LLMs y la experiencia de desarrollo.",
      ),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("ask-rodrigo-language")).toBe("es");
  });

  it("opens the compact navigation and follows a section link", async () => {
    const user = userEvent.setup();
    render(<App />);

    const menu = screen.getByRole("button", { name: "Open menu" });
    await user.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("link", { name: "Experience" }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("uses the browser print surface for the downloadable CV", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "Download CV" })[0]!);

    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it.each([
    {
      question: "How does Rodrigo approach zero-to-one products?",
      source: "[Product engineering · Capabilities]",
      href: "#capabilities",
    },
    {
      question: "What did Rodrigo build in Coro?",
      source: "[Coro · Independent projects]",
      href: "#projects",
    },
  ])(
    "links the answer for '$question' to its visible source",
    async ({ question, source, href }) => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByRole("textbox", {
        name: "Ask about experience, projects, or skills…",
      });
      await user.type(input, question);
      await user.click(screen.getByRole("button", { name: "Send question" }));

      expect(screen.getByRole("link", { name: source })).toHaveAttribute("href", href);
    },
  );

  it("opens a cited answer from an experience action", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Close Ask Rodrigo" }));
    await user.click(screen.getByRole("button", { name: "Ask about ClassDojo" }));

    expect(screen.getByRole("link", { name: "[ClassDojo · Experience]" })).toBeInTheDocument();
  });

  it("shows an honest fallback without a misleading source link", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole("textbox", {
      name: "Ask about experience, projects, or skills…",
    });
    await user.clear(input);
    await user.type(input, "What salary is Rodrigo expecting?");
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(
      screen.getByText(
        "I don’t have an approved source for that. You can contact Rodrigo directly and ask him.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("[No approved source]")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "[No approved source]" })).not.toBeInTheDocument();
  });

  it("moves keyboard focus into the question field when the assistant is reopened", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Close Ask Rodrigo" }));
    const openButtons = screen.getAllByRole("button", { name: "Ask Rodrigo" });
    expect(openButtons[0]).toBeDefined();
    await user.click(openButtons[0]!);

    expect(
      screen.getByRole("textbox", { name: "Ask about experience, projects, or skills…" }),
    ).toHaveFocus();
  });
});
