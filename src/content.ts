export type Language = "en" | "es";

export type LocalizedText = Record<Language, string>;

export type Experience = {
  company: string;
  role: LocalizedText;
  period: string;
  summary: LocalizedText;
};

export type Capability = {
  name: LocalizedText;
  details: LocalizedText;
};

export type Project = {
  name: string;
  summary: LocalizedText;
  evidence: string;
  url: string;
};

export const copy = {
  nav: {
    experience: { en: "Experience", es: "Experiencia" },
    capabilities: { en: "Capabilities", es: "Capacidades" },
    projects: { en: "Independent projects", es: "Proyectos independientes" },
    about: { en: "About", es: "Sobre mí" },
  },
  download: { en: "Download CV", es: "Descargar CV" },
  hero: {
    title: {
      en: "Software engineer building products from ambiguity to operation.",
      es: "Ingeniero de software que lleva productos desde la ambigüedad hasta la operación.",
    },
    body: {
      en: "For 25+ years, I’ve worked inside product and engineering teams—building systems, modernizing platforms, leading people, and turning unclear problems into software that works.",
      es: "Hace más de 25 años trabajo en equipos de producto e ingeniería: construyendo sistemas, modernizando plataformas, liderando personas y convirtiendo problemas poco claros en software que funciona.",
    },
    action: { en: "View experience", es: "Ver experiencia" },
    location: {
      en: "Buenos Aires · Working globally in English and Spanish",
      es: "Buenos Aires · Trabajo globalmente en inglés y español",
    },
  },
  sections: {
    experience: { en: "Professional experience", es: "Experiencia profesional" },
    capabilities: { en: "Capabilities", es: "Capacidades" },
    projects: { en: "Independent projects", es: "Proyectos independientes" },
    projectsIntro: {
      en: "Personal products I’ve designed and built end-to-end to explore product, technical, and domain problems.",
      es: "Productos personales que diseñé y construí de punta a punta para explorar problemas de producto, técnicos y de dominio.",
    },
    education: { en: "Education & teaching", es: "Educación y docencia" },
    mentoring: { en: "Mentoring", es: "Mentoría" },
    beyond: { en: "Beyond work", es: "Fuera del trabajo" },
  },
  contact: {
    title: {
      en: "Let’s talk about an interesting problem.",
      es: "Hablemos de un problema interesante.",
    },
    body: {
      en: "Roles, collaborations, and product conversations are welcome when the company, industry, or problem is compelling.",
      es: "Me interesan roles, colaboraciones y conversaciones de producto cuando la empresa, la industria o el problema son atractivos.",
    },
  },
  chat: {
    title: { en: "Rodrigo’s assistant", es: "Asistente de Rodrigo" },
    cta: { en: "Ask about Rodrigo", es: "Preguntá sobre Rodrigo" },
    close: { en: "Close Rodrigo’s assistant", es: "Cerrar asistente de Rodrigo" },
    welcome: {
      en: "Ask about Rodrigo’s experience, skills, or independent projects.",
      es: "Preguntá sobre la experiencia, habilidades o proyectos independientes de Rodrigo.",
    },
    suggestions: {
      en: [
        "What is Rodrigo working on at ClassDojo?",
        "What kind of teams has Rodrigo led?",
        "Which technologies does Rodrigo work with?",
      ],
      es: [
        "¿En qué trabaja Rodrigo en ClassDojo?",
        "¿Qué tipo de equipos lideró Rodrigo?",
        "¿Con qué tecnologías trabaja Rodrigo?",
      ],
    },
    placeholder: {
      en: "Ask about experience, projects, or skills…",
      es: "Preguntá sobre experiencia, proyectos o habilidades…",
    },
    contact: { en: "Contact Rodrigo", es: "Contactar a Rodrigo" },
    newChat: { en: "New chat", es: "Nuevo chat" },
    thinking: { en: "Checking approved sources…", es: "Consultando fuentes aprobadas…" },
    unknownSource: { en: "No approved source", es: "Sin fuente aprobada" },
    unknown: {
      en: "I don’t have an approved source for that. You can contact Rodrigo directly and ask him.",
      es: "No tengo una fuente aprobada para responder eso. Podés contactar a Rodrigo y preguntarle directamente.",
    },
  },
} as const;

export const experiences: Experience[] = [
  {
    company: "ClassDojo",
    role: { en: "Fullstack Software Engineer", es: "Fullstack Software Engineer" },
    period: "2022–Present",
    summary: {
      en: "TypeScript platform modernization, product integrations, LLM features, AWS and Kubernetes.",
      es: "Modernización de la plataforma en TypeScript, integraciones de producto, funcionalidades con LLMs, AWS y Kubernetes.",
    },
  },
  {
    company: "SCVSoft",
    role: { en: "Tech Lead", es: "Tech Lead" },
    period: "2021",
    summary: {
      en: "Unified third-party APIs and reverse-engineered poorly documented IoT devices.",
      es: "Unifiqué APIs de terceros e hice ingeniería inversa de dispositivos IoT con documentación deficiente.",
    },
  },
  {
    company: "Medallia",
    role: { en: "Senior Engineering Manager", es: "Senior Engineering Manager" },
    period: "2018–2021",
    summary: {
      en: "Led a frontend team across three cities and modernized seven legacy Angular applications.",
      es: "Lideré un equipo frontend distribuido en tres ciudades y modernicé siete aplicaciones legacy en Angular.",
    },
  },
  {
    company: "FutureAdvisor / SCVSoft",
    role: { en: "Lead Software Engineer", es: "Lead Software Engineer" },
    period: "2016–2018",
    summary: {
      en: "Led a six-person team and evolved a Rails system toward AWS services.",
      es: "Lideré un equipo de seis personas y evolucioné un sistema Rails hacia servicios en AWS.",
    },
  },
  {
    company: "Lemonade / VSKO",
    role: { en: "Software Engineer", es: "Software Engineer" },
    period: "2013–2016",
    summary: {
      en: "Built educational software for a Belgian client.",
      es: "Construí software educativo para un cliente de Bélgica.",
    },
  },
  {
    company: "DLA TV",
    role: { en: "Head of Development", es: "Head of Development" },
    period: "2012–2013",
    summary: {
      en: "Built QA from zero, expanded the development team, and defined delivery processes.",
      es: "Armé QA desde cero, amplié el equipo de desarrollo y definí procesos de entrega.",
    },
  },
  {
    company: "TeraCode / OpenEnglish",
    role: {
      en: "Software Engineer → Project Manager",
      es: "Software Engineer → Project Manager",
    },
    period: "2009–2012",
    summary: {
      en: "Grew the engagement to roughly 30 people.",
      es: "Hice crecer el proyecto hasta alcanzar aproximadamente 30 personas.",
    },
  },
  {
    company: "Bumeran",
    role: { en: "Software Engineer", es: "Software Engineer" },
    period: "2007–2009",
    summary: {
      en: "PHP backend and a Java/Solr search engine over candidate resumes.",
      es: "Backend en PHP y un buscador Java/Solr sobre currículums de candidatos.",
    },
  },
  {
    company: "Globant",
    role: { en: "Functional Analyst", es: "Analista funcional" },
    period: "2006–2007",
    summary: {
      en: "Led functional analysis for a marketplace refactor.",
      es: "Lideré el análisis funcional para el rediseño de un marketplace.",
    },
  },
  {
    company: "Claxson / Mixplay",
    role: { en: "Senior Developer", es: "Senior Developer" },
    period: "2003–2006",
    summary: {
      en: "Built a streaming platform with PHP, Oracle, C#, DRM and content encryption.",
      es: "Construí una plataforma de streaming con PHP, Oracle, C#, DRM y cifrado de contenido.",
    },
  },
];

export const capabilities: Capability[] = [
  {
    name: { en: "Product engineering", es: "Ingeniería de producto" },
    details: {
      en: "Zero-to-one · Product integration · Developer experience",
      es: "Zero-to-one · Integración de producto · Experiencia de desarrollo",
    },
  },
  {
    name: { en: "Full-stack systems", es: "Sistemas full-stack" },
    details: {
      en: "TypeScript · React · Node · PHP · Java · C# · Rails",
      es: "TypeScript · React · Node · PHP · Java · C# · Rails",
    },
  },
  {
    name: { en: "Architecture & modernization", es: "Arquitectura y modernización" },
    details: {
      en: "Monoliths to services · REST · GraphQL · Realtime · Event-driven",
      es: "Monolitos a servicios · REST · GraphQL · Realtime · Event-driven",
    },
  },
  {
    name: { en: "AI-native development", es: "Desarrollo AI-native" },
    details: {
      en: "LLM features · Langfuse · Models · Orchestrators · Skills",
      es: "Funcionalidades con LLMs · Langfuse · Modelos · Orquestadores · Skills",
    },
  },
  {
    name: { en: "Leadership", es: "Liderazgo" },
    details: {
      en: "Team building · Hiring · Mentoring · Delivery processes",
      es: "Armado de equipos · Contratación · Mentoría · Procesos de entrega",
    },
  },
  {
    name: { en: "Cloud infrastructure", es: "Infraestructura cloud" },
    details: {
      en: "AWS · Kubernetes · Cloudflare Workers · D1 · PostgreSQL",
      es: "AWS · Kubernetes · Cloudflare Workers · D1 · PostgreSQL",
    },
  },
  {
    name: { en: "Integrations", es: "Integraciones" },
    details: {
      en: "Third-party APIs · Reverse engineering · Poorly documented devices",
      es: "APIs de terceros · Ingeniería inversa · Dispositivos mal documentados",
    },
  },
  {
    name: { en: "Domain modeling", es: "Modelado de dominio" },
    details: {
      en: "Ambiguous domains · Evidence-first probes · Privacy boundaries",
      es: "Dominios ambiguos · Pruebas basadas en evidencia · Límites de privacidad",
    },
  },
];

export const projects: Project[] = [
  {
    name: "Coro",
    summary: {
      en: "Global conversations across languages.",
      es: "Conversaciones globales entre idiomas.",
    },
    evidence: "Semantic routing · Realtime · Multilingual",
    url: "https://coro.world",
  },
  {
    name: "Traza",
    summary: {
      en: "A traceable story of financial activity.",
      es: "Una historia trazable de la actividad financiera.",
    },
    evidence: "Reconciliation · Privacy · Cloudflare",
    url: "https://traza.rodrigouroz.com",
  },
  {
    name: "Ballast",
    summary: {
      en: "Inspectable portfolio scenarios.",
      es: "Escenarios de portafolio inspeccionables.",
    },
    evidence: "Monte Carlo · Optimization · Tax lots",
    url: "https://ballast-dashboard.pages.dev",
  },
  {
    name: "Jacara",
    summary: {
      en: "Physical-first family games.",
      es: "Juegos familiares que priorizan lo físico.",
    },
    evidence: "Computer vision · Realtime · Voice",
    url: "https://jacara.rodrigouroz.com",
  },
];

export const education = [
  {
    title: "Systems Engineer · UTN",
    detail: {
      en: "Graduated March 2009 · Highest GPA in class",
      es: "Graduado en marzo de 2009 · Mejor promedio de la promoción",
    },
  },
  {
    title: "Strategic and Technological Management · ITBA–EOI",
    detail: {
      en: "Graduate coursework completed; thesis not submitted",
      es: "Cursada de posgrado completa; tesis no presentada",
    },
  },
  {
    title: "UTN faculty · 2003–2021",
    detail: {
      en: "Associate Professor, Systems Analysis · Teaching Assistant, Operative Systems (early years)",
      es: "Docente adjunto, Análisis de Sistemas · Ayudante, Sistemas Operativos (primeros años)",
    },
  },
] as const;

export const externalLinks = {
  cv: "/rodrigo-uroz-cv.pdf",
  github: "https://github.com/rodrigouroz",
  silver: "https://www.silver.dev/",
  email: "mailto:hello@rodrigouroz.com",
} as const;
