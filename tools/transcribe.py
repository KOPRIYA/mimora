"""Optional Basic Pitch adapter. All inferred notes remain estimates in the studio."""
import argparse
import json
import pathlib
import subprocess
import tempfile

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('recording', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    args = parser.parse_args()
    if not args.recording.is_file():
        parser.error('Recording not found')
    from basic_pitch.inference import predict
    with tempfile.TemporaryDirectory(prefix='mimora-') as temporary:
        wav = pathlib.Path(temporary) / 'audio.wav'
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(args.recording.resolve()),
                        '-t', '60', '-vn', '-ar', '22050', '-ac', '1', str(wav)], check=True, timeout=90)
        _, _, notes = predict(str(wav))
        events = [dict(start=float(n[0]), end=float(n[1]), pitch=int(n[2]), confidence=float(n[3])) for n in notes]
        args.output.write_text(json.dumps({'method': 'spotify-basic-pitch-0.4.0', 'source': args.recording.name,
                                          'status': 'possible', 'events': events}, indent=2))
        print(f'{len(events)} estimated note events saved. Import both JSON files into the studio. No score is assigned.')

if __name__ == '__main__':
    main()
