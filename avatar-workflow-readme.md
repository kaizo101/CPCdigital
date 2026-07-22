# Avatar-Workflow für ComfyUI

## Setup (einmalig, ~15 Min)

### 1. ComfyUI installieren

- Lade den **ComfyUI_windows_portable** von https://github.com/comfyanonymous/ComfyUI/releases
- Entpacke, starte `run_nvidia_gpu.bat` (oder `run_cpu.bat` ohne Nvidia)
- Browser öffnet `http://localhost:8188`

### 2. SDXL-Model herunterladen

Empfohlen für fotorealistische Portraits:
- **Juggernaut XL v10** oder **RealVisXL v5.0** von https://civitai.com
- Datei (`.safetensors`) nach `ComfyUI/models/checkpoints/` kopieren
- Im Workflow `CheckpointLoaderSimple` den Dateinamen eintragen (Zeile 24, statt `sd_xl_base_1.0.safetensors`)

### 3. Face-Detection-Modelle

Die werden automatisch beim ersten Run heruntergeladen, aber du kannst sie auch manuell holen:
- `ComfyUI/models/ultralytics/bbox/face_yolov8m.pt` (für FaceDetailer)
- `ComfyUI/models/sams/sam_vit_b_01ec64.pth` (für SAM-Segmentierung)

Alternativ: ComfyUI Manager installieren → `Install Missing Custom Nodes` klickt alles automatisch.

### 4. Workflow laden

- In ComfyUI: **Workflow → Open** → `avatar-workflow.json` aus diesem Projekt auswählen
- Oder einfach die JSON-Datei ins Browser-Fenster ziehen

## Nutzung

### Prompt einsetzen

Die Prompts aus `avatar-prompts.json` verwenden. Jeder Prompt hat dieses Format:

```
Mara, a woman in her early-to-mid-20s with thin face with sharp cheekbones,
long wavy dark brown hair and a muted rust-red shirt, patient and watchful expression
```

**Gesamten Prompt für SDXL ergänzen** (im Workflow: `REPLACE_ME_POSITIVE` ersetzen):

```
portrait of a [INSERT PROMPT FROM JSON], shoulders up, centered, warm cinematic
lighting, dark neutral background with subtle green-blue poker-room atmosphere,
semi-realistic digital illustration, modern style, clean composition, 8k,
professional photography lighting
```

### 4er-Grid generieren

Statt ein einzelnes Portrait:

1. Vier separate KSampler-Node-Stränge parallel schalten (je einen pro Charakter)
2. Jeder bekommt den Prompt eines Charakters
3. Alle vier outputs in einen `ImageGrid`-Node führen (2×2, gap: 0)
4. Grid als 1024×1024 speichern

Oder einfacher: 4 Bilder einzeln generieren und nachher mit einem simplen Skript zum Grid croppen.

### Batch-Queue

ComfyUI kann Prompts in die Queue stellen:
- Node selektieren → Rechtsklick → `Queue Prompt`
- Oder im Queue-Panel rechts mehrere Prompts einreihen
- Der Fortschritt wird unten rechts angezeigt

### Nachbearbeitung

Nach der Generierung:
1. Schlechte Gesichter aussortieren (Artefakte, verzerrte Augen)
2. Grid (falls verwendet) → mit ImageMagick in 4× 512×512 croppen:
   ```
   magick grid.webp -crop 512x512 +repage avatar_%d.webp
   ```
3. Umbenennen nach `{nameKlein}.webp` → nach `packages/client/public/avatars/`
4. In `bot-avatars.ts` den neuen Key in `AVAILABLE_BOT_AVATAR_KEYS` eintragen

### Troubleshooting

- **Out of memory**: Batch size auf 1 reduzieren (EmptyLatentImage → `batch_size: 1`)
- **FaceDetailer findet kein Gesicht**: Prompt ändern, mehr "portrait, face, head" reinschreiben
- **Schwarzes Bild**: Falsches VAE-Model → im CheckpointLoader das baked-in VAE nutzen
- **ComfyUI stürzt ab**: Zu wenig VRAM → `--lowvram` Flag beim Start
