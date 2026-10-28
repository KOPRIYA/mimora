# MIMORA

**From imitation to mastery.**

MIMORA connects people through the transfer of practical knowledge. Recreating an expert’s craft is the starting point; thoughtful feedback and continuous practice help learners refine their understanding and grow toward expertise.

[Production infrastructure and launch plan](docs/PRODUCTION.md)

An evidence-first practice studio: preserve a reference, compare an attempt, replay a meaningful difference, and practice again.

This is a working, local-first MVP based on the supplied eight-page system design. It is not a production perception system or a claim that arbitrary skills can be automatically assessed. The PDF's MIDI-first rollout guides the implementation.

## Run it

Requires Node.js 20 or newer. No npm installation or API key is required.

```sh
npm start
```

Open http://127.0.0.1:4173. The online private Site runs the same studio, without the local WAV endpoint.

```sh
npm test
npm run check
```

## Try the learning loop

1. Explore the three labeled synthetic cases: differences, matching performance, and uncertain evidence. Findings are computed from event fixtures by the real comparison engine, not hardcoded.
2. Choose **New session**. Add your expert and learner `.mid` files, or short audio/video recordings. Examples are included in `examples/`.
3. Choose timing tolerance and whether overall tempo variation is allowed.
4. Compare. Click a finding to play the corresponding excerpts. Select which person's audio to hear; playback speed is adjustable.
5. Review or dismiss findings. Dismissal withholds the score to avoid a stale score. Recompare only after correcting source events or the rubric.
6. Listen to spoken feedback, download the detailed `.txt` report, and save the attempt.
7. Replace the learner recording and compare again. Save under the same title to see the score change when the reference and rubric match.

## Implemented capabilities and limits

| Capability | Current behavior |
|---|---|
| MIDI | Standard MIDI types 0 and 1; running status and tempo maps; drum channel excluded; direct note events |
| Comparison | Global dynamic-programming event alignment; pitch mismatch, missing/extra events; original inter-onset timing with optional global tempo allowance |
| Scoring | MIDI only: note accuracy (35) and eligible timing (30), renormalized over available dimensions. Timing needs at least three matched events. Tone and technique never guessed. |
| Audio | Browser decoding and resampling, worker-based autocorrelation, clipping/silence/pitch coverage checks. Clean single-note phrases only; estimated findings are **possible**, with no automatic score. Repeated notes without a gap may merge. |
| Video | Local upload, playback and camera capture. Browser-decodable audio is measured for music. Incompatible codecs fall back to manual review. |
| Replay | Both corresponding finding spans seek to original timestamps and play together. Full clips play at their original relative timing; there is no continuous nonlinear video time warp. |
| Manual domains | Craft, language, and other demonstrations: side-by-side recording review and timestamped instructor observations. No automated pronunciation or object-action scoring. |
| Hand landmarks | Optional MediaPipe inspection of paused frames; model runs in-browser. No automated technique conclusions or landmark scoring. |
| Coaching | Deterministic text derived from measured findings. No LLM dependency or invented physical diagnoses. |
| Audio feedback | Browser speech playback; downloadable spoken WAV through the local Node server (macOS `say`, or Linux `espeak-ng`). Browser speech voices vary by device. |
| Reports | Detailed text with source spans, methods, finding states, practice actions, limitations, and dismissed-findings audit |
| Progress | Up to 30 reports and event sequences saved in browser localStorage; source recordings are never stored |
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

## Audio export

macOS needs no additional speech package. On Linux, install `espeak-ng` with your system package manager. Windows users can use browser speech or run the local server under Linux/WSL with espeak-ng. The endpoint accepts only a bounded text report, runs speech generation without a shell, serializes jobs, uses temporary files, and rejects cross-origin requests. The server binds only to loopback. Do not expose it directly to the internet.

Online, **Listen to feedback** works through browser speech. The WAV button explains that downloadable speech requires the local server. It does not silently return a text file labeled as audio.

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

- `dist/core.js`: media-independent MIDI parser, alignment, scoring, audio measurement, and report contracts.
- `dist/audio-worker.js`: moves audio computation off the UI thread.
- `dist/app.js`: ingestion, media state, consent-triggered recording, review, replay, model inspection, and persistence.
- `dist/index.html` / `styles.css`: responsive and keyboard-accessible studio.
- `server.mjs`: zero-dependency static server and spoken WAV endpoint.
- `tests/`: behavioral core and local endpoint checks.
- `tools/transcribe.py`: optional FFmpeg / Basic Pitch adapter.

## Privacy

The hosted Site starts private. Recordings are local object URLs and are not sent to a server. Saved history contains note events, instructor observations and reports; users can delete individual entries or clear all history. On shared computers, clear history after practice. Speech synthesis may use the operating system's speech service. Model inspection fetches public model assets; frames remain local. Fonts are fetched from Google Fonts, with system font fallbacks. Use recordings with the owner's permission; there is no training-data reuse.

## Verification

Fourteen automated tests cover correct/slower performance, wrong pitch, missing and extra events, late transitions, uncertainty gating, strict tempo, malformed inputs, MIDI tempo changes and running status, silent audio, a clean A4 signal, report provenance, and server request validation. Local WAV export produced a valid mono 16-bit PCM WAV at 22,050 Hz. Browser checks cover the matching and uncertain demo states and responsive layout. Live camera capture, optional MediaPipe downloads, the Basic Pitch adapter and arbitrary user codecs require testing on the target devices.

These tests are regression checks on synthetic fixtures, not a measured accuracy benchmark on real learners. The PDF's 90% F1, 95% alignment, latency and availability goals remain unmeasured.

## Next production milestones

1. Obtain consented, instructor-labeled reference/attempt pairs with negative controls and disputed judgments.
2. Benchmark guitar transcription and alignment; add calibrated uncertainty and independently measured acceptance gates.
3. Add a FastAPI job service, bounded worker queue, PostgreSQL, private object storage, authentication, per-user access controls and deletion. Those production services are not included in this browser MVP.
4. Calibrate instrument/object geometry before making visual technique claims. Add validated step semantics for crafts and phonetic alignment for language learning.
5. Introduce an optional open-source coaching LLM only behind schema validation that permits explanations of measured findings, never new unsupported observations.

The source deliberately keeps measurement, evidence status, and explanation separate so these additions can replace perception adapters without rewriting the learning loop.
