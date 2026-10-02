# Avatar Workflow for ComfyUI

Status: optional, external asset creation; not part of the app build.

## Setup (once, ~15 min)

### 1. Install ComfyUI

- Download **ComfyUI_windows_portable** from https://github.com/comfyanonymous/ComfyUI/releases
- Unpack it, start `run_nvidia_gpu.bat` (or `run_cpu.bat` without Nvidia)
- The browser opens `http://localhost:8188`

### 2. Download an SDXL model

Recommended for photorealistic portraits:
- **Juggernaut XL v10** or **RealVisXL v5.0** from https://civitai.com
- Copy the file (`.safetensors`) to `ComfyUI/models/checkpoints/`
- Enter the file name in `CheckpointLoaderSimple` in the workflow (line 24, instead of `sd_xl_base_1.0.safetensors`)

### 3. Face detection models

These are downloaded automatically on the first run, but you can also fetch them
manually:
- `ComfyUI/models/ultralytics/bbox/face_yolov8m.pt` (for FaceDetailer)
- `ComfyUI/models/sams/sam_vit_b_01ec64.pth` (for SAM segmentation)

Alternatively: install ComfyUI Manager → `Install Missing Custom Nodes`
installs everything automatically.

### 4. Load the workflow

- In ComfyUI: **Workflow → Open** → select [`avatar-workflow.json`](../../../avatar-workflow.json) from the project directory
- Or simply drag the JSON file into the browser window

## Usage

### Insert the prompt

Generate the prompts with `npx tsx scripts/generate-avatar-prompts.ts` in the
project directory; the script writes `avatar-prompts.json`. Each prompt has
this format:

```
Mara, a woman in her early-to-mid-20s with thin face with sharp cheekbones,
long wavy dark brown hair and a muted rust-red shirt, patient and watchful expression
```

**Complete the full prompt for SDXL** (in the workflow: replace
`REPLACE_ME_POSITIVE`):

```
portrait of a [INSERT PROMPT FROM JSON], shoulders up, centered, warm cinematic
lighting, dark neutral background with subtle green-blue poker-room atmosphere,
semi-realistic digital illustration, modern style, clean composition, 8k,
professional photography lighting
```

### Generate a 4-up grid

Instead of a single portrait:

1. Wire up four separate KSampler node chains in parallel (one per character)
2. Each one gets the prompt of one character
3. Route all four outputs into one `ImageGrid` node (2×2, gap: 0)
4. Save the grid as 1024×1024

Or simpler: generate the 4 images individually and crop them into a grid
afterwards with a simple script.

### Batch queue

ComfyUI can queue prompts:
- Select node → right-click → `Queue Prompt`
- Or queue several prompts in the queue panel on the right
- Progress is shown in the bottom right

### Post-processing

After generation:
1. Sort out bad faces (artefacts, distorted eyes)
2. Grid (if used) → crop into 4× 512×512 with ImageMagick:
   ```
   magick grid.webp -crop 512x512 +repage avatar_%d.webp
   ```
3. Rename to `{nameKlein}.webp` → into `packages/client/public/avatars/`
4. Enter the new key in `AVAILABLE_BOT_AVATAR_KEYS` in `bot-avatars.ts`

### Troubleshooting

- **Out of memory**: reduce the batch size to 1 (EmptyLatentImage → `batch_size: 1`)
- **FaceDetailer finds no face**: change the prompt, write more "portrait, face, head" into it
- **Black image**: wrong VAE model → use the baked-in VAE in the CheckpointLoader
- **ComfyUI crashes**: too little VRAM → `--lowvram` flag at startup
