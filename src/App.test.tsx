import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function mockMobileViewport() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn<(query: string) => MediaQueryList>((query) => {
      return {
        matches: query === "(max-width: 860px)",
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      };
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/analytics") return new Response(null, { status: 204 });
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
              answer: normalized.includes("bullets")
                ? "At ClassDojo, Rodrigo worked on: - TypeScript migration. - Product integrations. - LLM developer workflows."
                : "A grounded test answer.",
              citations: [{ sourceId, sectionId }],
            }
          : {
              status: "unknown",
              language: uiLanguage,
              answer: "I don’t have enough information to answer that.",
              citations: [],
            },
      );
    }),
  );
});

function analyticsCalls() {
  return vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/analytics");
}

function askCalls() {
  return vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/ask");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Ask Rodrigo public interface", () => {
  it("starts with an empty conversation and only asks after typed input", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.queryByText("Ask about Rodrigo’s experience, skills, or independent projects."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "What is Rodrigo working on at ClassDojo?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask a focused question" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Close Rodrigo’s assistant" }));
    const hero = screen.getByRole("region", {
      name: "Software engineer building products from ambiguity to operation.",
    });
    await user.click(within(hero).getByRole("button", { name: "Ask about Rodrigo" }));
    expect(analyticsCalls()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Close Rodrigo’s assistant" }));
    await user.click(within(hero).getByRole("button", { name: "Ask about Rodrigo" }));
    expect(analyticsCalls()).toHaveLength(1);

    const input = screen.getByRole("textbox", {
      name: "Ask about experience, projects, or skills…",
    });
    await user.type(input, "What is Rodrigo working on at ClassDojo?");
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("A grounded test answer.")).toBeInTheDocument();
    expect(analyticsCalls()).toHaveLength(1);
    expect(askCalls()).toHaveLength(1);
  });

  it("shows a concise accessible loading state while answering", async () => {
    vi.mocked(fetch).mockImplementation((url) =>
      url === "/api/analytics"
        ? Promise.resolve(new Response(null, { status: 204 }))
        : new Promise(() => undefined),
    );
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole("textbox", {
      name: "Ask about experience, projects, or skills…",
    });
    await user.type(input, "What is Rodrigo working on at ClassDojo?");
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(screen.getByRole("status", { name: "Answering…" })).toBeInTheDocument();
    expect(screen.getByText("What is Rodrigo working on at ClassDojo?")).toBeInTheDocument();
  });

  it("renders parallel answer facts as a semantic list", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole("textbox", {
      name: "Ask about experience, projects, or skills…",
    });
    await user.type(input, "List ClassDojo work as bullets");
    await user.click(screen.getByRole("button", { name: "Send question" }));

    const list = await screen.findByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("TypeScript migration.")).toBeInTheDocument();
  });

  it("presents professional experience before independent projects", () => {
    render(<App />);

    const experience = screen.getByRole("heading", { name: "Professional experience" });
    const projects = screen.getByRole("heading", { name: "Independent projects" });

    expect(
      screen.getByText(
        "Contributed to TypeScript platform modernization, Tutor integration, district communications and insights, and AI-assisted product and developer workflows.",
      ),
    ).toBeInTheDocument();

    expect(
      experience.compareDocumentPosition(projects) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("links Daturno as a public independent product", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "Open Daturno live site" })).toHaveAttribute(
      "href",
      "https://daturno.com",
    );
  });

  it("switches the public resume and assistant to Spanish", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "Switch language to Spanish" })[0]!);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Ingeniero de software que lleva productos desde la ambigüedad hasta la operación.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Asistente de Rodrigo" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "Preguntá sobre experiencia, proyectos o habilidades…",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Contribuí a la modernización de la plataforma en TypeScript, la integración de Tutor, comunicaciones e insights distritales y flujos de producto y desarrollo asistidos por IA.",
      ),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("ask-rodrigo-language")).toBe("es");
    expect(document.documentElement).toHaveAttribute("lang", "es");
    expect(screen.getByRole("button", { name: "Enviar pregunta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preguntar sobre ClassDojo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir sitio de Coro" })).toBeInTheDocument();
  });

  it("uses the first supported browser language when no preference was saved", () => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["pt-BR", "es-AR", "en-US"]);

    render(<App />);

    expect(document.documentElement).toHaveAttribute("lang", "es");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Ingeniero de software que lleva productos desde la ambigüedad hasta la operación.",
      }),
    ).toBeInTheDocument();
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
    expect(menu).toHaveAttribute("aria-controls", "mobile-navigation");
    await user.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveFocus();

    await user.click(menu);
    await user.click(screen.getByRole("link", { name: "Experience" }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("removes the closed assistant from keyboard and assistive-technology navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const panel = screen.getByRole("complementary", { name: "Rodrigo’s assistant" });
    await user.click(screen.getByRole("button", { name: "Close Rodrigo’s assistant" }));

    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveAttribute("inert");
  });

  it("treats the mobile assistant as a modal and restores focus after Escape", async () => {
    mockMobileViewport();
    const user = userEvent.setup();
    render(<App />);

    const opener = screen.getAllByRole("button", { name: "Ask about Rodrigo" }).at(-1)!;
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Rodrigo’s assistant" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.querySelector(".page-shell")).toHaveAttribute("inert");
    expect(document.body).toHaveClass("assistant-modal-open");
    expect(
      screen.getByRole("textbox", { name: "Ask about experience, projects, or skills…" }),
    ).toHaveFocus();

    const firstDialogControl = screen.getByRole("button", { name: "New chat" });
    const lastDialogControl = screen.getByRole("link", { name: "Contact Rodrigo" });
    lastDialogControl.focus();
    await user.tab();
    expect(firstDialogControl).toHaveFocus();
    await user.tab({ shift: true });
    expect(lastDialogControl).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(dialog).toHaveAttribute("aria-hidden", "true"));
    expect(document.querySelector(".page-shell")).not.toHaveAttribute("inert");
    expect(document.body).not.toHaveClass("assistant-modal-open");
    expect(opener).toHaveFocus();
  });

  it("shows an inline error for an empty question and exposes form metadata", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole("textbox", {
      name: "Ask about experience, projects, or skills…",
    });
    expect(input).toHaveAttribute("name", "question");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("maxlength", "500");

    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a question before sending.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();

    await user.type(input, "What did Rodrigo build in Coro?");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Close Rodrigo’s assistant" }));
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
      await screen.findByText("I don’t have enough information to answer that."),
    ).toBeInTheDocument();
    const assistant = screen.getByRole("complementary", { name: "Rodrigo’s assistant" });
    expect(within(assistant).getByRole("link", { name: "hello@rodrigouroz.com" })).toHaveAttribute(
      "href",
      "mailto:hello@rodrigouroz.com",
    );
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

    const calls = askCalls();
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

    await user.click(screen.getByRole("button", { name: "Close Rodrigo’s assistant" }));
    const openButtons = screen.getAllByRole("button", { name: "Ask about Rodrigo" });
    expect(openButtons[0]).toBeDefined();
    await user.click(openButtons[0]!);

    expect(
      screen.getByRole("textbox", { name: "Ask about experience, projects, or skills…" }),
    ).toHaveFocus();
  });
});
