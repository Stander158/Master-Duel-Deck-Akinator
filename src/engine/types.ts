/** An archetype. Tags come from `src/data/tags.ts` and are the only ratings. */
export interface Archetype {
  id: string;
  name: string;
  tags: string[];
}

/** One option's contribution: a tag it points at and how strongly. */
export interface Effect {
  tag: string;
  weight: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  effects: Effect[];
}

export interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

/** `optionId === null` means the player skipped. */
export interface Answer {
  questionId: string;
  optionId: string | null;
}

export interface ScoredArchetype {
  archetype: Archetype;
  score: number;
  matchPercent: number;
  probability: number;
}

/**
 * Long-form content for one archetype's page.
 *
 * Deliberately loose: a guide is a list of sections, and a section is a list
 * of blocks. That covers prose, bullet lists, card lists and callouts without
 * needing a markdown parser or locking the writing into a fixed shape.
 */
export type Block =
  | { p: string }
  | { list: string[] }
  | { cards: string[] }
  | { note: string };

export interface GuideSection {
  heading: string;
  blocks: Block[];
}

export interface Guide {
  /** One or two sentences under the archetype name. */
  intro?: string;
  /** Short label/value pairs shown as a strip: cost, era, difficulty, whatever. */
  facts?: { label: string; value: string }[];
  sections?: GuideSection[];
}
