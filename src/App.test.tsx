import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { evidenceConfig } from "./evidence";
import { profile } from "./profile";

const firstExperience = profile.presentation.experiences[0]!;
const firstProject = profile.presentation.projects[0];
const experienceSource = evidenceConfig.items.find(({ title }) =>
  title.includes(firstExperience.company),
)!;
const projectSource = firstProject
  ? evidenceConfig.items.find(({ title }) => title.includes(firstProject.name))
  : undefined;
const capabilitySource = evidenceConfig.items.find(({ sectionId }) => sectionId === "capabilities");
const english = profile.presentation.copy;

const citationCases = [
  {
    question: `What has ${profile.identity.firstName} worked on at ${firstExperience.company}?`,
    source: `[${experienceSource.labels.en}]`,
    href: "#experience",
  },
  ...(capabilitySource
    ? [
        {
          question: `How does ${profile.identity.firstName} approach zero-to-one products?`,
          source: `[${capabilitySource.labels.en}]`,
          href: "#capabilities",
        },
      ]
    : []),
  ...(firstProject && projectSource
    ? [
        {
          question: `What did ${profile.identity.firstName} build in ${firstProject.name}?`,
          source: `[${projectSource.labels.en}]`,
          href: "#projects",
        },
      ]
    : []),
];

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
      const source =
        firstProject && projectSource && normalized.includes(firstProject.name.toLocaleLowerCase())
          ? projectSource
          : capabilitySource && normalized.includes("zero")
            ? capabilitySource
            : normalized.includes(firstExperience.company.toLocaleLowerCase())
              ? experienceSource
              : null;
      return Response.json(
        source
          ? {
              status: "answered",
              language: uiLanguage,
              answer: normalized.includes("bullets")
                ? `At ${firstExperience.company}, ${profile.identity.firstName} worked on: - Product discovery. - Software delivery. - Production validation.`
                : "A grounded test answer.",
              citations: [
                {
                  sourceId: source.sourceId,
                  sectionId: source.sectionId,
                  label: source.labels[uiLanguage],
                },
              ],
            }
          : {
              status: "unknown",
              language: uiLanguage,
              answer: english.chat.unknown.en,
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

describe("configured profile public interface", () => {
  it("starts with an empty conversation and only asks after typed input", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByText(english.chat.emptyBody.en)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `What is ${profile.identity.firstName} working on?` }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: english.chat.emptyTitle.en })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: english.chat.close.en }));
    const hero = screen.getByRole("region", {
      name: english.hero.title.en,
    });
    await user.click(within(hero).getByRole("button", { name: english.chat.cta.en }));
    expect(analyticsCalls()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: english.chat.close.en }));
    await user.click(within(hero).getByRole("button", { name: english.chat.cta.en }));
    expect(analyticsCalls()).toHaveLength(1);

    const input = screen.getByRole("textbox", {
      name: english.chat.placeholder.en,
    });
    await user.type(
      input,
      `What is ${profile.identity.firstName} working on at ${firstExperience.company}?`,
    );
    await user.click(screen.getByRole("button", { name: english.chat.send.en }));

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
      name: english.chat.placeholder.en,
    });
    const question = `What is ${profile.identity.firstName} working on at ${firstExperience.company}?`;
    await user.type(input, question);
    await user.click(screen.getByRole("button", { name: english.chat.send.en }));

    expect(screen.getByRole("status", { name: english.chat.thinking.en })).toBeInTheDocument();
    expect(screen.getByText(question)).toBeInTheDocument();
  });

  it("renders parallel answer facts as a semantic list", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole("textbox", {
      name: english.chat.placeholder.en,
    });
    await user.type(input, `List ${firstExperience.company} work as bullets`);
    await user.click(screen.getByRole("button", { name: english.chat.send.en }));

    const list = await screen.findByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("Product discovery.")).toBeInTheDocument();
  });

  it("presents professional experience before independent projects when configured", () => {
    render(<App />);

    const experience = screen.getByRole("heading", { name: english.sections.experience.en });
    const projects = screen.queryByRole("heading", { name: english.sections.projects.en });

    expect(screen.getByText(firstExperience.summary.en)).toBeInTheDocument();
    expect(
      firstProject
        ? Boolean(
            projects &&
            experience.compareDocumentPosition(projects) & Node.DOCUMENT_POSITION_FOLLOWING,
          )
        : projects === null,
    ).toBe(true);
    expect(Boolean(document.querySelector('nav a[href="#projects"]'))).toBe(Boolean(firstProject));
  });

  it("shows independent products only when configured", () => {
    render(<App />);

    const configuredLink = firstProject
      ? screen.queryByRole("link", { name: `Open ${firstProject.name} live site` })
      : null;
    expect(Boolean(document.querySelector("#projects"))).toBe(Boolean(firstProject));
    expect(configuredLink?.getAttribute("href") ?? null).toBe(firstProject?.url ?? null);
  });

  it("switches the public resume and assistant to Spanish", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getAllByRole("button", { name: "ES — Switch language to Spanish" })[0]!,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: english.hero.title.es,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: english.chat.title.es })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: english.chat.placeholder.es,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(firstExperience.summary.es)).toBeInTheDocument();
    expect(window.localStorage.getItem(`${profile.identity.slug}-language`)).toBe("es");
    expect(document.documentElement).toHaveAttribute("lang", "es");
    expect(screen.getByRole("button", { name: english.chat.send.es })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Preguntar sobre ${firstExperience.company}` }),
    ).toBeInTheDocument();
    const spanishProjectLink = firstProject
      ? screen.queryByRole("link", { name: `Abrir sitio de ${firstProject.name}` })
      : null;
    expect(Boolean(spanishProjectLink)).toBe(Boolean(firstProject));
  });

  it("uses the first supported browser language when no preference was saved", () => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["pt-BR", "es-AR", "en-US"]);

    render(<App />);

    expect(document.documentElement).toHaveAttribute("lang", "es");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: english.hero.title.es,
      }),
    ).toBeInTheDocument();
  });

  it("restores the document language from the saved UI preference", () => {
    window.localStorage.setItem(`${profile.identity.slug}-language`, "es");

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

    const panel = screen.getByRole("complementary", { name: english.chat.title.en });
    await user.click(screen.getByRole("button", { name: english.chat.close.en }));

    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveAttribute("inert");
  });

  it("treats the mobile assistant as a modal and restores focus after Escape", async () => {
    mockMobileViewport();
    const user = userEvent.setup();
    render(<App />);

    const opener = screen.getAllByRole("button", { name: english.chat.cta.en }).at(-1)!;
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: english.chat.title.en });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.querySelector(".page-shell")).toHaveAttribute("inert");
    expect(document.body).toHaveClass("assistant-modal-open");
    expect(screen.getByRole("textbox", { name: english.chat.placeholder.en })).toHaveFocus();

    const firstDialogControl = screen.getByRole("button", { name: english.chat.newChat.en });
    const lastDialogControl = screen.getByRole("link", { name: english.chat.contact.en });
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
      name: english.chat.placeholder.en,
    });
    expect(input).toHaveAttribute("name", "question");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("maxlength", "500");

    await user.click(screen.getByRole("button", { name: english.chat.send.en }));

    expect(screen.getByRole("alert")).toHaveTextContent(english.chat.questionRequired.en);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();

    await user.type(
      input,
      firstProject
        ? `What did ${profile.identity.firstName} build in ${firstProject.name}?`
        : `What has ${profile.identity.firstName} worked on at ${firstExperience.company}?`,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("downloads the canonical generated CV", () => {
    render(<App />);

    expect(screen.getAllByRole("link", { name: english.download.en })[0]).toHaveAttribute(
      "href",
      `/${profile.pdf.visualFileName}`,
    );
    expect(screen.getAllByRole("link", { name: english.download.en })[0]).toHaveAttribute(
      "download",
    );
  });

  it.each(citationCases)(
    "links the answer for '$question' to its visible source",
    async ({ question, source, href }) => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByRole("textbox", {
        name: english.chat.placeholder.en,
      });
      await user.type(input, question);
      await user.click(screen.getByRole("button", { name: english.chat.send.en }));

      expect(await screen.findByRole("link", { name: source })).toHaveAttribute("href", href);
    },
  );

  it("opens a cited answer from an experience action", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: english.chat.close.en }));
    await user.click(screen.getByRole("button", { name: `Ask about ${firstExperience.company}` }));

    expect(
      await screen.findByRole("link", { name: `[${experienceSource.labels.en}]` }),
    ).toBeInTheDocument();
  });

  it("shows an honest fallback without a misleading source link", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole("textbox", {
      name: english.chat.placeholder.en,
    });
    await user.clear(input);
    await user.type(input, `What salary is ${profile.identity.firstName} expecting?`);
    await user.click(screen.getByRole("button", { name: english.chat.send.en }));

    expect(await screen.findByText(english.chat.unknown.en)).toBeInTheDocument();
    const assistant = screen.getByRole("complementary", { name: english.chat.title.en });
    expect(within(assistant).getByRole("link", { name: profile.contact.email })).toHaveAttribute(
      "href",
      `mailto:${profile.contact.email}`,
    );
  });

  it("keeps up to six completed turns in-tab and sends them only as conversation context", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("textbox", {
      name: english.chat.placeholder.en,
    });

    const firstQuestion = firstProject
      ? `What did ${profile.identity.firstName} build in ${firstProject.name}?`
      : `What has ${profile.identity.firstName} worked on at ${firstExperience.company}?`;
    await user.type(input, firstQuestion);
    await user.click(screen.getByRole("button", { name: english.chat.send.en }));
    expect(await screen.findByText("A grounded test answer.")).toBeInTheDocument();

    await user.type(input, "Why did he build it?");
    await user.click(screen.getByRole("button", { name: english.chat.send.en }));

    const calls = askCalls();
    const requestBody = calls.at(-1)?.[1]?.body;
    if (typeof requestBody !== "string") throw new Error("Expected a serialized request body");
    const secondBody = JSON.parse(requestBody) as {
      history: Array<{ question: string; answer: string }>;
      safetyId: string;
    };
    expect(secondBody.history).toEqual([
      { question: firstQuestion, answer: "A grounded test answer." },
    ]);
    expect(secondBody.safetyId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(screen.getByText(firstQuestion)).toBeInTheDocument();
    expect(screen.getByText("Why did he build it?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: english.chat.newChat.en }));
    expect(screen.queryByText(firstQuestion)).not.toBeInTheDocument();
  });

  it("moves keyboard focus into the question field when the assistant is reopened", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: english.chat.close.en }));
    const openButtons = screen.getAllByRole("button", { name: english.chat.cta.en });
    expect(openButtons[0]).toBeDefined();
    await user.click(openButtons[0]!);

    expect(screen.getByRole("textbox", { name: english.chat.placeholder.en })).toHaveFocus();
  });
});
