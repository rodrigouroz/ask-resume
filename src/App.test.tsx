import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (typeof init?.body !== "string") throw new Error("Expected a JSON request body");
      const { question, uiLanguage } = JSON.parse(init.body) as {
        question: string;
        uiLanguage: "en" | "es";
      };
      const normalized = question.toLocaleLowerCase();
      const sourceId = normalized.includes("coro")
        ? "coro-product"
        : normalized.includes("zero")
          ? "product-engineering-capability"
          : normalized.includes("classdojo")
            ? "classdojo-current-role"
            : null;
      const sectionId =
        sourceId === "coro-product"
          ? "projects"
          : sourceId?.includes("capability")
            ? "capabilities"
            : "experience";
      return Response.json(
        sourceId
          ? {
              status: "answered",
              language: uiLanguage,
              answer: "A grounded test answer.",
              citations: [{ sourceId, sectionId }],
            }
          : {
              status: "unknown",
              language: uiLanguage,
              answer:
                "I don’t have enough approved evidence to answer that. You can contact Rodrigo directly and ask him.",
              citations: [],
            },
      );
    }),
  );
});

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
    expect(document.documentElement).toHaveAttribute("lang", "es");
  });

  it("restores the document language from the saved UI preference", () => {
    window.localStorage.setItem("ask-rodrigo-language", "es");

    render(<App />);

    expect(document.documentElement).toHaveAttribute("lang", "es");
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

  it("downloads the canonical generated CV", () => {
    render(<App />);

    expect(screen.getAllByRole("link", { name: "Download CV" })[0]).toHaveAttribute(
      "href",
      "/rodrigo-uroz-cv.pdf",
    );
    expect(screen.getAllByRole("link", { name: "Download CV" })[0]).toHaveAttribute("download");
  });

  it.each([
    {
      question: "How does Rodrigo approach zero-to-one products?",
      source: "[Product engineering · Capabilities]",
      href: "#capabilities",
    },
    {
      question: "What did Rodrigo build in Coro?",
      source: "[Coro · Independent project]",
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

      expect(await screen.findByRole("link", { name: source })).toHaveAttribute("href", href);
    },
  );

  it("opens a cited answer from an experience action", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Close Ask Rodrigo" }));
    await user.click(screen.getByRole("button", { name: "Ask about ClassDojo" }));

    expect(
      await screen.findByRole("link", { name: "[ClassDojo · Experience]" }),
    ).toBeInTheDocument();
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
      await screen.findByText(
        "I don’t have enough approved evidence to answer that. You can contact Rodrigo directly and ask him.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("[No approved source]")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "[No approved source]" })).not.toBeInTheDocument();
  });

  it("keeps up to six completed turns in-tab and sends them only as conversation context", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("textbox", {
      name: "Ask about experience, projects, or skills…",
    });

    await user.type(input, "What did Rodrigo build in Coro?");
    await user.click(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText("A grounded test answer.")).toBeInTheDocument();

    await user.type(input, "Why did he build it?");
    await user.click(screen.getByRole("button", { name: "Send question" }));

    const calls = vi.mocked(fetch).mock.calls;
    const requestBody = calls.at(-1)?.[1]?.body;
    if (typeof requestBody !== "string") throw new Error("Expected a serialized request body");
    const secondBody = JSON.parse(requestBody) as {
      history: Array<{ question: string; answer: string }>;
      safetyId: string;
    };
    expect(secondBody.history).toEqual([
      { question: "What did Rodrigo build in Coro?", answer: "A grounded test answer." },
    ]);
    expect(secondBody.safetyId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(screen.getByText("What did Rodrigo build in Coro?")).toBeInTheDocument();
    expect(screen.getByText("Why did he build it?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.queryByText("What did Rodrigo build in Coro?")).not.toBeInTheDocument();
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
