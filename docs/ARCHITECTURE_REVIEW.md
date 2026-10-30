# MIMORA v3: evidence before advice

This review applies principles associated with Werner Vogels, Martin Kleppmann, Leslie Lamport and Martin Fowler. It is our engineering assessment, not their participation or endorsement.

## Failure observed

The v2 language workspace generated a valid descriptive report, but did not contain a pronunciation recognizer. Its Compare action measured duration and quiet frames, then left the learner to supply observations. The supplied expert file is 23.3 seconds and includes explanations, repeated examples and accent variants. The learner report describes a 7.9-second recording. Comparing full-file durations cannot identify a pronunciation mistake. The original learner audio was not supplied in this task, so no personal diagnosis is claimed.

## Changes implemented

| Architectural concern | Resolution in v3 | Remaining limit |
|---|---|---|
| A visible action promises more than its implementation | English Compare runs a real phoneme recognizer over explicit matching excerpts | Experimental recognition, not a validated pronunciation examiner |
| Unrelated content compared as one event stream | Original timestamp ranges, sound-region suggestions, user confirmation of matching phrase | Amplitude regions are not word detection; the learner selects the right example |
| Explanation lacks evidence | Separate recognizer, deterministic alignment, confidence filtering, practice-hint lookup, and presentation | Hints describe ways to practice; mouth movements are not measured |
| A recognizer silently rewrites an error into the intended word | Meta wav2vec2 phonetic CTC model; no text-language-model decoding in the comparison | Acoustic phoneme labels still contain recognition errors |
| Model inference becomes an authoritative verdict | Every detected difference is possible, no proficiency score; low agreement abstains; raw posteriors explicitly uncalibrated | Acceptance thresholds need calibration on instructor-labeled pairs |
| Async work contaminates a newer session | Generation checks and worker cancellation; result invalidation on new inputs; account reset clears audio and voice state | Multi-tab reconciliation beyond Supabase session handling is not implemented |
| Expensive computation stalls interaction | Workers, bounded 0.35–8 second excerpts, 240-second analysis timeout, explicit failure/manual fallback | Single-thread WASM and large downloads can be slow on small devices |
| Synthetic voice is confused with original expert evidence | Separate original replay and generated coaching; explicit permission checkbox; spoken and visible synthetic labels | Voice similarity and naturalness require human listening review |
| Hidden cloud dependencies and private recordings | Model downloads only; inference, source audio and voice conditioning remain on-device | Saved reports include file metadata, hashes and derived phonetic observations |
| Learner cannot recover a recording | Download original MediaRecorder blob with its actual MIME/extension | Original recordings are not retained after refresh |
| Unreproducible assessment | SHA-256 source identities, exact selected ranges, target, language, model revision, algorithm version, labels and original timestamps in report | Runtime/hardware floating-point variation remains possible |

## Design decisions and invariants

**Reliability and operation (Vogels lens).** Independent failure domains: local media ingestion, model downloads, inference, report persistence and speech output. A voice failure cannot turn into a pronunciation finding. Cancellation frees model workers. Only one heavy speech engine is kept by the studio when switching between recognition and voice generation. Cache failures degrade to downloading; they do not block practice. An analysis timeout provides an actionable retry/manual path.

**Data and derived views (Kleppmann lens).** Recordings are source evidence. Phones, alignments, observations and generated coaching are derived views. A saved report records the versions and source identities needed to trace its origin. Existing Supabase ownership policies remain authoritative. Voice embeddings and source recordings are not included in cloud report payloads. Future storage must separate originals from derived artifacts and maintain retention/deletion lineage.

**State and correctness (Lamport lens).** A computation can commit only to the generation that requested it. Changing the target or selected ranges invalidates derived results. A displayed original timestamp must refer to the corresponding original file, not a cropped buffer's zero. Source-independent hints cannot be presented as detected articulatory facts. Identical sound sequences cannot manufacture corrections. Silence, clipping and unrelated excerpts must abstain. Tested invariants are listed below.

**Modularity and evolution (Fowler lens).** Use a modular browser application before adding distributed services. `speech-core.js` contains pure transforms; `phoneme-worker.js` adapts the inference runtime; `speech-studio.js` orchestrates the feature and lifecycle; the pinned voice library is an isolated adapter. `app.js` still coordinates legacy music, profile and session flows; splitting it further is a sensible future refactor, not a reason to introduce service boundaries prematurely.

## Runtime flow

```
Expert + learner originals
  → decode / original-file hash / quality checks
  → explicit matching excerpt ranges + target phrase
  → 16 kHz normalized samples in a worker
  → phonetic CTC labels + approximate original timestamps
  → deterministic edit alignment + confidence/coverage gates
  → matching sounds / possible differences / abstention
  → original replay + bounded practice guidance + immutable report snapshot
  → optional on-device natural or permitted expert-voice coaching
```

## Verification in this change

- 33 automated tests: existing music/server/profile tests plus silence, excerpt bounds, CTC repeat/blank handling, source offsets, insertion alignment, identical-sequence negative control, substitution evidence, uncertainty abstention, unrelated excerpts and real WAV structure.
- Real expert MP3 decoded and recognized locally. Its detected regions include introductory speech and repeated target examples, demonstrating why full-recording comparison was unsuitable.
- Browser WASM negative control using the same actual expert excerpt twice: zero differences, matching-sound feedback.
- Voice model generated finite 24 kHz WAV audio using the supplied, permitted expert sample in both Node and browser WASM tests. This demonstrates the inference/export path, not a measured voice-similarity score.
- The learner's original attempt is unavailable; no claim is made about exactly how that person pronounced “memoir.”

## Before calling this a production pronunciation assessor

1. Build a consented, expert-labeled corpus: correct matches, controlled substitutions/deletions, alternative valid accents, background noise, children/adults, microphone variation and repeated words. Separate speakers between train/calibration/test data.
2. Measure false corrections, missed errors, coverage, alignment-boundary error, subgroup behavior and human usefulness. Publish model/rubric-specific numbers. Thresholds must be calibrated independently of the evaluation set.
3. Add word/phonetic forced alignment only with explicit mismatch handling; never force the intended transcript onto ambiguous audio and call the result observed speech.
4. For low-memory phones, add an opt-in hosted analysis path: authenticated upload authorization, private object store, job table, bounded queue, isolated model workers, idempotent request key `(source hashes, ranges, model, rubric)`, leases/retries and cancellation. Treat delivery as at-least-once; enforce result uniqueness transactionally.
5. Server workers need codec/duration validation, resource limits, retention/deletion, replay authorization, cost quotas, versioned telemetry and model rollback. Avoid storing voice samples/embeddings unless separately consented and necessary.
6. Keep phonetic evidence separate from any future LLM explanation. A structured evidence contract must constrain what coaching is allowed to say.

No production accuracy, “pioneer” ranking, complete accent coverage or universal correctness is claimed. The differentiator is a traceable expert-versus-learner correction loop that can be evaluated and improved.
