"""Original narrated concept recaps. Requires npm dependencies, Chromium and FFmpeg with Flite.
Ordinary site builds use the committed assets. Rebuild explicitly with python scripts/build-media.py.
"""
import concurrent.futures
import json
import math
import re
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT/'test-results/media'
subprocess.run(['node','scripts/render-media.mjs'],cwd=ROOT,check=True)
inputs=json.loads((WORK/'inputs.json').read_text())
def cmd(args):
    subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def duration(path):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
def stamp(seconds):
    ms=round(seconds*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
def build(item):
    identifier,recap=item
    dest=ROOT/'public/media'/identifier;dest.mkdir(parents=True,exist_ok=True)
    cursor=0; captions=['WEBVTT',''];scenes=[];parts=[]
    for index,scene in enumerate(recap['scenes']):
        prefix=WORK/f'{identifier}-{index}'
        audio_parts=[];audio_duration=0
        for cue,sentence in enumerate(re.split(r'(?<=[.!?])\s+(?=[A-Z])',scene['text'])):
            text=WORK/f'{identifier}-{index}-{cue}.txt'
            text.write_text(sentence.replace('Iceberg','Ice berg').replace('metadata','meta data').replace('SQL','S Q L').replace('SQLite','S Q Lite'))
            audio=text.with_suffix('.wav')
            cmd(['ffmpeg','-y','-v','error','-f','lavfi','-i',f"flite=textfile='{text}':voice=slt",'-ar','24000',str(audio)])
            length=duration(audio)
            captions.extend([f'{stamp(cursor+.5+audio_duration)} --> {stamp(cursor+.5+audio_duration+length)}',sentence,''])
            audio_duration+=length;audio_parts.append(f"file '{audio}'")
        concat=prefix.with_suffix('.txt');concat.write_text('\n'.join(audio_parts))
        wav=prefix.with_suffix('.wav')
        cmd(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c:a','pcm_s16le',str(wav)])
        seconds=audio_duration+1.5
        clip=prefix.with_suffix('.mp4')
        cmd(['ffmpeg','-y','-v','error','-loop','1','-framerate','12','-i',str(prefix.with_suffix('.png')),'-i',str(wav),'-vf','format=yuv420p','-af','adelay=500|500,apad','-t',str(seconds),'-c:v','libx264','-preset','fast','-tune','stillimage','-crf','25','-threads','2','-c:a','aac','-b:a','64k',str(clip)])
        parts.append(f"file '{clip}'");scenes.append({'title':scene['title'],'start':cursor,'end':cursor+seconds});cursor+=seconds
    concat=WORK/f'{identifier}-concat.txt';concat.write_text('\n'.join(parts))
    cmd(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(dest/'recap.mp4')])
    cmd(['ffmpeg','-y','-v','error','-i',str(WORK/f'{identifier}-0.png'),'-frames:v','1',str(dest/'poster.jpg')])
    cmd(['ffmpeg','-y','-v','error','-i',str(dest/'recap.mp4'),'-c:v','libvpx-vp9','-b:v','0','-crf','35','-cpu-used','5','-row-mt','1','-threads','2','-c:a','libopus','-b:a','48k',str(dest/'recap.webm')])
    (dest/'captions.vtt').write_text('\n'.join(captions))
    print('Built',identifier,math.ceil(cursor),'seconds',flush=True)
    return identifier,{'durationSeconds':math.ceil(cursor),'bytes':(dest/'recap.mp4').stat().st_size,'webmBytes':(dest/'recap.webm').stat().st_size,'scenes':scenes,'speech':{'engine':'Flite','voice':'slt'},'captionTiming':'Per-sentence synthetic audio duration; 0.5 s leading and 1 s closing hold per scene.'}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    manifest=dict(pool.map(build,inputs.items()))
(ROOT/'public/media-manifest.js').write_text('export const media = '+json.dumps(manifest,indent=2)+';\n')
print('Wrote media manifest. Videos are explicit opt-in downloads.')
