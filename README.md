# MIMORA

**From imitation to mastery.**

[Open the public app](https://kopriya.github.io/mimora/)

MIMORA connects people through the transfer of practical knowledge. Recreating an expert’s craft is the starting point; thoughtful feedback and continuous practice help learners refine their understanding and grow toward expertise.

[Production infrastructure and launch plan](docs/PRODUCTION.md)

An evidence-first practice studio: preserve a reference, compare an attempt, replay a meaningful difference, and practice again.

This is a working browser-first MVP based on the supplied eight-page system design. It is not a production perception system or a claim that arbitrary skills can be automatically assessed. The PDF's MIDI-first rollout guides the implementation.

## Run it

Requires Node.js 20 or newer. No npm installation is required. Guest practice needs no API key; shared accounts require the public Supabase configuration and database migration.

```sh
npm start
```

Open http://127.0.0.1:4173. The public GitHub Pages app and the original private Site run the same studio, without the local WAV endpoint.

```sh
npm test
npm run check
```

## Pronunciation and voice feedback (v3)

Language mode now recognizes speech sounds from selected English excerpts. Enter the target word/phrase, choose one matching occurrence in each clip, listen to confirm, then compare. Feedback shows possible substitutions, missing/extra sounds, what to retain, original timestamps and concrete practice hints. Uncertain or unrelated speech abstains; no overall pronunciation score is assigned. The expert is a reference for this exercise, not a universal accent standard.

Choose Natural coach or, with permission, Expert’s voice for on-device neural speech and downloadable WAV feedback. The original expert playback remains separate from generated speech. Browser-recorded audio/video can be downloaded from its recording card before leaving the session.

First use downloads large model files; desktop browsers are recommended. No recording is uploaded for model inference. See [models and licences](docs/SPEECH_MODELS.md), [architecture review](docs/ARCHITECTURE_REVIEW.md), and [account setup](docs/SUPABASE_SETUP.md).

## Profile-based practice

Start with a neutral workspace. Choose **Learning profile**, then your skill, experience, goal, practice language and feedback preference. Guest previews are temporary. Supabase is connected for email sign-in and shared profiles/reports. Its current default email sender limits testing to project-team addresses. See [the setup and verification guide](docs/SUPABASE_SETUP.md) before inviting public users.

- Language: target phrase, excerpt selection, English phoneme comparison, source replay and pronunciation review categories.
- Craft: expert-derived step checklist, video review and optional hand inspection.
- Movement: sequence checklist and coordination/timing observations.
- Presentation: key-message outline, delivery categories and audio measurements.
- Music: MIDI comparison, note/timing settings and explicitly labeled synthetic examples.

The app combines the profile with supported media types. MIDI selects music automatically; audio and video enable the appropriate recording tools. It does **not** infer a craft, spoken language or exercise from arbitrary recording contents. A manual workspace override is always available.

1. Set a learning profile and add the expert reference plus your attempt.
2. Write your target phrase, outline or step checklist when relevant.
3. Compare supported music evidence or open a guided review for other skills.
4. Replay original moments and add timestamped observations. Review or dismiss findings.
5. Listen to feedback or download a detailed text report. Sign in to save the report across devices.
6. Repeat with another attempt. Reattach original recordings when reopening saved reports for media playback.

## Implemented capabilities and limits

| Capability | Current behavior |
|---|---|
| MIDI | Standard MIDI types 0 and 1; running status and tempo maps; drum channel excluded; direct note events |
| Comparison | Global dynamic-programming event alignment; pitch mismatch, missing/extra events; original inter-onset timing with optional global tempo allowance |
| Scoring | MIDI only: note accuracy (35) and eligible timing (30), renormalized over available dimensions. Timing needs at least three matched events. Tone and technique never guessed. |
| Audio | Browser decoding and resampling, worker-based autocorrelation, clipping/silence/pitch coverage checks. Clean single-note phrases only; estimated findings are **possible**, with no automatic score. Repeated notes without a gap may merge. |
| Video | Local upload, playback and camera capture. Browser-decodable audio is measured for music. Incompatible codecs fall back to manual review. |
| Replay | Both corresponding finding spans seek to original timestamps and play together. Full clips play at their original relative timing; there is no continuous nonlinear video time warp. |
| Manual domains | Craft and other demonstrations: side-by-side review and timestamped observations. English language practice adds experimental phonetic comparison; no automatic proficiency grade or object-action scoring. |
| Hand landmarks | Optional MediaPipe inspection of paused frames; model runs in-browser. No automated technique conclusions or landmark scoring. |
| Coaching | Deterministic text derived from measured findings. No LLM dependency or invented physical diagnoses. |
| Audio feedback | On-device Pocket TTS natural and permitted expert voices with downloadable WAV; explicit device-voice fallback. Generated coaching is labeled synthetic. |
| Reports | Detailed text with source spans, methods, finding states, practice actions, limitations, and dismissed-findings audit |
| Profiles and history | Supabase email sign-in and per-user database integration; custom email sender needed for public sign-ups. Latest 30 reports shown across devices. Guest profiles are temporary; source recordings are not uploaded. |
| Limits | 250 MB file size; audio/video up to 60 seconds; 1,000 events; MIDI timestamps up to 600 seconds |

Do not use this release to grade unconstrained polyphonic music, infer exact fret/string contact, diagnose injuries, or judge a person's accent. These capabilities are not implemented. Different valid fingering is not penalized. A perfect event score does not imply perfect technique.

## Open-source model integration

**MediaPipe Hand Landmarker** is integrated through the optional “Inspect hands in paused videos” action in How it works. It downloads `@mediapipe/tasks-vision@0.10.21` and Google's hand landmark model, then processes the current frames locally. It is an inspection aid, not evidence that a movement is wrong.

An optional **Spotify Basic Pitch** adapter is included for a stronger music transcription experiment. This adapter has been syntax checked but its model dependencies have not been installed or benchmarked in this environment.

```sh
# Separate Python 3.10 environment recommended.
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements-audio.txt
# Install FFmpeg separately using your system package manager.
python tools/transcribe.py expert.mp4 expert-events.json
python tools/transcribe.py learner.mp4 learner-events.json
```

Import the two JSON files in the studio. Keep their results as estimates requiring review. Do not convert model-inferred events into direct-MIDI evidence to obtain a score. Basic Pitch predictions are not automatically calibrated confidence.

References: [Basic Pitch](https://github.com/spotify/basic-pitch), [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js).

## GitHub Pages deployment

`.github/workflows/pages.yml` publishes only `dist/` after syntax checks and tests pass. It runs on pushes to `main` and can be started manually. Repository Settings → Pages must use **GitHub Actions** as the publishing source. No secret keys belong in the frontend. Shared accounts require a public Supabase project URL and publishable key in `dist/config.js`.

The public URL is https://kopriya.github.io/mimora/. Relative asset and worker paths support the `/mimora/` prefix. The Node server and Python tools are source downloads, not services executed by GitHub Pages.

## Audio export

macOS needs no additional speech package. On Linux, install `espeak-ng` with your system package manager. Windows users can use browser speech or run the local server under Linux/WSL with espeak-ng. The endpoint accepts only a bounded text report, runs speech generation without a shell, serializes jobs, uses temporary files, and rejects cross-origin requests. The server binds only to loopback. Do not expose it directly to the internet.

Online, **Listen to feedback** uses the chosen natural, permitted expert, or device voice. Neural speech can be downloaded as a real WAV directly in the browser; device voices support playback only. The local server’s older speech endpoint remains optional and is not used by the new voice controls.

## Architecture

```
Reference + attempt (local File/MediaRecorder)
  -> MIDI parser OR AudioContext -> audio worker OR manual review
  -> validated note events (original timestamps)
  -> deterministic sequence alignment
  -> rubric + evidence gating -> timestamped findings
  -> paired replay / instructor review / bounded practice suggestions
  -> browser speech / local WAV / text report / saved attempts
```

- `dist/speech-core.js`: pure phoneme decoding/alignment, evidence gates, WAV encoding and reports.
- `dist/phoneme-worker.js`: pinned on-device recognition adapter.
- `dist/speech-studio.js`: excerpt selection, cancellation, voice controls and recording downloads.
- `dist/core.js`: media-independent MIDI parser, alignment, scoring, audio measurement, and report contracts.
- `dist/experience.js`: profile normalization, workspace selection, audio envelopes and guided reports.
- `dist/cloud.js` / `config.js`: Supabase sign-in, shared profiles and reports.
- `supabase/migrations/001_profiles.sql`: owner-only database access policies.
- `dist/audio-worker.js`: moves audio computation off the UI thread.
- `dist/app.js`: ingestion, media state, consent-triggered recording, review, replay, model inspection, and persistence.
- `dist/index.html` / `styles.css`: responsive and keyboard-accessible studio.
- `server.mjs`: zero-dependency static server and spoken WAV endpoint.
- `tests/`: behavioral core and local endpoint checks.
- `tools/transcribe.py`: optional FFmpeg / Basic Pitch adapter.

## Privacy

The GitHub Pages app and this repository are public; the original Site retains its private access. Recordings are local object URLs and are not sent to a server. With cloud configuration enabled, saving sends profile/report data, note events, observations, file metadata and compact waveforms to Supabase. Users can delete individual reports or clear history. Sign out on shared computers. Speech synthesis may use the operating system's speech service. Model inspection fetches public model assets; frames remain local. Fonts are fetched from Google Fonts, with system font fallbacks. Use recordings with the owner's permission; there is no training-data reuse.

## Verification

Thirty-three automated tests cover speech evidence and excerpt boundaries, WAV serialization, profile/media routing, audio envelopes, public-key validation, guided report semantics, and correct/slower performance, wrong pitch, missing and extra events, late transitions, uncertainty gating, strict tempo, malformed inputs, MIDI tempo changes and running status, silent audio, a clean A4 signal, report provenance, and server request validation. Supabase tables, owner-only policies and denied anonymous reads were verified. The owner confirmed email sign-in and profile entry work. Cross-device persistence and two-account testing remain to be completed. Local WAV export produced a valid mono 16-bit PCM WAV at 22,050 Hz. Browser checks cover the matching and uncertain demo states and responsive layout. Live camera capture, optional MediaPipe downloads, the Basic Pitch adapter and arbitrary user codecs require testing on the target devices.

These tests are regression checks on synthetic fixtures, not a measured accuracy benchmark on real learners. The PDF's 90% F1, 95% alignment, latency and availability goals remain unmeasured.

## Next production milestones

1. Obtain consented, instructor-labeled reference/attempt pairs with negative controls and disputed judgments.
2. Benchmark guitar transcription and alignment; add calibrated uncertainty and independently measured acceptance gates.
3. Connect and validate the included Supabase profile/report integration. Add a FastAPI job service, bounded worker queue and private recording storage for hosted media analysis; those services are not included.
4. Calibrate instrument/object geometry before making visual technique claims. Add validated step semantics for crafts and phonetic alignment for language learning.
5. Introduce an optional open-source coaching LLM only behind schema validation that permits explanations of measured findings, never new unsupported observations.

The source deliberately keeps measurement, evidence status, and explanation separate so these additions can replace perception adapters without rewriting the learning loop.
