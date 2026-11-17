# Clear wording and uncluttered UI

Apply these principles when creating or editing learner-facing content and interfaces.
Judge clarity from the learner’s stated prerequisite knowledge, rather than the author’s
familiarity with the implementation.

## Make every sentence useful and unambiguous

- Review the entire learning path sentence by sentence, including headings, labels,
  instructions, examples, feedback and optional material. Do not fix only the reported example.
- Give each sentence a clear purpose: context, explanation, learner action, automatic
  behavior or interpretation of a result. Rewrite sentences whose role is ambiguous.
- Distinguish what the page prepares automatically, what already exists, what happens
  when a control is used, and what the learner must do. Never present automatic setup
  as an instruction to the learner.
- Give actionable directions: identify the control or editable location, the exact change,
  when to run it, and the evidence to inspect. Ensure the requested action is possible
  through the interface. Do not ask learners to edit read-only setup.
- Explain what a comparison should reveal. Name the relevant output fields and quantities;
  avoid vague directions such as “compare the results” without a question or purpose.
- Introduce necessary terms before relying on them. Explain unfamiliar shorthand and
  helper functions where relevant. Keep implementation details out of the main path unless
  they help the learner act, understand the result or make a decision.
- Make claims match the actual example. Distinguish observations, expectations, illustrative
  models and production claims. State relevant assumptions and limitations near the claim.
- Remove repetition, filler and labels that add no meaning. Retain useful context and
  explanations; brevity alone does not establish clarity.

For example, replace “Start with zero batches. Compare the metadata path with the number
of data files” with “The page prepares an empty table automatically. Click Run experiment
with the code unchanged. In the output, find the metadata address and the data-file count.
Can the table have metadata before it has any data files?”

## Give the interface one clear path

- Present a natural sequence: purpose, question, prepared state, action, result,
  explanation and next experiment. Make the next useful action easy to identify.
- Keep essential instructions, explanations and result interpretation visible. Do not
  hide information needed to complete or understand the current task behind a disclosure.
- Use collapsed sections only for genuinely optional material, such as technical inspection,
  personal notes, references or alternate explanations. Give each a descriptive label.
  Merge overlapping sections and avoid nested disclosures unless the nesting serves a
  clear purpose, such as attempting a question before revealing its answer.
- Prefer removing unnecessary content to hiding it. Evaluate every badge, metric card,
  hint, status message and control for its value at that point in the learner’s journey.
- Show controls and status messages when they are useful. Keep one primary action prominent;
  place secondary tools nearby without letting them compete with it.
- Show relevant output and explain what its quantities mean. Put raw diagnostic detail
  and exports in optional tools when they are not the focus of the lesson.
- Give accurate, actionable feedback. A valid edited experiment may differ from the original
  assertions; do not present that difference as a learner failure. Distinguish execution
  errors, original-example checks and understanding checks. Identify which example an
  explanation or diagram describes.
- Use consistent heading hierarchy, terminology and visual treatment. Keep prose comfortably
  readable while allowing code, diagrams and results the width they need. Preserve a clear
  reading order on phone, tablet and desktop screens.

## Verify the learner’s experience

For substantive content or flow changes, walk through the instructions as a learner.
Check that the original example and suggested edits do what the wording says, that essential
information can be found without opening every section, and that reading remains possible
without running the example. Inspect relevant screen sizes, themes and keyboard interactions.
Preserve existing saved work when simplifying the interface. Report implementation checks
separately from any evidence of learning effectiveness; passing tests is not proof of understanding.
