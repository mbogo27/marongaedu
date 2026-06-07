export type Level = "Beginner" | "Intermediate" | "Advanced" | "All levels";

export type Lesson = {
  title: string;
  minutes: number;
  preview: boolean;
};

export type Module = {
  title: string;
  lessons: Lesson[];
};

export type Course = {
  slug: string;
  title: string;
  blurb: string;
  description: string[];
  category: string;
  level: Level;
  durationLabel: string;
  priceKes: number;
  thumbnailSeed: string;
  previewVideoId: string;
  outcomes: string[];
  modules: Module[];
  status: "Published" | "Draft";
  enrollments: number;
};

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
};

export type Student = {
  name: string;
  email: string;
  course: string;
  enrolledOn: string;
  progress: number;
};
