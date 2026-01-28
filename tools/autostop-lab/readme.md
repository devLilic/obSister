<!-- FILE: tools/autostop-lab/README.md -->
# AutoStop Lab (FAZA 1) — Stopframe candidates dintr-un video

Tool offline (Node/CLI), independent de Electron/OBSister runtime, care scanează un video și propune timestamps “stabile” unde merită creat un stopframe.

## Cerințe
- Node 18+ (recomandat 20+)
- ffmpeg instalat în PATH  
  sau setezi env:
    - `FFMPEG_PATH="C:\path\to\ffmpeg.exe"`
    - `FFPROBE_PATH="C:\path\to\ffprobe.exe"` (opțional, pentru durata video)

## Instalare
Din repo root:

```bash
cd tools/autostop-lab
npm i
