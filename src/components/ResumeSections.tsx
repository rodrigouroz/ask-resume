import type { Language } from "../content";
import {
  assetUrl,
  capabilities,
  contact,
  copy,
  education,
  experiences,
  externalLinks,
  presentation,
  profileIdentity,
  profileSections,
  projects,
} from "../content";
import {
  AdventureIcon,
  ArrowRightIcon,
  ExternalIcon,
  GlobeIcon,
  MailIcon,
  PortfolioIcon,
  TraceIcon,
} from "./Icons";

type SectionProps = {
  language: Language;
  onAsk: (question: string) => void;
};

type HeroProps = {
  language: Language;
  onOpenAssistant: () => void;
};

export function Hero({ language, onOpenAssistant }: HeroProps) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">{text(copy.hero.title)}</h1>
        <p>{text(copy.hero.body)}</p>
        <div className="hero-actions">
          <a className="primary-button" href="#experience">
            {text(copy.hero.action)}
            <ArrowRightIcon />
          </a>
          <button className="text-link hero-ask" type="button" onClick={onOpenAssistant}>
            {text(copy.chat.cta)}
          </button>
          <a className="secondary-button mobile-hero-download" href={externalLinks.cv} download>
            {text(copy.download)}
          </a>
        </div>
        <p className="location-line">
          <GlobeIcon />
          {text(copy.hero.location)}
        </p>
      </div>
    </section>
  );
}

export function ExperienceSection({ language, onAsk }: SectionProps) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <section
      id="experience"
      className="section-block experience-section"
      aria-labelledby="experience-title"
    >
      <div className="section-heading">
        <h2 id="experience-title">{text(copy.sections.experience)}</h2>
      </div>
      <div className="experience-list">
        {experiences.map((experience) => (
          <article className="experience-row" key={experience.id}>
            <span className="timeline-dot" aria-hidden="true" />
            <div className="experience-company">
              <h3>
                {experience.brand.kind === "asset" ? (
                  <span
                    className={`experience-brand experience-brand--${experience.brand.treatment ?? "light"}`}
                    aria-hidden="true"
                  >
                    <img
                      src={assetUrl(experience.brand.asset)}
                      alt=""
                      width="108"
                      height="36"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                ) : (
                  <span className="experience-brand experience-brand--fallback" aria-hidden="true">
                    {experience.brand.text}
                  </span>
                )}
                <span className="experience-company-name sr-only">{experience.company}</span>
              </h3>
            </div>
            <p className="experience-role">{text(experience.role)}</p>
            <p className="experience-period">{experience.period}</p>
            <p className="experience-summary">{text(experience.summary)}</p>
            <button
              type="button"
              aria-label={
                language === "en"
                  ? `Ask about ${experience.company}`
                  : `Preguntar sobre ${experience.company}`
              }
              onClick={() =>
                onAsk(
                  language === "en"
                    ? `What has ${profileIdentity.firstName} worked on at ${experience.company}?`
                    : `¿En qué trabajó ${profileIdentity.firstName} en ${experience.company}?`,
                )
              }
            >
              <ArrowRightIcon />
            </button>
          </article>
        ))}
      </div>
      <p className="career-note">{text(presentation.careerNote)}</p>
    </section>
  );
}

export function CapabilitiesSection({ language }: Pick<SectionProps, "language">) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <section id="capabilities" className="section-block" aria-labelledby="capabilities-title">
      <div className="section-heading">
        <h2 id="capabilities-title">{text(copy.sections.capabilities)}</h2>
      </div>
      <div className="capability-grid">
        {capabilities.map((capability, index) => (
          <article className="capability" key={capability.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{text(capability.name)}</h3>
              <p>{text(capability.details)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProjectsSection({ language, onAsk }: SectionProps) {
  const text = (value: Record<Language, string>) => value[language];
  const projectIcons = {
    globe: GlobeIcon,
    trace: TraceIcon,
    portfolio: PortfolioIcon,
    adventure: AdventureIcon,
  } as const;

  return (
    <section
      id="projects"
      className="section-block projects-section"
      aria-labelledby="projects-title"
    >
      <div className="section-heading projects-heading">
        <h2 id="projects-title">{text(copy.sections.projects)}</h2>
        <p>{text(copy.sections.projectsIntro)}</p>
      </div>
      <div className="project-list">
        {projects.map((project) => {
          const ProjectIcon = projectIcons[project.icon];

          return (
            <article className="project-row" key={project.id}>
              <ProjectIcon className="project-icon" />
              <h3>{project.name}</h3>
              <p>{text(project.summary)}</p>
              <p className="project-evidence">{project.evidence}</p>
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  language === "en"
                    ? `Open ${project.name} live site`
                    : `Abrir sitio de ${project.name}`
                }
              >
                {text(copy.projectActions.live)} <ExternalIcon />
              </a>
              <button
                className="text-link"
                type="button"
                aria-label={
                  language === "en"
                    ? `Ask about ${project.name}`
                    : `Preguntar sobre ${project.name}`
                }
                onClick={() =>
                  onAsk(
                    language === "en"
                      ? `What did ${profileIdentity.firstName} build in ${project.name}?`
                      : `¿Qué construyó ${profileIdentity.firstName} en ${project.name}?`,
                  )
                }
              >
                {text(copy.projectActions.ask)}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AboutSection({ language }: Pick<SectionProps, "language">) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <div id="about">
      {profileSections.education && (
        <section id="education" className="section-block" aria-labelledby="education-title">
          <div className="section-heading">
            <h2 id="education-title">{text(copy.sections.education)}</h2>
          </div>
          <div className="education-grid">
            {education.map((item) => (
              <article key={item.id}>
                <h3>{item.title}</h3>
                <p>{text(item.detail)}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {presentation.mentoring && (
        <section className="minor-section" aria-labelledby="mentoring-title">
          <h2 id="mentoring-title">{text(copy.sections.mentoring)}</h2>
          <a href={presentation.mentoring.url} target="_blank" rel="noreferrer">
            {text(presentation.mentoring.label)} <ExternalIcon />
          </a>
        </section>
      )}

      {presentation.beyond && (
        <section className="minor-section beyond-section" aria-labelledby="beyond-title">
          <h2 id="beyond-title">{text(copy.sections.beyond)}</h2>
          <p>{text(presentation.beyond)}</p>
        </section>
      )}
    </div>
  );
}

export function ContactSection({ language }: { language: Language }) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <footer className="contact-section">
      <div className="contact-heading">
        <h2>{text(copy.contact.title)}</h2>
        <p>{text(copy.contact.body)}</p>
      </div>
      <div className="contact-links">
        <a href={externalLinks.email}>
          <MailIcon /> {contact.email}
        </a>
        <a href={externalLinks.github} target="_blank" rel="noreferrer">
          {contact.githubLabel} <ExternalIcon />
        </a>
        <a className="text-link" href={externalLinks.cv} download>
          {text(copy.download)}
        </a>
      </div>
      <div className="footer-meta">
        <p>{presentation.footer.copyright}</p>
        <p>{text(presentation.footer.privacy)}</p>
      </div>
    </footer>
  );
}
