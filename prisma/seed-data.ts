// Structured seed content for prisma/seed.ts. Keeping this data separate
// keeps the orchestration script (creation order, relations, progress math)
// readable.

export type SeedLesson = {
  title: string;
  type: "VIDEO" | "READING" | "QUIZ" | "RESOURCE";
  minutes?: number;
  freePreview?: boolean;
  quiz?: {
    question: string;
    type: "SINGLE" | "MULTI" | "TRUEFALSE";
    options: { text: string; correct: boolean }[];
    explanation?: string;
  }[];
  readingHtml?: string;
  resource?: { label: string; url: string };
};

export type SeedModule = {
  title: string;
  description?: string;
  lessons: SeedLesson[];
};

export type SeedCourse = {
  slug: string;
  title: string;
  subtitle: string;
  shortDescription: string;
  descriptionHtml: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
  priceKes: number;
  salePriceKes?: number;
  isFree?: boolean;
  isFeatured?: boolean;
  outcomes: string[];
  requirements: string[];
  audience: string[];
  modules: SeedModule[];
};

const genericReading = (topic: string) => `
<p>This lesson covers <strong>${topic}</strong> as practiced at Maronga Dental Academy. Read through the clinical notes below, then continue to the next lesson.</p>
<ul>
  <li>Indications and contraindications</li>
  <li>Step-by-step clinical protocol</li>
  <li>Common pitfalls and how to avoid them</li>
</ul>
<p>Refer to the downloadable resources for supporting reference material.</p>
`.trim();

export const categories = [
  { name: "Endodontics", slug: "endodontics", description: "Root canal therapy, pulp biology, and endodontic retreatment.", icon: "activity" },
  { name: "Restorative & Cosmetic", slug: "restorative-cosmetic", description: "Direct and indirect restorations, aesthetics, and smile design.", icon: "sparkles" },
  { name: "Pediatric Dentistry", slug: "pediatric-dentistry", description: "Behavior management and clinical care for younger patients.", icon: "smile" },
  { name: "Oral Surgery", slug: "oral-surgery", description: "Extractions, implant placement, and surgical anesthesia.", icon: "scissors" },
  { name: "Radiography & Imaging", slug: "radiography-imaging", description: "Digital radiography acquisition, safety, and interpretation.", icon: "scan" },
  { name: "Practice Management", slug: "practice-management", description: "Running an efficient, patient-centered dental practice.", icon: "briefcase" },
];

export const courses: SeedCourse[] = [
  {
    slug: "endodontic-fundamentals",
    title: "Endodontic Fundamentals: Diagnosis to Obturation",
    subtitle: "A complete clinical walkthrough of modern root canal therapy",
    shortDescription: "Master pulp diagnosis, access, cleaning and shaping, and obturation with a practicing clinician.",
    descriptionHtml: `<p>This course takes you from first principles of pulp and periapical diagnosis through to a fully obturated root canal system, using real case walkthroughs from Dr. Maronga's own practice.</p><p>You'll leave able to confidently triage endodontic emergencies, select the right access and instrumentation approach, and avoid the most common procedural errors.</p>`,
    category: "Endodontics",
    level: "INTERMEDIATE",
    priceKes: 8500,
    isFeatured: true,
    outcomes: [
      "Diagnose pulpal and periapical disease accurately",
      "Plan and execute a straight-line access cavity",
      "Select rotary/reciprocating instrumentation systems appropriately",
      "Apply modern irrigation and disinfection protocols",
      "Obturate predictably using warm vertical or single-cone technique",
      "Recognize and manage common procedural complications",
    ],
    requirements: ["Registered dental practitioner or final-year dental student", "Basic understanding of tooth anatomy"],
    audience: ["General dentists wanting to grow their endodontic caseload", "Final-year dental students"],
    modules: [
      {
        title: "Diagnosis and Treatment Planning",
        lessons: [
          { title: "Pulp and periapical diagnosis", type: "VIDEO", minutes: 14, freePreview: true },
          { title: "Case selection: treat, refer, or extract?", type: "VIDEO", minutes: 11 },
          { title: "Reading the periapical radiograph", type: "READING", minutes: 8, readingHtml: genericReading("radiographic diagnosis") },
          { title: "Diagnosis quiz", type: "QUIZ", minutes: 6, quiz: [
            { question: "A tooth with lingering pain to cold after stimulus removal most likely has:", type: "SINGLE", options: [
              { text: "Reversible pulpitis", correct: false },
              { text: "Irreversible pulpitis", correct: true },
              { text: "Necrotic pulp", correct: false },
              { text: "Periodontal abscess", correct: false },
            ], explanation: "Lingering pain after the stimulus is removed is the hallmark of irreversible pulpitis." },
            { question: "Which of the following are valid periapical diagnoses?", type: "MULTI", options: [
              { text: "Symptomatic apical periodontitis", correct: true },
              { text: "Chronic apical abscess", correct: true },
              { text: "Reversible pulpitis", correct: false },
              { text: "Asymptomatic apical periodontitis", correct: true },
            ] },
          ] },
        ],
      },
      {
        title: "Access and Working Length",
        lessons: [
          { title: "Access cavity design by tooth type", type: "VIDEO", minutes: 16 },
          { title: "Locating canal orifices", type: "VIDEO", minutes: 10 },
          { title: "Electronic apex locators explained", type: "VIDEO", minutes: 9 },
          { title: "Confirming working length radiographically", type: "READING", minutes: 7, readingHtml: genericReading("working length confirmation") },
          { title: "Downloadable access cavity reference chart", type: "RESOURCE", minutes: 1, resource: { label: "Access Cavity Reference Chart (PDF)", url: "/uploads/seed/access-cavity-chart.pdf" } },
        ],
      },
      {
        title: "Cleaning and Shaping",
        lessons: [
          { title: "Rotary vs reciprocating systems", type: "VIDEO", minutes: 15, freePreview: true },
          { title: "Glide path and coronal flaring", type: "VIDEO", minutes: 12 },
          { title: "Irrigation protocols and activation", type: "VIDEO", minutes: 13 },
          { title: "Managing ledges, blockages, and separated instruments", type: "VIDEO", minutes: 17 },
        ],
      },
      {
        title: "Obturation",
        lessons: [
          { title: "Single-cone vs warm vertical technique", type: "VIDEO", minutes: 14 },
          { title: "Sealer selection and placement", type: "VIDEO", minutes: 9 },
          { title: "Confirming a hermetic seal radiographically", type: "READING", minutes: 6, readingHtml: genericReading("obturation quality control") },
        ],
      },
      {
        title: "Complications and Retreatment",
        lessons: [
          { title: "Managing post-operative flare-ups", type: "VIDEO", minutes: 10 },
          { title: "When to retreat vs refer for surgery", type: "VIDEO", minutes: 12 },
          { title: "Course wrap-up and next steps", type: "VIDEO", minutes: 5 },
        ],
      },
    ],
  },
  {
    slug: "composite-restorations-anterior-aesthetics",
    title: "Composite Restorations: Anterior Aesthetics",
    subtitle: "Predictable, beautiful anterior composites in a single visit",
    shortDescription: "Layering, shade selection, and finishing techniques for natural-looking anterior composite restorations.",
    descriptionHtml: `<p>Anterior composite restorations are unforgiving — small errors in shade, texture, or contour are immediately visible. This course breaks down Dr. Maronga's chairside layering system into a repeatable protocol.</p>`,
    category: "Restorative & Cosmetic",
    level: "INTERMEDIATE",
    priceKes: 6000,
    salePriceKes: 4500,
    isFeatured: true,
    outcomes: [
      "Select shade and opacity layers for a natural result",
      "Use a matrix and putty index for predictable anatomy",
      "Layer dentine and enamel composites correctly",
      "Finish and polish for a life-like surface texture",
      "Manage diastema closure cases",
    ],
    requirements: ["Registered dental practitioner", "Access to a composite kit with at least 2 opacities"],
    audience: ["General dentists", "Cosmetic-focused practitioners"],
    modules: [
      {
        title: "Planning the Restoration",
        lessons: [
          { title: "Shade selection under natural light", type: "VIDEO", minutes: 11, freePreview: true },
          { title: "Building a putty index from a wax-up", type: "VIDEO", minutes: 9 },
          { title: "Case selection quiz", type: "QUIZ", minutes: 5, quiz: [
            { question: "A putty index is primarily used to:", type: "SINGLE", options: [
              { text: "Whiten the tooth before bonding", correct: false },
              { text: "Guide palatal wall thickness and anatomy", correct: true },
              { text: "Etch the enamel surface", correct: false },
            ] },
          ] },
        ],
      },
      {
        title: "Isolation and Bonding",
        lessons: [
          { title: "Rubber dam isolation for anteriors", type: "VIDEO", minutes: 8 },
          { title: "Etch-and-rinse vs self-etch bonding", type: "VIDEO", minutes: 10 },
          { title: "Bonding protocol checklist", type: "READING", minutes: 5, readingHtml: genericReading("adhesive bonding protocols") },
        ],
      },
      {
        title: "Layering Technique",
        lessons: [
          { title: "Building the palatal shelf", type: "VIDEO", minutes: 13 },
          { title: "Dentine layer and mamelon effects", type: "VIDEO", minutes: 14 },
          { title: "Enamel layer and translucency", type: "VIDEO", minutes: 12, freePreview: true },
        ],
      },
      {
        title: "Finishing and Polishing",
        lessons: [
          { title: "Contouring with discs and burs", type: "VIDEO", minutes: 11 },
          { title: "Achieving surface texture and micro-anatomy", type: "VIDEO", minutes: 9 },
          { title: "Final polish and gloss", type: "VIDEO", minutes: 8 },
        ],
      },
    ],
  },
  {
    slug: "pediatric-behavior-management",
    title: "Pediatric Behavior Management in the Operatory",
    subtitle: "Calm, cooperative visits without pharmacological sedation",
    shortDescription: "Practical, non-pharmacological behavior guidance techniques for treating children confidently.",
    descriptionHtml: `<p>A free introductory course covering the behavior management techniques Dr. Maronga uses every day with pediatric patients — no sedation required for the vast majority of visits.</p>`,
    category: "Pediatric Dentistry",
    level: "BEGINNER",
    priceKes: 0,
    isFree: true,
    isFeatured: true,
    outcomes: [
      "Apply tell-show-do and positive reinforcement",
      "Recognize early signs of anxiety and adjust approach",
      "Structure a first visit for long-term cooperation",
      "Know when to involve caregivers vs work independently",
    ],
    requirements: ["No prior pediatric experience required"],
    audience: ["General dentists who see children occasionally", "New graduates"],
    modules: [
      {
        title: "Foundations of Behavior Guidance",
        lessons: [
          { title: "Why behavior management matters", type: "VIDEO", minutes: 7, freePreview: true },
          { title: "Tell-show-do in practice", type: "VIDEO", minutes: 9, freePreview: true },
          { title: "Positive reinforcement techniques", type: "VIDEO", minutes: 8 },
        ],
      },
      {
        title: "Structuring the Visit",
        lessons: [
          { title: "The first visit: setting the tone", type: "VIDEO", minutes: 10 },
          { title: "Reading anxiety cues", type: "READING", minutes: 6, readingHtml: genericReading("recognizing pediatric anxiety") },
          { title: "Behavior guidance quiz", type: "QUIZ", minutes: 4, quiz: [
            { question: "Tell-show-do should ideally happen:", type: "SINGLE", options: [
              { text: "After the procedure, as a debrief", correct: false },
              { text: "Before each new instrument or step is used", correct: true },
              { text: "Only for the first visit", correct: false },
            ] },
          ] },
        ],
      },
      {
        title: "Working With Caregivers",
        lessons: [
          { title: "Parent presence: when it helps and when it doesn't", type: "VIDEO", minutes: 8 },
          { title: "Setting expectations before treatment", type: "VIDEO", minutes: 6 },
        ],
      },
    ],
  },
  {
    slug: "digital-radiography-acquisition-interpretation",
    title: "Digital Radiography: Acquisition and Interpretation",
    subtitle: "Sharp images, low dose, confident reads",
    shortDescription: "Sensor positioning, exposure settings, and systematic interpretation for digital periapicals and bitewings.",
    descriptionHtml: `<p>Digital radiography rewards good technique and punishes shortcuts. This course walks through sensor placement, exposure parameters, and a systematic reading routine so nothing gets missed.</p>`,
    category: "Radiography & Imaging",
    level: "BEGINNER",
    priceKes: 3500,
    outcomes: [
      "Position sensors correctly for periapicals and bitewings",
      "Select exposure settings that minimize dose",
      "Apply a systematic interpretation routine",
      "Recognize common pathology on periapical films",
    ],
    requirements: ["Access to a digital radiography system (for practice, not required to complete the course)"],
    audience: ["Dental assistants and hygienists", "General dentists refreshing technique"],
    modules: [
      {
        title: "Acquisition Fundamentals",
        lessons: [
          { title: "Sensor types and paralleling technique", type: "VIDEO", minutes: 12, freePreview: true },
          { title: "Common positioning errors", type: "VIDEO", minutes: 9 },
          { title: "ALARA and dose reduction", type: "READING", minutes: 6, readingHtml: genericReading("radiation dose reduction") },
        ],
      },
      {
        title: "Systematic Interpretation",
        lessons: [
          { title: "A routine for reading every film the same way", type: "VIDEO", minutes: 11 },
          { title: "Caries detection on bitewings", type: "VIDEO", minutes: 10 },
          { title: "Periapical pathology overview", type: "VIDEO", minutes: 13 },
          { title: "Interpretation quiz", type: "QUIZ", minutes: 5, quiz: [
            { question: "Which is the most radiolucent structure normally seen on a periapical film?", type: "SINGLE", options: [
              { text: "Enamel", correct: false },
              { text: "Dentine", correct: false },
              { text: "Pulp chamber", correct: true },
            ] },
          ] },
        ],
      },
      {
        title: "Quality Assurance",
        lessons: [
          { title: "Troubleshooting common image faults", type: "VIDEO", minutes: 8 },
          { title: "Building a QA checklist for your practice", type: "RESOURCE", minutes: 1, resource: { label: "Radiography QA Checklist (PDF)", url: "/uploads/seed/radiography-qa-checklist.pdf" } },
        ],
      },
    ],
  },
  {
    slug: "implant-placement-surgical-protocols",
    title: "Implant Placement: Surgical Protocols and Case Selection",
    subtitle: "From treatment planning to primary stability",
    shortDescription: "A surgical-protocol-first walkthrough of single-tooth implant placement, from imaging to suturing.",
    descriptionHtml: `<p>An advanced course for practitioners ready to place their own implants, or refine an existing protocol. Covers imaging-based planning, flap design, osteotomy sequencing, and managing common intraoperative complications.</p>`,
    category: "Oral Surgery",
    level: "ADVANCED",
    priceKes: 15000,
    outcomes: [
      "Select cases appropriate for single-tooth implant placement",
      "Plan implant position using CBCT",
      "Sequence osteotomy preparation for primary stability",
      "Manage common intraoperative complications",
      "Plan an appropriate healing and restorative timeline",
    ],
    requirements: ["Registered dental surgeon with surgical experience", "Familiarity with CBCT interpretation"],
    audience: ["Oral surgeons", "General dentists with a surgical scope of practice"],
    modules: [
      {
        title: "Case Selection and Imaging",
        lessons: [
          { title: "Patient selection and medical history red flags", type: "VIDEO", minutes: 12, freePreview: true },
          { title: "CBCT-based implant planning", type: "VIDEO", minutes: 16 },
          { title: "Bone quality and quantity assessment", type: "READING", minutes: 8, readingHtml: genericReading("bone quality assessment") },
        ],
      },
      {
        title: "Surgical Protocol",
        lessons: [
          { title: "Flap design and reflection", type: "VIDEO", minutes: 14 },
          { title: "Osteotomy sequencing", type: "VIDEO", minutes: 18 },
          { title: "Achieving and confirming primary stability", type: "VIDEO", minutes: 11 },
          { title: "Suturing technique for implant sites", type: "VIDEO", minutes: 9 },
        ],
      },
      {
        title: "Complications and Case Management",
        lessons: [
          { title: "Managing inadequate primary stability", type: "VIDEO", minutes: 10 },
          { title: "Nerve proximity and paresthesia risk", type: "VIDEO", minutes: 9 },
          { title: "Surgical complications quiz", type: "QUIZ", minutes: 6, quiz: [
            { question: "Which of these increase risk of inferior alveolar nerve injury?", type: "MULTI", options: [
              { text: "Inadequate CBCT planning", correct: true },
              { text: "Osteotomy depth exceeding planned length", correct: true },
              { text: "Using a surgical guide", correct: false },
            ] },
          ] },
        ],
      },
      {
        title: "Restorative Timeline",
        lessons: [
          { title: "Immediate vs delayed loading decisions", type: "VIDEO", minutes: 10 },
          { title: "Handoff to the restorative dentist", type: "VIDEO", minutes: 7 },
        ],
      },
    ],
  },
  {
    slug: "running-a-modern-dental-practice",
    title: "Running a Modern Dental Practice",
    subtitle: "Operations, finance, and patient experience for owner-dentists",
    shortDescription: "Practical systems for scheduling, finance, staffing, and patient experience in a growing practice.",
    descriptionHtml: `<p>Clinical skill alone doesn't build a sustainable practice. This course covers the operational systems Dr. Maronga uses to run a busy, profitable practice without burning out.</p>`,
    category: "Practice Management",
    level: "ALL_LEVELS",
    priceKes: 5000,
    outcomes: [
      "Build a scheduling system that protects chair time",
      "Read and act on core practice financial metrics",
      "Design a patient experience that drives referrals",
      "Hire and onboard clinical and front-desk staff",
    ],
    requirements: ["No prior business background required"],
    audience: ["Practice owners", "Associates planning to open their own practice"],
    modules: [
      {
        title: "Operations and Scheduling",
        lessons: [
          { title: "Designing a schedule template that works", type: "VIDEO", minutes: 10, freePreview: true },
          { title: "Reducing no-shows and late cancellations", type: "VIDEO", minutes: 8 },
          { title: "Front desk systems checklist", type: "RESOURCE", minutes: 1, resource: { label: "Front Desk Systems Checklist (PDF)", url: "/uploads/seed/front-desk-checklist.pdf" } },
        ],
      },
      {
        title: "Practice Finance",
        lessons: [
          { title: "The five numbers every owner should track", type: "VIDEO", minutes: 12 },
          { title: "Setting fees without a race to the bottom", type: "VIDEO", minutes: 9 },
          { title: "Reading a simple P&L", type: "READING", minutes: 7, readingHtml: genericReading("practice financial statements") },
        ],
      },
      {
        title: "Patient Experience",
        lessons: [
          { title: "Designing the first-visit experience", type: "VIDEO", minutes: 9 },
          { title: "Building a referral engine", type: "VIDEO", minutes: 8 },
        ],
      },
      {
        title: "People and Culture",
        lessons: [
          { title: "Hiring your first clinical assistant", type: "VIDEO", minutes: 11 },
          { title: "Onboarding and 90-day reviews", type: "VIDEO", minutes: 8 },
          { title: "Practice management quiz", type: "QUIZ", minutes: 5, quiz: [
            { question: "Which metric best reflects chair-time efficiency?", type: "SINGLE", options: [
              { text: "Total patients seen per year", correct: false },
              { text: "Production per available chair hour", correct: true },
              { text: "Number of staff employed", correct: false },
            ] },
          ] },
        ],
      },
    ],
  },
  {
    slug: "local-anesthesia-techniques-refresher",
    title: "Local Anesthesia Techniques: A Refresher",
    subtitle: "Sharpen your injection technique and manage failures confidently",
    shortDescription: "A free refresher on inferior alveolar, infiltration, and supplemental anesthesia techniques.",
    descriptionHtml: `<p>A focused, free refresher course on achieving profound, reliable local anesthesia — including what to do when the standard block isn't working.</p>`,
    category: "Oral Surgery",
    level: "BEGINNER",
    priceKes: 0,
    isFree: true,
    outcomes: [
      "Land a reliable inferior alveolar nerve block",
      "Choose infiltration vs block by tooth and arch",
      "Use supplemental techniques for the 'hot tooth'",
      "Manage common anesthesia complications",
    ],
    requirements: ["Registered dental practitioner or dental student"],
    audience: ["General dentists", "Dental students preparing for clinics"],
    modules: [
      {
        title: "Technique Refresher",
        lessons: [
          { title: "Inferior alveolar nerve block, step by step", type: "VIDEO", minutes: 10, freePreview: true },
          { title: "Buccal and palatal infiltration technique", type: "VIDEO", minutes: 8, freePreview: true },
          { title: "Supplemental techniques for the hot tooth", type: "VIDEO", minutes: 9 },
        ],
      },
      {
        title: "Troubleshooting",
        lessons: [
          { title: "Why blocks fail and how to fix it mid-procedure", type: "READING", minutes: 6, readingHtml: genericReading("anesthesia failure troubleshooting") },
          { title: "Managing a positive aspiration", type: "VIDEO", minutes: 5 },
          { title: "Anesthesia refresher quiz", type: "QUIZ", minutes: 4, quiz: [
            { question: "A positive aspiration during an IANB means you should:", type: "SINGLE", options: [
              { text: "Inject anyway at the same depth", correct: false },
              { text: "Withdraw slightly, re-aspirate, then proceed if negative", correct: true },
              { text: "Abandon the injection entirely and refer the patient", correct: false },
            ] },
          ] },
        ],
      },
    ],
  },
  {
    slug: "aesthetic-smile-design-principles",
    title: "Aesthetic Smile Design Principles",
    subtitle: "The clinical rules behind a naturally beautiful smile",
    shortDescription: "Facial and dental proportion, smile line analysis, and treatment planning for aesthetic cases.",
    descriptionHtml: `<p>Great smile design isn't guesswork — it follows measurable proportion and symmetry principles. This advanced course teaches the analysis framework Dr. Maronga uses before touching a single tooth.</p>`,
    category: "Restorative & Cosmetic",
    level: "ADVANCED",
    priceKes: 12000,
    salePriceKes: 9000,
    isFeatured: true,
    outcomes: [
      "Analyze facial and dental midlines",
      "Apply golden proportion and width-to-height ratios",
      "Evaluate smile line and gingival display",
      "Translate analysis into a digital or wax-up treatment plan",
    ],
    requirements: ["Experience with anterior restorative or cosmetic cases"],
    audience: ["Cosmetic-focused general dentists", "Prosthodontists"],
    modules: [
      {
        title: "Foundations of Smile Analysis",
        lessons: [
          { title: "Facial and dental midline analysis", type: "VIDEO", minutes: 12, freePreview: true },
          { title: "Golden proportion in tooth width", type: "VIDEO", minutes: 10 },
          { title: "Smile line and gingival display", type: "VIDEO", minutes: 11 },
        ],
      },
      {
        title: "From Analysis to Plan",
        lessons: [
          { title: "Digital smile design workflow", type: "VIDEO", minutes: 14 },
          { title: "Communicating the plan to your lab", type: "READING", minutes: 7, readingHtml: genericReading("lab communication for aesthetic cases") },
          { title: "Smile design quiz", type: "QUIZ", minutes: 5, quiz: [
            { question: "The recommended width-to-height ratio for a central incisor is approximately:", type: "SINGLE", options: [
              { text: "50%", correct: false },
              { text: "75-80%", correct: true },
              { text: "100%", correct: false },
            ] },
          ] },
        ],
      },
      {
        title: "Case Presentations",
        lessons: [
          { title: "Case: closing a midline diastema", type: "VIDEO", minutes: 13 },
          { title: "Case: full arch aesthetic rehabilitation", type: "VIDEO", minutes: 15 },
        ],
      },
    ],
  },
];

export const reviewsPool = [
  "Extremely practical and easy to follow. Exactly what I needed.",
  "Clear explanations, real clinical footage, no wasted time.",
  "Would have liked more case variety, but overall very solid.",
  "This is now my go-to reference before similar cases.",
  "Well structured — the quiz at the end really tested retention.",
  "Great value for the price. Recommended to my whole clinic.",
  "A bit fast-paced in places but the content is excellent.",
  "Dr. Maronga explains the 'why' behind every step, not just the 'how'.",
];
