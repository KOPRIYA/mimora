# Speech models, licences and operation

## Pronunciation

- Upstream: [Meta wav2vec2 LV60 espeak Common Voice](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft), Apache-2.0.
- ONNX int8 export: [Alimehdi973/wav2vec2-espeak-onnx-int8](https://huggingface.co/Alimehdi973/wav2vec2-espeak-onnx-int8), revision `6d4ca8853c7218ee12c0707b3ccde16310551bc3`.
- Approximately 355 MB for the phoneme model, plus the ONNX runtime. 16 kHz mono input, normalized per excerpt, greedy CTC decoding, approximate 20 ms output stride. Original offsets are restored before alignment/reporting.
- UI support is initially English. The upstream model has multilingual training, but that does not validate MIMORA coaching in every language.
- The current 0.55 raw posterior gate is a conservative engineering heuristic, not a calibrated accuracy threshold. Cross-accent and real-learner evaluation remains required.

## Natural and permitted expert voices

- Upstream: [Kyutai Pocket TTS](https://huggingface.co/kyutai/pocket-tts), model weights CC BY 4.0, upstream code MIT. Attribution: Kyutai Labs and Pocket TTS authors.
- ONNX conversion: [vlapky/pocket-tts-onnx](https://huggingface.co/vlapky/pocket-tts-onnx), revision `c469236dbc5f68287fa2fbf175b66de3b80123af`; derived from KevinAHM's ONNX export. English April 2026 bundle.
- Browser adapter: [vlapky/pocket-tts-js](https://github.com/vlapky/pocket-tts-js), MIT, vendored at commit `7d7a27423b0845eb0425c81a8aa5ed3f3d973eef`. Its LICENSE is included in `dist/vendor/pocket-tts/LICENSE`. Local change: `destroy()` rejects pending promises so cancellation cannot leave the application waiting forever.
- Natural preset path downloads roughly 178 MB of models/tokenizer/voice states; expert voice path roughly 146 MB of models plus runtime (sizes rounded; cache use varies). Models cache in browser Cache Storage. Synthesized output, source PCM and cloned-voice state remain in memory.
- Reference sample: 3–10 seconds of one clear speaker. The application requires permission confirmation for each new expert recording; generated output is visibly and audibly labeled synthetic. Do not present generated coaching as a genuine statement from the expert.
- Naturalness and speaker similarity vary; a short one-word sample may be insufficient. Device speech remains an explicit lightweight alternative.

## Runtime

Both adapters pin ONNX Runtime Web `1.24.3`, loaded from jsDelivr, and use WASM with one thread on static hosting. No special cross-origin isolation headers are required. The recognition worker times out after 240 seconds. Stop voice generation terminates its worker. No service-role key or external inference API is used.

GitHub Pages serves the application; Hugging Face and jsDelivr serve model/runtime downloads. Recordings are not posted to those services. Hostnames may be blocked by network policy; downloads may be slow or cache storage unavailable. The UI surfaces failures and retains manual review and original playback.
