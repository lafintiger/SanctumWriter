/**
 * ComfyUI API Client
 * Handles communication with local ComfyUI instance for image generation
 */

import { AspectRatio, ASPECT_RATIOS } from '@/lib/store/useImageStore';

// Node IDs in the z-image-turbo workflow
const WORKFLOW_NODES = {
  POSITIVE_PROMPT: 8,    // CLIPTextEncode (Positive)
  NEGATIVE_PROMPT: 2,    // CLIPTextEncode (Negative)
  LATENT_IMAGE: 12,      // EmptySD3LatentImage (width, height, batch)
  KSAMPLER: 13,          // KSampler (seed, steps, cfg, etc.)
  SAVE_IMAGE: 9,         // SaveImage
};

export interface ComfyUIConfig {
  baseUrl: string;
  timeout?: number;
}

export interface QueuePromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

export interface HistoryResponse {
  [prompt_id: string]: {
    prompt: unknown[];
    outputs: {
      [node_id: string]: {
        images?: Array<{
          filename: string;
          subfolder: string;
          type: string;
        }>;
      };
    };
    status: {
      status_str: string;
      completed: boolean;
      messages: Array<[string, unknown]>;
    };
  };
}

export interface GenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  seed?: number;
  steps?: number;
  cfg?: number;
  batchSize?: number;
  filenamePrefix?: string;
}

/**
 * Load and parse the Z-Image Turbo workflow
 */
export async function loadWorkflow(): Promise<Record<string, unknown>> {
  // The workflow is stored as a constant to avoid file system dependencies in browser
  return JSON.parse(JSON.stringify(Z_IMAGE_TURBO_WORKFLOW));
}

/**
 * Modify workflow with user inputs
 */
export function prepareWorkflow(
  workflow: Record<string, unknown>,
  options: GenerationOptions
): Record<string, unknown> {
  const modified = JSON.parse(JSON.stringify(workflow));
  const nodes = modified.nodes as Array<{ id: number; widgets_values: unknown[] }>;
  
  const { width, height } = ASPECT_RATIOS[options.aspectRatio];
  
  // Find and modify nodes by ID
  for (const node of nodes) {
    switch (node.id) {
      case WORKFLOW_NODES.POSITIVE_PROMPT:
        // Set positive prompt
        node.widgets_values[0] = options.prompt;
        break;
        
      case WORKFLOW_NODES.NEGATIVE_PROMPT:
        // Set negative prompt (default: "blurry")
        node.widgets_values[0] = options.negativePrompt || 'blurry';
        break;
        
      case WORKFLOW_NODES.LATENT_IMAGE:
        // Set dimensions and batch size
        node.widgets_values[0] = width;
        node.widgets_values[1] = height;
        node.widgets_values[2] = options.batchSize || 1;
        break;
        
      case WORKFLOW_NODES.KSAMPLER:
        // Set seed (randomize if not provided)
        if (options.seed !== undefined) {
          node.widgets_values[0] = options.seed;
          node.widgets_values[1] = 'fixed';
        } else {
          node.widgets_values[0] = Math.floor(Math.random() * 1000000000000000);
          node.widgets_values[1] = 'randomize';
        }
        // Set steps
        if (options.steps !== undefined) {
          node.widgets_values[2] = options.steps;
        }
        // Set CFG
        if (options.cfg !== undefined) {
          node.widgets_values[3] = options.cfg;
        }
        break;
        
      case WORKFLOW_NODES.SAVE_IMAGE:
        // Set filename prefix
        if (options.filenamePrefix) {
          node.widgets_values[0] = options.filenamePrefix;
        }
        break;
    }
  }
  
  return modified;
}

/**
 * Convert workflow to API format (prompt format)
 * ComfyUI API expects a different format than the saved workflow
 */
export function workflowToPrompt(workflow: Record<string, unknown>): Record<string, unknown> {
  const nodes = workflow.nodes as Array<{
    id: number;
    type: string;
    inputs: Array<{ name: string; link?: number; type: string }>;
    widgets_values: unknown[];
  }>;
  
  const links = workflow.links as Array<[number, number, number, number, number, string]>;
  
  // Build a map of link_id -> [source_node_id, source_slot]
  const linkMap = new Map<number, [number, number]>();
  for (const link of links) {
    const [link_id, source_node, source_slot] = link;
    linkMap.set(link_id, [source_node, source_slot]);
  }
  
  // Convert to prompt format
  const prompt: Record<string, unknown> = {};
  
  for (const node of nodes) {
    // Skip non-processing nodes (Notes, Labels, etc.)
    if (['Note', 'Label (rgthree)', 'Fast Groups Bypasser (rgthree)'].includes(node.type)) {
      continue;
    }
    
    const inputs: Record<string, unknown> = {};
    let widgetIndex = 0;
    
    // Process inputs - either linked or from widgets
    if (node.inputs) {
      for (const input of node.inputs) {
        if (input.link !== undefined && input.link !== null) {
          // This input is connected to another node
          const [sourceNode, sourceSlot] = linkMap.get(input.link) || [0, 0];
          inputs[input.name] = [String(sourceNode), sourceSlot];
        } else if (input.type !== 'COMBO' && input.type !== '*') {
          // This input uses a widget value
          // Skip - will be handled in class_type specific logic
        }
      }
    }
    
    // Add widget values as inputs based on node type
    // This is a simplified mapping - actual mapping depends on node type
    const widgetValues = node.widgets_values || [];
    
    prompt[String(node.id)] = {
      class_type: node.type,
      inputs: {
        ...inputs,
        ...mapWidgetsToInputs(node.type, widgetValues, node.inputs || []),
      },
    };
  }
  
  return prompt;
}

/**
 * Map widget values to input names based on node type
 */
function mapWidgetsToInputs(
  nodeType: string,
  widgetValues: unknown[],
  nodeInputs: Array<{ name: string; link?: number; type: string; widget?: { name: string } }>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  
  // Get list of widget-backed inputs
  const widgetInputs = nodeInputs.filter(inp => inp.widget);
  
  // Map based on node type
  switch (nodeType) {
    case 'CLIPTextEncode':
      inputs.text = widgetValues[0];
      break;
      
    case 'EmptySD3LatentImage':
      inputs.width = widgetValues[0];
      inputs.height = widgetValues[1];
      inputs.batch_size = widgetValues[2];
      break;
      
    case 'KSampler':
      inputs.seed = widgetValues[0];
      // widgetValues[1] is 'randomize'/'fixed' - skip
      inputs.steps = widgetValues[2];
      inputs.cfg = widgetValues[3];
      inputs.sampler_name = widgetValues[4];
      inputs.scheduler = widgetValues[5];
      inputs.denoise = widgetValues[6];
      break;
      
    case 'SaveImage':
      inputs.filename_prefix = widgetValues[0];
      break;
      
    case 'UnetLoaderGGUF':
      inputs.unet_name = widgetValues[0];
      break;
      
    case 'CLIPLoaderGGUF':
      inputs.clip_name = widgetValues[0];
      inputs.type = widgetValues[1];
      break;
      
    case 'VAELoader':
      inputs.vae_name = widgetValues[0];
      break;
      
    case 'ModelSamplingAuraFlow':
      inputs.shift = widgetValues[0];
      break;
      
    case 'FastFilmGrain':
      inputs.grain_intensity = widgetValues[0];
      inputs.saturation_mix = widgetValues[1];
      inputs.batch_size = widgetValues[2];
      break;
      
    case 'FastLaplacianSharpen':
      inputs.strength = widgetValues[0];
      break;
      
    case 'Power Lora Loader (rgthree)':
      // Complex node - skip widget mapping
      break;
      
    default:
      // For unknown nodes, try to map by position
      let idx = 0;
      for (const inp of widgetInputs) {
        if (idx < widgetValues.length) {
          inputs[inp.widget!.name] = widgetValues[idx];
          idx++;
        }
      }
  }
  
  return inputs;
}

/**
 * Generate a descriptive filename from prompt
 */
export function generateFilename(prompt: string): string {
  // Extract key words from prompt
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 4);
  
  const timestamp = new Date().toISOString().slice(0, 10);
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  
  return `${words.join('-')}-${timestamp}-${randomSuffix}`;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'that', 'this', 'these', 'those',
]);

/**
 * Z-Image Turbo Workflow (embedded)
 * Based on user's z-image-turbo.json
 */
const Z_IMAGE_TURBO_WORKFLOW = {
  "last_node_id": 21,
  "last_link_id": 16,
  "nodes": [
    {
      "id": 8,
      "type": "CLIPTextEncode",
      "widgets_values": ["A beautiful landscape"],
      "inputs": [
        {"name": "clip", "type": "CLIP", "link": 7},
        {"name": "text", "type": "STRING", "widget": {"name": "text"}, "link": null}
      ],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [11]}]
    },
    {
      "id": 2,
      "type": "CLIPTextEncode",
      "widgets_values": ["blurry"],
      "inputs": [
        {"name": "clip", "type": "CLIP", "link": 1},
        {"name": "text", "type": "STRING", "widget": {"name": "text"}, "link": null}
      ],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [12]}]
    },
    {
      "id": 10,
      "type": "UnetLoaderGGUF",
      "widgets_values": ["z_image_turbo-Q8_0.gguf"],
      "inputs": [{"name": "unet_name", "type": "COMBO", "widget": {"name": "unet_name"}, "link": null}],
      "outputs": [{"name": "MODEL", "type": "MODEL", "links": [9]}]
    },
    {
      "id": 14,
      "type": "CLIPLoaderGGUF",
      "widgets_values": ["Qwen3-4B-UD-Q6_K_XL.gguf", "lumina2"],
      "inputs": [
        {"name": "clip_name", "type": "COMBO", "widget": {"name": "clip_name"}, "link": null},
        {"name": "type", "type": "COMBO", "widget": {"name": "type"}, "link": null}
      ],
      "outputs": [{"name": "CLIP", "type": "CLIP", "links": [15]}]
    },
    {
      "id": 15,
      "type": "VAELoader",
      "widgets_values": ["ae.safetensors"],
      "inputs": [{"name": "vae_name", "type": "COMBO", "widget": {"name": "vae_name"}, "link": null}],
      "outputs": [{"name": "VAE", "type": "VAE", "links": [6]}]
    },
    {
      "id": 11,
      "type": "ModelSamplingAuraFlow",
      "widgets_values": [3.1],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 9},
        {"name": "shift", "type": "FLOAT", "widget": {"name": "shift"}, "link": null}
      ],
      "outputs": [{"name": "MODEL", "type": "MODEL", "links": [14]}]
    },
    {
      "id": 16,
      "type": "Power Lora Loader (rgthree)",
      "widgets_values": [{}, {}, {}, ""],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 14},
        {"name": "clip", "type": "CLIP", "link": 15}
      ],
      "outputs": [
        {"name": "MODEL", "type": "MODEL", "links": [10]},
        {"name": "CLIP", "type": "CLIP", "links": [1, 7]}
      ]
    },
    {
      "id": 12,
      "type": "EmptySD3LatentImage",
      "widgets_values": [1088, 1920, 1],
      "inputs": [
        {"name": "width", "type": "INT", "widget": {"name": "width"}, "link": null},
        {"name": "height", "type": "INT", "widget": {"name": "height"}, "link": null},
        {"name": "batch_size", "type": "INT", "widget": {"name": "batch_size"}, "link": null}
      ],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [13]}]
    },
    {
      "id": 13,
      "type": "KSampler",
      "widgets_values": [375915526533408, "randomize", 9, 1, "euler", "simple", 1],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 10},
        {"name": "positive", "type": "CONDITIONING", "link": 11},
        {"name": "negative", "type": "CONDITIONING", "link": 12},
        {"name": "latent_image", "type": "LATENT", "link": 13},
        {"name": "seed", "type": "INT", "widget": {"name": "seed"}, "link": null},
        {"name": "steps", "type": "INT", "widget": {"name": "steps"}, "link": null},
        {"name": "cfg", "type": "FLOAT", "widget": {"name": "cfg"}, "link": null},
        {"name": "sampler_name", "type": "COMBO", "widget": {"name": "sampler_name"}, "link": null},
        {"name": "scheduler", "type": "COMBO", "widget": {"name": "scheduler"}, "link": null},
        {"name": "denoise", "type": "FLOAT", "widget": {"name": "denoise"}, "link": null}
      ],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [5]}]
    },
    {
      "id": 7,
      "type": "VAEDecode",
      "widgets_values": [],
      "inputs": [
        {"name": "samples", "type": "LATENT", "link": 5},
        {"name": "vae", "type": "VAE", "link": 6}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [2]}]
    },
    {
      "id": 3,
      "type": "easy cleanGpuUsed",
      "widgets_values": [],
      "inputs": [{"name": "anything", "type": "*", "link": 2}],
      "outputs": [{"name": "output", "type": "*", "links": [4]}]
    },
    {
      "id": 5,
      "type": "easy clearCacheAll",
      "widgets_values": [],
      "inputs": [{"name": "anything", "type": "*", "link": 4}],
      "outputs": [{"name": "output", "type": "*", "links": [3]}]
    },
    {
      "id": 4,
      "type": "FastLaplacianSharpen",
      "widgets_values": [0.4],
      "inputs": [
        {"name": "images", "type": "IMAGE", "link": 3},
        {"name": "strength", "type": "FLOAT", "widget": {"name": "strength"}, "link": null}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [16]}]
    },
    {
      "id": 21,
      "type": "FastFilmGrain",
      "widgets_values": [0.012, 0.3, 4],
      "inputs": [
        {"name": "images", "type": "IMAGE", "link": 16},
        {"name": "grain_intensity", "type": "FLOAT", "widget": {"name": "grain_intensity"}, "link": null},
        {"name": "saturation_mix", "type": "FLOAT", "widget": {"name": "saturation_mix"}, "link": null},
        {"name": "batch_size", "type": "INT", "widget": {"name": "batch_size"}, "link": null}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [8]}]
    },
    {
      "id": 9,
      "type": "SaveImage",
      "widgets_values": ["ComfyUI"],
      "inputs": [
        {"name": "images", "type": "IMAGE", "link": 8},
        {"name": "filename_prefix", "type": "STRING", "widget": {"name": "filename_prefix"}, "link": null}
      ],
      "outputs": []
    }
  ],
  "links": [
    [1, 16, 1, 2, 0, "CLIP"],
    [2, 7, 0, 3, 0, "*"],
    [3, 5, 0, 4, 0, "IMAGE"],
    [4, 3, 0, 5, 0, "*"],
    [5, 13, 0, 7, 0, "LATENT"],
    [6, 15, 0, 7, 1, "VAE"],
    [7, 16, 1, 8, 0, "CLIP"],
    [8, 21, 0, 9, 0, "IMAGE"],
    [9, 10, 0, 11, 0, "MODEL"],
    [10, 16, 0, 13, 0, "MODEL"],
    [11, 8, 0, 13, 1, "CONDITIONING"],
    [12, 2, 0, 13, 2, "CONDITIONING"],
    [13, 12, 0, 13, 3, "LATENT"],
    [14, 11, 0, 16, 0, "MODEL"],
    [15, 14, 0, 16, 1, "CLIP"],
    [16, 4, 0, 21, 0, "IMAGE"]
  ]
};

