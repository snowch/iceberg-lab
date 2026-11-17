# Learning, UX and visual-design review

Scope: all 42 lessons, course entry, lesson reader, feedback, mobile and keyboard flows.

## Guidance and provenance

The installed Sites skill's presentation-led design guidance was applied: a complete visitor progression,
concrete subject imagery, meaningful sections and presentation depth without unrelated features.
No dedicated instructional-design or UX skill was installed in this session (cloud and executor catalogs
were checked). The learning and usability criteria below are an explicit review rubric, not a claim of
external skill execution, user research, or independent expert approval.

## Learning review → implemented changes

- **One assessable objective per lesson:** retained the small-lesson structure and existing real-runtime checks.
- **Explain before manipulating:** added a specific concept explanation to every lesson, including the mechanism
  needed to interpret the experiment. Avoided making beginners infer everything from API calls.
- **Activate a prediction:** added optional locally saved predictions with a reason, not an obligatory gate.
- **Offer graduated help:** a specific starting hint precedes a separately disclosed evidence cue, before the full
  worked explanation. This lets learners choose the amount of support they need.
- **Give actionable feedback:** wrong explanation answers point to lesson-specific evidence; changed experiments
  are distinguished from original check targets. Evidence cues are adjacent to actual output.
- **Promote explanation:** optional saved reflection asks learners to reconcile prediction and evidence and name
  an application. Prediction and reflection accompany exported evidence.
- **Test transfer:** seven section-end unfamiliar scenarios each have three concrete self-review criteria.
  These are self-review opportunities, not automatically graded claims of mastery.
- **Make entry flexible:** three role/task paths identify their included sections. Every experiment remains
  independent, and the complete ordered course remains visible.

## UX review → implemented changes

- Keep computation opt-in and reading possible before the WASM runtime loads.
- Show the reset boundary before an experiment and retain setup details near the editor.
- Add in-page stage navigation without changing lesson URLs or resetting learner state.
- Preserve draft code, predictions and reflections per lesson; keep review bookmarks distinct from certification.
- Keep primary execution, stop and exports recognizable. Retain keyboard navigation and visible focus states.
- Keep optional support collapsed; avoid adding gates or requiring all fields to continue.
- Test mobile navigation, no horizontal page overflow, native editor focus, note persistence, hints and recovery.

## Visual-design review → implemented changes

- Arctic palette: deep water, ice blue and restrained warm accents in both light and dark themes.
- Original vector iceberg illustration and a separate, accurately labelled metadata chain.
- Editorial serif headings with larger, comfortable body text; monospace is reserved for code and data.
- Clearer rhythm among explanation, prediction, execution, observation and application.
- Learning paths provide an actionable entry before the complete section listing.
- Responsive layouts, contrast-conscious text colors and reduced-motion support.

## Verification and limits

Automated verification covers all original experiments in pinned Pyodide WASM, scaffold coverage, transfer rubric
structure, browser runtime and exports, all lesson deep links, mobile overflow, keyboard access, progressive hints
and per-lesson note persistence. Screenshots are visually inspected at desktop and mobile sizes.

These checks establish functioning course flows and implementation behavior. Learning effectiveness still needs
learner observation: ask a novice to explain file membership, pruning and retention in a new scenario, and note
where they seek help. Do not describe these improvements as a measured learning-outcome gain.
