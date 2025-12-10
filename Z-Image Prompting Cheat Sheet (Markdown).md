<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Z-Image Prompting Cheat Sheet (Markdown)

Use this as a reference when prompting **Z-Image / Z-Image Turbo** for text-to-image.

***

## 1. Core Mental Model for Z-Image

- Z-Image uses a **single-stream diffusion transformer (S3-DiT)**, processing text and image tokens together, so it responds best to **natural, descriptive language**, not keyword soup.[^1][^2][^3]
- It is optimized for **long, detailed prompts** and **few (1–8) sampling steps**, especially in the Turbo variant.[^4][^5][^6][^2]
- Compared to SD 1.5/XL, it “understands a short story” better than a pile of tags.[^7][^1]

**Bad (SD-style):**

```text
(masterpiece), (best quality), 4k, trending on artstation, ultra detailed, female, city street, bokeh
```

**Good (Z-Image-style):**

```text
A candid smartphone photo of a woman wearing a red satin dress standing on a busy New York street at dusk. 
Soft bokeh from the streetlights in the background, slight motion blur in the passing cars, natural skin tones.
```


***

## 2. Recommended Prompt Structure

Use this **4-part structure** for consistent results:

1. **Subject \& Action** – who/what, doing what
2. **Environment \& Context** – where, surrounding elements
3. **Lighting \& Atmosphere** – time of day, mood, weather, color
4. **Style \& Technical Details** – realism vs illustration, camera info, quality terms

### Generic Template

```text
[^1] SUBJECT & ACTION:
A [age] [gender/character description] [doing what / in what pose].

[^2] ENVIRONMENT & CONTEXT:
[Indoor/outdoor] scene in/at [location], with [background elements].

[^3] LIGHTING & ATMOSPHERE:
[Time of day / lighting type], [mood], [weather or ambiance if relevant].

[^4] STYLE & TECH DETAILS:
[photorealistic / cinematic / anime / flat illustration], 
shot on [camera type] with [lens focal length], 
[extra details like depth of field, film stock, aspect ratio].
```


### Example (Photorealistic Street Scene)

```text
A 25-year-old Asian woman in a red coat walking her golden retriever on a rainy Tokyo sidewalk at night. 
Crowded city street with neon signs, wet pavement reflecting colorful lights, passing cars and umbrellas in the background. 
Soft rim lighting from the shop windows, light rain visible in the air, moody but cozy atmosphere. 
Photorealistic, cinematic wide shot, shot on a 35mm lens, shallow depth of field, highly detailed.
```


***

## 3. Turbo vs Base: Prompting Quirks

### Z-Image Turbo (distilled few-step model)

- **Optimized for 1–8 steps**; default 8 gives best quality.[^5][^2][^4]
- Handles **long prompts well**; using more descriptive text = more control.[^6][^2][^8]
- Designed so that **positive prompt carries most of the signal**; many UIs still show a negative field, but:
    - Official guidance: **Turbo does not really rely on negative prompts / CFG** the way SD does.[^8][^6]
    - Best practice: keep negative prompt **empty or minimal** unless your UI clearly documents support.


### Z-Image Base

- Closer to classical diffusion behavior; some guides still recommend **simple negative prompts** (e.g., “cartoon, 3d render” if you want realism), but do not spam old SDXL embedding strings.[^9][^1]

***

## 4. Best Practices Specific to Z-Image

### 4.1 Use Natural Language, Full Sentences

- Write **short, clear sentences** instead of tag lists.[^1][^7]
- Z-Image responds well to **plain English (and Chinese)** with clear relationships: who, where, what, how.[^2][^7][^1]

```text
A cozy coffee shop interior with warm lighting, wooden tables, and people working on laptops, in a semi-realistic illustration style.
```


***

### 4.2 Leverage Bilingual Text Rendering

Z-Image is unusually good at **on-image text** in **English and Chinese**.[^10][^2][^1]

Best practices:

- **Wrap text in quotes** so it’s not confused with description.[^1]

```text
A cinematic night shot of a cyberpunk street food stall in Tokyo. 
A neon sign above the stall reading "NOODLES" in bright pink letters. 
Below it, a vertical holographic sign reading "美味" in glowing blue Chinese characters. 
Steam rising from the pots, wet pavement reflecting neon lights.
```

- If you care about typography, specify:
    - Font vibe: *bold sans-serif*, *handwritten script*, *retro arcade font*
    - Placement: *top center*, *lower third*, *on the storefront sign*

Example:

```text
Poster design for a tech conference. 
Dark gradient background with abstract geometric lines. 
The main title "AI FUTURES 2025" in bold white sans-serif letters centered at the top. 
Smaller subtitle "SAN FRANCISCO" in thin all-caps below the title. 
Clean, minimal layout, modern design style.
```


***

### 4.3 Composition and Camera Language

Because of its transformer architecture, Z-Image handles **camera and composition language** well.[^9][^7][^1]

Include:

- Shot type: *close-up*, *medium shot*, *wide shot*, *aerial view*, *top-down*
- Lens/focal length: *35mm*, *85mm portrait*, *16mm ultra wide*
- Camera type / film stock: *shot on a DSLR*, *analog film look, Kodak Portra 400*

Example:

```text
A top-down shot of a wooden desk with a laptop, notebook, and coffee mug neatly arranged. 
Soft morning light from a nearby window, gentle shadows, minimalistic workspace aesthetic. 
Photorealistic, shot with a 35mm lens, high resolution.
```


***

### 4.4 Style \& Aesthetic Modifiers (Without SD Spam)

You still can and should use **style modifiers**, but avoid legacy SD spam like “masterpiece, best quality, 8k, trending on ArtStation” every time.[^8][^9][^1]

Good style phrases:

- **Realism:** *photorealistic*, *natural skin tones*, *studio lighting*
- **Cinematic:** *cinematic lighting*, *film still*, *30fps movie frame*
- **Illustration:** *flat vector illustration*, *watercolor painting*, *comic book style*
- **Design:** *minimalist*, *isometric*, *infographic style*

Example:

```text
Minimalist flat-style illustration of a person working at a laptop with abstract shapes in the background. 
Soft pastel color palette, clean vector lines, modern UI/UX illustration style.
```


***

### 4.5 Prompt Length \& Prompt Enhancing

- Turbo supports **long contexts (up to around 1024 tokens)**; **longer prompts are welcome** and often improve control.[^6][^2][^8]
- Official docs recommend **prompt enhancing**:
    - Start with a short idea and let an LLM (online or local via ComfyUI-Ollama) expand it with extra scene detail.[^2][^6]
    - This is especially useful when using Z-Image inside workflows.

Example workflow:

1. Write:
`A knight riding a dragon over a medieval city at sunset`
2. Send to LLM with:
*“Expand this into a 3–4 sentence prompt optimized for Z-Image Turbo.”*
3. Use the expanded prompt directly in Z-Image.[^6][^2]

***

## 5. Negative Prompts (When and How)

There is conflicting community advice because the model variants differ. The **safe, Turbo-focused guidance**:

- **For Z-Image Turbo:**
    - The distillation and few-step design mean **negative prompts and CFG are not central** to how it operates.[^8][^6]
    - Official-style guides say: **“No negative prompts; just describe what you want.”**[^8]
    - If your UI forces a negative field, either leave it empty or use a **minimal, high-level** phrase like:
        - `cartoon, 3d render` (if you really want to bias away from non-photoreal styles)[^1]
- **For Z-Image Base:**
    - Some guides still suggest **simple negative prompts** to remove artifacts, not huge SDXL-style blocks.[^9]

Overall: **prioritize precise positive description over heavy negative prompts** for Z-Image.

***

## 6. Iteration Strategy for Better Results

A robust iteration loop for this model:

1. **Start sparse**

```text
A woman in a coffee shop.
```

2. **Add detail to fix issues** (age, clothing, pose, environment):

```text
A 28-year-old woman with auburn wavy hair sitting by the window in a cozy coffee shop, 
reading a worn paperback novel. Warm morning light streaming through the window. 
Cream knit sweater, thoughtful expression.
```

3. **Lock what works, then refine lighting/style/composition** instead of rewriting everything.[^7][^8]

***

## 7. Parameters \& Seeds (Turbo)

When the UI/host exposes options (fal.ai, WaveSpeed, ComfyUI, etc.):[^4][^5][^2]

- **Steps:**
    - 8 steps: **final quality** (default).
    - 1–4 steps: **thumbnails, fast iteration** (expect more artifacts).
- **Resolution:**
    - Explore composition at smaller sizes; upscale later.
    - Z-Image Turbo supports up to ~4 megapixels on some hosts.[^5]
- **Batch size:**
    - Generate **2–4 variations** per prompt to explore lighting/composition variants quickly.[^5]
- **Seed:**
    - Fix a seed to get repeatable outputs.
    - Change just small parts of the prompt to explore targeted variations.[^4][^5]

***

## 8. Ready-to-Use Prompt Templates

You can paste and adapt these directly.

### 8.1 Character Portrait (Photorealistic)

```text
Close-up portrait of a 30-year-old Black woman with natural curly hair, 
wearing a dark green turtleneck sweater, looking confidently at the camera. 
Soft studio lighting with a dark, slightly blurred background, gentle catchlights in the eyes, 
natural skin texture and subtle makeup. 
Photorealistic, shot on a DSLR with an 85mm portrait lens, shallow depth of field, high resolution.
```


***

### 8.2 Product Shot with On-Image Text

```text
Studio product shot of a sleek black wireless headphone set floating above a reflective black surface. 
Dark background with a soft gradient, subtle rim lighting outlining the shape of the headphones, 
faint blue accent light from the right side. 
At the top center, the text "NOVA SOUND" in bold white sans-serif letters. 
At the bottom right, smaller text "Wireless Freedom" in thin all-caps. 
Modern, minimalist advertising style, photorealistic, high contrast.
```


***

### 8.3 Stylized Illustration / UI Art

```text
Isometric illustration of a modern smart home dashboard on a large tablet screen, 
showing temperature, lighting, and security widgets. 
Soft pastel color palette with blues and purples, simple geometric icons, 
clean UI layout and clear typography. 
Flat vector style, minimal shadows, suitable for a tech landing page hero image.
```


***

### 8.4 Cinematic Scene with Text \& Atmosphere

```text
A rainy cyberpunk street at night in a dense Asian city. 
Crowded alleyway with neon signs, steam rising from food stalls, 
people walking with transparent umbrellas, puddles reflecting the lights. 
A large vertical sign on the left reads "NOODLES" in bright pink letters, 
and a smaller blue neon sign above a stall reads "深夜食堂". 
High contrast, strong reflections on wet pavement, cinematic lighting, 
wide establishing shot, photorealistic.
```


***

## 9. Summary of “Best Ways” to Prompt Z-Image

- **Think in sentences, not tags:** Describe the scene like you would to a human art director.[^7][^1]
- **Use a 4-part structure:** Subject \& action → environment → lighting \& mood → style \& tech.[^2][^9][^7][^1]
- **Lean on long prompts and prompt enhancement:** Turbo loves detailed descriptions; expand with an LLM when useful.[^6][^2][^8]
- **Exploit bilingual text rendering:** Wrap text in quotes and specify exact wording, placement, and style.[^2][^10][^1]
- **Go light or zero on negative prompts, especially with Turbo:** Rely on precise positive description; no SDXL-style spam.[^6][^8][^1]
- **Iterate surgically:** Fix specific issues with targeted additions rather than rewriting everything.[^8][^7]
- **Tune steps/resolution/seed for your workflow:** 8 steps for finals, fewer for drafts; fix seed for controlled variation.[^4][^5][^2]

Use this markdown as a base playbook and adapt examples to your own scenes, characters, and workflows.
<span style="display:none">[^11][^12][^13][^14][^15][^16][^17][^18][^19][^20]</span>

<div align="center">⁂</div>

[^1]: https://zimage.net/blog/z-image-prompting-masterclass

[^2]: https://docs.comfy.org/tutorials/image/z-image/z-image-turbo

[^3]: https://github.com/Tongyi-MAI/Z-Image

[^4]: https://wavespeed.ai/models/wavespeed-ai/z-image/turbo

[^5]: https://fal.ai/models/fal-ai/z-image/turbo

[^6]: https://huggingface.co/Tongyi-MAI/Z-Image-Turbo/discussions/8

[^7]: https://www.atlabs.ai/blog/ultimate-z-image-prompting-guide

[^8]: https://z-image.vip/blog/z-image-prompt-engineering-masterclass

[^9]: https://z-image.cc/blog/z-image-complete-guide-2025

[^10]: https://www.dzine.ai/tools/z-image/

[^11]: https://z-image.cc/blog/how-to-use-z-image-turbo-guide-2025

[^12]: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/gpt-4-v-prompt-engineering?view=foundry-classic

[^13]: https://geniusee.com/single-blog/prompt-engineering-best-practices

[^14]: https://www.reddit.com/r/StableDiffusion/comments/1pe91r6/looking_for_tips_to_get_better_results_while/

[^15]: https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api

[^16]: https://fal.ai/models/fal-ai/z-image/turbo/image-to-image

[^17]: https://www.facebook.com/groups/aigenart/posts/2447289008791656/

[^18]: https://www.youtube.com/watch?v=yr4GMARsv1E

[^19]: https://www.promptingguide.ai

[^20]: https://www.atlabs.ai/blog/imagen-4-prompting-guide

