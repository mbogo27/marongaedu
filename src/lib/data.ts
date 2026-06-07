import type { Course, Student, Testimonial } from "./types";

export const instructor = {
  name: "Dr. Godfrey Maronga",
  title: "Lead Instructor & Founder, Maronga Dental Academy",
  credentials: "BDS (University of Nairobi), Dip. Restorative Dentistry",
  bio: "Dr. Maronga has spent over fifteen years in clinical practice across Nairobi and Mombasa, treating patients and mentoring junior dentists. Maronga Dental Academy grew out of the case-based teaching he was already doing in his own clinic — turning real chairside problems into structured, practical courses for students and practitioners across Kenya and the wider region.",
  photoUrl: "/maronga.jpg",
};

/**
 * Placeholder preview footage — a stand-in until Maronga supplies real
 * chairside / lecture recordings. Swap this single ID once that footage exists.
 */
export const PLACEHOLDER_VIDEO_ID = "aqz-KE-bpKQ";

export const categories = [
  "Endodontics",
  "Restorative & Cosmetic",
  "Pediatric Dentistry",
  "Radiography & Imaging",
  "Implantology",
  "Practice Management",
];

export const courses: Course[] = [
  {
    slug: "endodontic-fundamentals",
    title: "Endodontic Fundamentals: Diagnosis to Obturation",
    blurb:
      "A complete chairside walkthrough of root canal treatment — from reading the symptoms to a clean, predictable obturation.",
    description: [
      "Endodontics rewards precision and punishes guesswork. This course rebuilds the diagnostic process from first principles — pulp testing, radiographic reading, and case selection — before moving step by step through access, working length, shaping, and obturation on real clinical cases.",
      "Dr. Maronga narrates each stage the way he would talk a junior colleague through it chairside: what to look for, what commonly goes wrong, and how to recover when it does. You'll finish with a repeatable protocol you can take into your next root canal appointment.",
      "Built for dental students preparing for clinics and general practitioners who want to treat endodontic cases confidently in-house rather than referring them out.",
    ],
    category: "Endodontics",
    level: "Intermediate",
    durationLabel: "6h",
    priceKes: 8500,
    thumbnailSeed: "maronga-endo",
    previewVideoId: PLACEHOLDER_VIDEO_ID,
    outcomes: [
      "Read pulpal and periapical symptoms accurately before committing to treatment",
      "Plan access cavities and locate canals reliably across tooth types",
      "Establish working length and shape canals with a consistent, safe protocol",
      "Choose an obturation technique appropriate to the case and execute it cleanly",
      "Recognise and manage common complications: ledges, perforations, separated instruments",
    ],
    modules: [
      {
        title: "Module 1 — Diagnosis and Case Selection",
        lessons: [
          { title: "Reading pulpal symptoms", minutes: 18, preview: true },
          { title: "Radiographic interpretation for endodontics", minutes: 22, preview: false },
          { title: "When to treat, when to refer", minutes: 14, preview: false },
        ],
      },
      {
        title: "Module 2 — Access and Canal Location",
        lessons: [
          { title: "Designing the access cavity by tooth type", minutes: 26, preview: false },
          { title: "Locating difficult and calcified canals", minutes: 24, preview: false },
        ],
      },
      {
        title: "Module 3 — Shaping and Cleaning",
        lessons: [
          { title: "Establishing working length", minutes: 20, preview: false },
          { title: "Hand and rotary shaping protocols", minutes: 28, preview: false },
          { title: "Irrigation strategy that actually disinfects", minutes: 19, preview: false },
        ],
      },
      {
        title: "Module 4 — Obturation and Troubleshooting",
        lessons: [
          { title: "Cold lateral vs. warm vertical obturation", minutes: 23, preview: false },
          { title: "Managing ledges, perforations and separated files", minutes: 21, preview: false },
        ],
      },
    ],
    status: "Published",
    enrollments: 184,
  },
  {
    slug: "composite-restorations-anterior-aesthetics",
    title: "Composite Restorations: Anterior Aesthetics",
    blurb:
      "Layering, shade-matching, and finishing techniques for anterior composites that disappear into the smile.",
    description: [
      "Anterior composite work is where clinical skill and artistry meet — and where small technique errors show up immediately. This course breaks the process into deliberate stages: shade analysis, isolation, incremental layering, and the finishing sequence that turns a good restoration into an invisible one.",
      "You'll watch full anterior cases from rubber dam placement through to polish, with commentary on the judgment calls Dr. Maronga makes at each step — including what he'd do differently when the case doesn't go to plan.",
      "Suited to general dentists who want their anterior composites to hold up to scrutiny in natural light, not just under the operatory lamp.",
    ],
    category: "Restorative & Cosmetic",
    level: "Intermediate",
    durationLabel: "4h",
    priceKes: 6000,
    thumbnailSeed: "maronga-composite",
    previewVideoId: PLACEHOLDER_VIDEO_ID,
    outcomes: [
      "Analyse shade and translucency before picking up a composite syringe",
      "Achieve clean, dry isolation for predictable bonding",
      "Layer dentine and enamel composites to mimic natural tooth structure",
      "Carve and finish anterior restorations that blend at conversational distance",
      "Avoid the common causes of early discolouration and marginal staining",
    ],
    modules: [
      {
        title: "Module 1 — Planning the Restoration",
        lessons: [
          { title: "Shade-matching under different light sources", minutes: 16, preview: true },
          { title: "Choosing a composite system and case-by-case layering plan", minutes: 17, preview: false },
        ],
      },
      {
        title: "Module 2 — Isolation and Preparation",
        lessons: [
          { title: "Rubber dam technique for anterior teeth", minutes: 15, preview: false },
          { title: "Minimal-intervention cavity design", minutes: 18, preview: false },
        ],
      },
      {
        title: "Module 3 — Layering and Building Anatomy",
        lessons: [
          { title: "Dentine layering and internal characterisation", minutes: 22, preview: false },
          { title: "Enamel layering and incisal effects", minutes: 20, preview: false },
        ],
      },
      {
        title: "Module 4 — Finishing and Polish",
        lessons: [
          { title: "Carving natural surface texture", minutes: 14, preview: false },
          { title: "Polishing sequence for long-term shine retention", minutes: 13, preview: false },
        ],
      },
    ],
    status: "Published",
    enrollments: 142,
  },
  {
    slug: "pediatric-behaviour-management",
    title: "Pediatric Behavior Management in the Operatory",
    blurb:
      "Practical communication and behavior-guidance techniques for treating children calmly and safely.",
    description: [
      "Most pediatric appointments succeed or fail in the first ninety seconds — before a single instrument is picked up. This course focuses on the behavior-guidance skills that make child patients (and their parents) comfortable: language choices, pacing, tell-show-do, and reading early signs of anxiety.",
      "Dr. Maronga walks through real consultation footage and operatory scenarios, showing how small adjustments in approach change the entire appointment — including what to do when a technique isn't landing and you need to reset.",
      "Designed for dental students and general practitioners who see children occasionally and want a calmer, more confident toolkit for those appointments.",
    ],
    category: "Pediatric Dentistry",
    level: "Beginner",
    durationLabel: "3h",
    priceKes: 4500,
    thumbnailSeed: "maronga-pedo",
    previewVideoId: PLACEHOLDER_VIDEO_ID,
    outcomes: [
      "Set up the first appointment to build trust before any treatment begins",
      "Apply tell-show-do and other guidance techniques appropriate to age",
      "Read early signs of anxiety and adjust pacing before behavior escalates",
      "Communicate confidently with parents without undermining the child's trust",
      "Know when to pause, reschedule, or escalate rather than push through",
    ],
    modules: [
      {
        title: "Module 1 — First Impressions",
        lessons: [
          { title: "Designing a child-friendly first appointment", minutes: 15, preview: true },
          { title: "Reading the room: child and parent together", minutes: 12, preview: false },
        ],
      },
      {
        title: "Module 2 — Core Guidance Techniques",
        lessons: [
          { title: "Tell-show-do in practice", minutes: 17, preview: false },
          { title: "Voice control and positive reinforcement", minutes: 14, preview: false },
        ],
      },
      {
        title: "Module 3 — When Things Don't Go to Plan",
        lessons: [
          { title: "De-escalating mid-appointment anxiety", minutes: 16, preview: false },
          { title: "Knowing when to stop, and how to reschedule well", minutes: 11, preview: false },
        ],
      },
    ],
    status: "Published",
    enrollments: 97,
  },
  {
    slug: "digital-radiography-acquisition-interpretation",
    title: "Digital Radiography: Acquisition and Interpretation",
    blurb:
      "Get clean, diagnostic images on the first try — and learn to read what they're actually telling you.",
    description: [
      "A surprising amount of diagnostic uncertainty traces back to a poorly acquired image. This course starts at the sensor and the cone, working through positioning and exposure technique for common intraoral views, then moves into structured interpretation — what's normal, what's a variant, and what needs follow-up.",
      "Dr. Maronga reviews real case images alongside students, thinking aloud through the interpretation process so you can build the same systematic habits.",
      "A practical foundation for students approaching their radiography rotations and practitioners who want to reduce retakes and sharpen their reading.",
    ],
    category: "Radiography & Imaging",
    level: "Beginner",
    durationLabel: "2.5h",
    priceKes: 4000,
    thumbnailSeed: "maronga-radiography",
    previewVideoId: PLACEHOLDER_VIDEO_ID,
    outcomes: [
      "Position sensors and angle exposures correctly for common intraoral views",
      "Reduce retakes by troubleshooting the most common acquisition errors",
      "Apply a consistent, structured method for reading radiographs",
      "Distinguish normal anatomical variants from pathology worth flagging",
      "Document and communicate radiographic findings clearly in patient notes",
    ],
    modules: [
      {
        title: "Module 1 — Acquisition Technique",
        lessons: [
          { title: "Sensor positioning for bitewings and periapicals", minutes: 19, preview: true },
          { title: "Exposure settings and avoiding common artefacts", minutes: 16, preview: false },
        ],
      },
      {
        title: "Module 2 — Structured Interpretation",
        lessons: [
          { title: "A repeatable method for reading any radiograph", minutes: 21, preview: false },
          { title: "Normal variants vs. findings that need follow-up", minutes: 18, preview: false },
        ],
      },
      {
        title: "Module 3 — Case Review",
        lessons: [
          { title: "Walkthrough: ten real cases, read together", minutes: 24, preview: false },
        ],
      },
    ],
    status: "Published",
    enrollments: 121,
  },
  {
    slug: "implant-placement-surgical-protocols",
    title: "Implant Placement: Surgical Protocols and Case Selection",
    blurb:
      "From treatment planning to flap design and placement protocol — a structured route into implant surgery.",
    description: [
      "Implant work multiplies the cost of small mistakes — which is exactly why it rewards a structured approach. This course works through case selection and treatment planning, surgical anatomy considerations, flap design, and a step-by-step placement protocol, illustrated with full surgical cases.",
      "Dr. Maronga is candid about the judgment calls that separate a textbook plan from a safe, real-world one — including cases where the right decision was not to proceed.",
      "Built for general practitioners with solid surgical fundamentals who are ready to bring implant placement into their own practice, and for postgraduate students consolidating their surgical training.",
    ],
    category: "Implantology",
    level: "Advanced",
    durationLabel: "8h",
    priceKes: 12500,
    thumbnailSeed: "maronga-implant",
    previewVideoId: PLACEHOLDER_VIDEO_ID,
    outcomes: [
      "Select and plan implant cases with a clear-eyed view of risk and suitability",
      "Assess surgical anatomy and avoid the structures that turn cases into complications",
      "Design and manage flaps for predictable healing and aesthetics",
      "Follow a step-by-step placement protocol from osteotomy to torque",
      "Plan provisionalisation and the handover to restorative treatment",
    ],
    modules: [
      {
        title: "Module 1 — Case Selection and Planning",
        lessons: [
          { title: "Reading CBCT for implant planning", minutes: 27, preview: true },
          { title: "Risk assessment: when (and when not) to proceed", minutes: 20, preview: false },
        ],
      },
      {
        title: "Module 2 — Surgical Foundations",
        lessons: [
          { title: "Anatomy considerations by site", minutes: 24, preview: false },
          { title: "Flap design and management", minutes: 22, preview: false },
        ],
      },
      {
        title: "Module 3 — Placement Protocol",
        lessons: [
          { title: "Osteotomy sequence and torque control", minutes: 29, preview: false },
          { title: "Full case walkthrough: planning to placement", minutes: 33, preview: false },
        ],
      },
      {
        title: "Module 4 — After Placement",
        lessons: [
          { title: "Healing, provisionalisation and the restorative handover", minutes: 18, preview: false },
        ],
      },
    ],
    status: "Published",
    enrollments: 68,
  },
  {
    slug: "running-a-modern-dental-practice",
    title: "Running a Modern Dental Practice",
    blurb:
      "The business side of dentistry — staffing, systems, patient experience and growth — for clinicians who never trained for it.",
    description: [
      "Dental school teaches you to treat patients. It rarely teaches you to run a practice. This course covers the operational side that determines whether good clinical work translates into a sustainable business: staffing and rosters, patient flow, pricing, recordkeeping, and the systems that keep a clinic calm on a busy day.",
      "Dr. Maronga draws on his own experience opening and running clinics in Nairobi and Mombasa — including the mistakes that taught him the most.",
      "Useful for practice owners, associates considering opening their own clinic, and senior students starting to think beyond graduation.",
    ],
    category: "Practice Management",
    level: "All levels",
    durationLabel: "5h",
    priceKes: 7000,
    thumbnailSeed: "maronga-practice",
    previewVideoId: PLACEHOLDER_VIDEO_ID,
    outcomes: [
      "Design a patient flow that reduces wait times without rushing care",
      "Build staffing and roster systems that hold up under pressure",
      "Set pricing that reflects your costs and your local market",
      "Put basic financial and clinical recordkeeping systems in place",
      "Plan a steady, realistic path to growing or opening a practice",
    ],
    modules: [
      {
        title: "Module 1 — Foundations",
        lessons: [
          { title: "What actually makes a practice profitable", minutes: 20, preview: true },
          { title: "Setting up systems before you need them", minutes: 17, preview: false },
        ],
      },
      {
        title: "Module 2 — People and Patient Experience",
        lessons: [
          { title: "Hiring and rostering for a small clinic", minutes: 19, preview: false },
          { title: "Designing patient flow that doesn't feel rushed", minutes: 16, preview: false },
        ],
      },
      {
        title: "Module 3 — Money and Records",
        lessons: [
          { title: "Pricing your services with confidence", minutes: 18, preview: false },
          { title: "Recordkeeping that protects you and your patients", minutes: 15, preview: false },
        ],
      },
      {
        title: "Module 4 — Growing Steadily",
        lessons: [
          { title: "When (and how) to expand without overreaching", minutes: 21, preview: false },
        ],
      },
    ],
    status: "Draft",
    enrollments: 0,
  },
];

export const testimonials: Testimonial[] = [
  {
    name: "Dr. Achieng Otieno",
    role: "General Dentist, Kisumu",
    quote:
      "I referred out almost every root canal case until I worked through the Endodontic Fundamentals course. Three months later I'm treating most of them in-house — and my patients are noticing the difference.",
  },
  {
    name: "Brian Wachira",
    role: "Final-year Dental Student, Nairobi",
    quote:
      "Dr. Maronga explains things the way I wish my lecturers did — like he's standing next to you at the chair, not reading off a slide. The radiography course alone saved me from so many retakes on clinical rotation.",
  },
  {
    name: "Dr. Faith Cherono",
    role: "Practice Owner, Eldoret",
    quote:
      "The practice management course was the one I didn't know I needed. I'd spent years getting better clinically while the business side ran on guesswork. This gave me an actual system to work from.",
  },
];

export const students: Student[] = [
  { name: "Achieng Otieno", email: "achieng.otieno@example.co.ke", course: "Endodontic Fundamentals: Diagnosis to Obturation", enrolledOn: "2026-05-02", progress: 64 },
  { name: "Brian Wachira", email: "brian.wachira@example.co.ke", course: "Digital Radiography: Acquisition and Interpretation", enrolledOn: "2026-05-09", progress: 100 },
  { name: "Faith Cherono", email: "faith.cherono@example.co.ke", course: "Running a Modern Dental Practice", enrolledOn: "2026-04-21", progress: 38 },
  { name: "Kevin Mutiso", email: "kevin.mutiso@example.co.ke", course: "Composite Restorations: Anterior Aesthetics", enrolledOn: "2026-05-18", progress: 12 },
  { name: "Lilian Wanjiru", email: "lilian.wanjiru@example.co.ke", course: "Implant Placement: Surgical Protocols and Case Selection", enrolledOn: "2026-03-30", progress: 47 },
  { name: "Samuel Kiprono", email: "samuel.kiprono@example.co.ke", course: "Pediatric Behavior Management in the Operatory", enrolledOn: "2026-05-26", progress: 81 },
  { name: "Joy Nasimiyu", email: "joy.nasimiyu@example.co.ke", course: "Endodontic Fundamentals: Diagnosis to Obturation", enrolledOn: "2026-06-01", progress: 6 },
  { name: "Dennis Omondi", email: "dennis.omondi@example.co.ke", course: "Composite Restorations: Anterior Aesthetics", enrolledOn: "2026-04-14", progress: 90 },
];

export const adminStats = {
  totalCourses: courses.length,
  publishedCourses: courses.filter((c) => c.status === "Published").length,
  totalEnrollments: courses.reduce((sum, c) => sum + c.enrollments, 0),
  revenueKes: courses.reduce((sum, c) => sum + c.enrollments * c.priceKes, 0),
  recentSignups: students.slice(-5).reverse(),
};

export function formatKes(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}
