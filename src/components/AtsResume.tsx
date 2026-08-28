import type { Language } from "../content";
import {
  capabilities,
  contact,
  copy,
  education,
  experiences,
  presentation,
  profileIdentity,
  profileSections,
  projects,
} from "../content";

export function AtsResume({ language }: { language: Language }) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <main className="ats-resume" aria-labelledby="ats-resume-name">
      <header>
        <h1 id="ats-resume-name">{profileIdentity.name}</h1>
        <p className="ats-headline">{profileIdentity.headline}</p>
        <address>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <span aria-hidden="true"> · </span>
          <a href={contact.githubUrl}>{contact.githubUrl.replace(/^https?:\/\//, "")}</a>
          <span aria-hidden="true"> · </span>
          <span>{text(copy.hero.location)}</span>
        </address>
      </header>

      <section aria-labelledby="ats-summary-title">
        <h2 id="ats-summary-title">{language === "en" ? "Summary" : "Perfil"}</h2>
        <p>{text(copy.hero.body)}</p>
      </section>

      <section aria-labelledby="ats-experience-title">
        <h2 id="ats-experience-title">{text(copy.sections.experience)}</h2>
        {experiences.map((experience) => (
          <article key={experience.id}>
            <div className="ats-row">
              <h3>
                {experience.company}, {text(experience.role)}
              </h3>
              <p>{experience.period}</p>
            </div>
            <p>{text(experience.summary)}</p>
          </article>
        ))}
        <p className="ats-career-note">{text(presentation.careerNote)}</p>
      </section>

      {profileSections.capabilities && (
        <section aria-labelledby="ats-capabilities-title">
          <h2 id="ats-capabilities-title">{text(copy.sections.capabilities)}</h2>
          <ul>
            {capabilities.map((capability) => (
              <li key={capability.id}>
                <strong>{text(capability.name)}:</strong> {text(capability.details)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profileSections.projects && (
        <section aria-labelledby="ats-projects-title">
          <h2 id="ats-projects-title">{text(copy.sections.projects)}</h2>
          {projects.map((project) => (
            <article key={project.id}>
              <div className="ats-row">
                <h3>{project.name}</h3>
                <a href={project.url}>{project.url}</a>
              </div>
              <p>
                {text(project.summary)} {project.evidence}
              </p>
            </article>
          ))}
        </section>
      )}

      {profileSections.education && (
        <section aria-labelledby="ats-education-title">
          <h2 id="ats-education-title">{text(copy.sections.education)}</h2>
          {education.map((item) => (
            <article key={item.id}>
              <h3>{text(item.title)}</h3>
              <p>{text(item.detail)}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
