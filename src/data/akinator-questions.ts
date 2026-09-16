import type { Question } from '../engine/types';

/**
 * Yes/No questions for guessing an archetype.
 *
 * Every tag referenced here is derived from the card database by
 * `npm run sync:facts`, so this bank needs no hand-tagging. Thresholds behind
 * the tags live in that script; these are only the wordings.
 *
 * Two are deliberately missing, both found by playtesting:
 *
 *  - "Monster/Spell/Trap focused?" — a card-count ratio cannot express which
 *    cards do the work. Maliss is 58% monsters and reads as monster focused;
 *    Sky Striker is 60% monsters and is driven entirely by its spells.
 *  - "Primarily one Level?" is asked, but a Link-only archetype has no Level
 *    at all. Answering Unsure is the honest response and does not eliminate.
 *
 * Wording rule learned the hard way: say whether the question is about the
 * archetype or the deck you would build. A player asked "does it have a
 * Fusion monster?" about Crystal Beast says yes, thinking of Rainbow
 * Overdragon — which is the Ultimate Crystal setcode, not Crystal Beast.
 */
function ask(id: string, prompt: string, tag: string, weight = 1): Question {
  return {
    id,
    prompt,
    options: [
      { id: 'yes', label: 'Yes', effects: [{ tag, weight }] },
      { id: 'no', label: 'No', effects: [{ tag, weight: -weight }] },
    ],
  };
}

export const AKINATOR_QUESTIONS: Question[] = [
  // --- identity ---------------------------------------------------------
  ask('one-attribute', 'Are its monsters almost all one Attribute?', 'one-attribute'),
  ask('one-type', 'Are its monsters almost all one Type?', 'one-type'),
  ask('one-level', 'Are its main-deck monsters almost all one Level?', 'one-level'),
  ask('high-level', 'Are its main-deck monsters mostly Level 7 or higher?', 'high-level'),

  // --- extra deck -------------------------------------------------------
  ask('has-fusion', 'Does the archetype include a Fusion monster of its own?', 'has-fusion'),
  ask('has-synchro', 'Does the archetype include a Synchro monster of its own?', 'has-synchro'),
  ask('has-xyz', 'Does the archetype include an Xyz monster of its own?', 'has-xyz'),
  ask('has-link', 'Does the archetype include a Link monster of its own?', 'has-link'),
  ask('has-pendulum', 'Does it have Pendulum monsters?', 'has-pendulum'),
  ask('has-ritual', 'Does it Ritual Summon?', 'has-ritual'),
  ask('no-extra-deck', 'Does it have no Extra Deck monsters of its own at all?', 'no-extra-deck'),
  ask('multi-extra-deck', 'Does it use more than one Extra Deck summoning method?', 'multi-extra-deck'),

  // --- card mix ---------------------------------------------------------
  ask('has-normal-monster', 'Does it include a Normal (non-effect) monster?', 'has-normal-monster'),
  ask('has-field-spell', 'Does it have a Field Spell?', 'has-field-spell'),
  ask('has-counter-trap', 'Does it have a Counter Trap?', 'has-counter-trap'),
  ask('odd-subtype', 'Does it use an unusual monster subtype — Spirit, Union, Gemini, Flip or Toon?', 'odd-subtype'),

  // --- what it does -----------------------------------------------------
  ask('banishes', 'Does banishing play a large part in how it works?', 'banishes'),
  ask('uses-graveyard', 'Does it deliberately send its own cards to the graveyard?', 'uses-graveyard'),
  ask('effect-damage', 'Does it deal damage through card effects rather than battle?', 'effect-damage'),
  ask('negates', 'Does it negate the opponent much?', 'negates'),

  // --- era --------------------------------------------------------------
  ask('era-modern', 'Did it first appear in 2021 or later?', 'era-modern'),
  ask('era-legacy', 'Is it older than the Link era?', 'era-legacy'),
  ask('still-supported', 'Has it had new cards in the last year?', 'still-supported'),
  ask('forgotten', 'Has it gone years without any new support?', 'forgotten'),

  // --- looks ------------------------------------------------------------
  ask('type-dragon', 'Are its monsters mostly Dragons?', 'type-dragon'),
  ask('type-machine', 'Are its monsters mostly Machines?', 'type-machine'),
  ask('type-warrior', 'Are its monsters mostly Warriors?', 'type-warrior'),
  ask('type-spellcaster', 'Are its monsters mostly Spellcasters?', 'type-spellcaster'),
  ask('type-fiend', 'Are its monsters mostly Fiends?', 'type-fiend'),
  ask('attr-dark', 'Are its monsters mostly DARK?', 'attr-dark'),
  ask('attr-light', 'Are its monsters mostly LIGHT?', 'attr-light'),

  // --- structure --------------------------------------------------------
  ask('sub-archetype', 'Is it a branch of a bigger archetype?', 'sub-archetype'),
];
