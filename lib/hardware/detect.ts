/**
 * Hardware detection utilities
 * Detects GPU VRAM and other hardware capabilities
 */

export interface GPUInfo {
  vram: number | null; // in MB
  renderer: string;
  vendor: string;
  isWebGPU: boolean;
}

/**
 * Detect GPU information using WebGL
 * This provides a reasonable estimate of VRAM on most systems
 */
export async function detectGPU(): Promise<GPUInfo> {
  const result: GPUInfo = {
    vram: null,
    renderer: 'Unknown',
    vendor: 'Unknown',
    isWebGPU: false,
  };

  // Try WebGPU first (more accurate)
  if ('gpu' in navigator) {
    try {
      const gpu = navigator.gpu as GPU;
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        result.isWebGPU = true;
        // WebGPU doesn't directly expose VRAM, but we can get limits
        const limits = adapter.limits;
        
        // Get adapter info if available
        const info = await adapter.requestAdapterInfo?.();
        if (info) {
          result.vendor = info.vendor || 'Unknown';
          result.renderer = info.architecture || info.device || 'WebGPU Device';
        }
        
        // Estimate VRAM from max buffer size (rough approximation)
        const maxBufferSize = limits.maxBufferSize;
        if (maxBufferSize > 0) {
          // This is a rough estimate - actual VRAM is usually higher
          result.vram = Math.round(maxBufferSize / (1024 * 1024) * 4);
        }
      }
    } catch (e) {
      console.log('WebGPU detection failed:', e);
    }
  }

  // Fall back to WebGL
  if (!result.isWebGPU || result.vram === null) {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (gl) {
        // Get renderer info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
          result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
        }
        
        // Try to estimate VRAM from renderer string
        result.vram = estimateVRAMFromRenderer(result.renderer);
        
        // Clean up
        const loseContext = gl.getExtension('WEBGL_lose_context');
        loseContext?.loseContext();
      }
    } catch (e) {
      console.log('WebGL detection failed:', e);
    }
  }

  return result;
}

/**
 * Estimate VRAM from GPU renderer string
 * This is a heuristic approach based on known GPU models
 */
function estimateVRAMFromRenderer(renderer: string): number | null {
  const r = renderer.toLowerCase();
  
  // NVIDIA GPUs
  if (r.includes('nvidia') || r.includes('geforce') || r.includes('rtx') || r.includes('gtx')) {
    // RTX 40 series
    if (r.includes('4090')) return 24576;
    if (r.includes('4080')) return 16384;
    if (r.includes('4070 ti super')) return 16384;
    if (r.includes('4070 ti')) return 12288;
    if (r.includes('4070 super')) return 12288;
    if (r.includes('4070')) return 12288;
    if (r.includes('4060 ti')) return 8192;
    if (r.includes('4060')) return 8192;
    
    // RTX 30 series
    if (r.includes('3090')) return 24576;
    if (r.includes('3080 ti')) return 12288;
    if (r.includes('3080')) return 10240;
    if (r.includes('3070 ti')) return 8192;
    if (r.includes('3070')) return 8192;
    if (r.includes('3060 ti')) return 8192;
    if (r.includes('3060')) return 12288;
    
    // RTX 20 series
    if (r.includes('2080 ti')) return 11264;
    if (r.includes('2080 super')) return 8192;
    if (r.includes('2080')) return 8192;
    if (r.includes('2070 super')) return 8192;
    if (r.includes('2070')) return 8192;
    if (r.includes('2060 super')) return 8192;
    if (r.includes('2060')) return 6144;
    
    // GTX 16 series
    if (r.includes('1660 ti')) return 6144;
    if (r.includes('1660 super')) return 6144;
    if (r.includes('1660')) return 6144;
    if (r.includes('1650')) return 4096;
    
    // GTX 10 series
    if (r.includes('1080 ti')) return 11264;
    if (r.includes('1080')) return 8192;
    if (r.includes('1070 ti')) return 8192;
    if (r.includes('1070')) return 8192;
    if (r.includes('1060')) return 6144;
    
    // Default NVIDIA
    return 8192;
  }
  
  // AMD GPUs
  if (r.includes('amd') || r.includes('radeon')) {
    // RX 7000 series
    if (r.includes('7900 xtx')) return 24576;
    if (r.includes('7900 xt')) return 20480;
    if (r.includes('7900 gre')) return 16384;
    if (r.includes('7800 xt')) return 16384;
    if (r.includes('7700 xt')) return 12288;
    if (r.includes('7600')) return 8192;
    
    // RX 6000 series
    if (r.includes('6950 xt')) return 16384;
    if (r.includes('6900 xt')) return 16384;
    if (r.includes('6800 xt')) return 16384;
    if (r.includes('6800')) return 16384;
    if (r.includes('6700 xt')) return 12288;
    if (r.includes('6700')) return 10240;
    if (r.includes('6600 xt')) return 8192;
    if (r.includes('6600')) return 8192;
    
    // Default AMD
    return 8192;
  }
  
  // Intel GPUs
  if (r.includes('intel')) {
    if (r.includes('arc a770')) return 16384;
    if (r.includes('arc a750')) return 8192;
    if (r.includes('arc a580')) return 8192;
    if (r.includes('arc a380')) return 6144;
    if (r.includes('arc')) return 8192;
    
    // Integrated graphics
    if (r.includes('iris xe')) return 0; // Uses system RAM
    if (r.includes('iris')) return 0;
    if (r.includes('uhd')) return 0;
    
    return null;
  }
  
  // Apple GPUs (unified memory - GPU can access all system RAM)
  // Values represent max unified memory for each chip variant
  if (r.includes('apple')) {
    // M4 series
    if (r.includes('m4 ultra')) return 524288; // 512GB max
    if (r.includes('m4 max')) return 131072;   // 128GB max
    if (r.includes('m4 pro')) return 65536;    // 64GB max
    if (r.includes('m4')) return 32768;        // 32GB max
    
    // M3 series
    if (r.includes('m3 ultra')) return 524288; // 512GB max (your config!)
    if (r.includes('m3 max')) return 131072;   // 128GB max
    if (r.includes('m3 pro')) return 36864;    // 36GB max
    if (r.includes('m3')) return 24576;        // 24GB max
    
    // M2 series
    if (r.includes('m2 ultra')) return 196608; // 192GB max
    if (r.includes('m2 max')) return 98304;    // 96GB max
    if (r.includes('m2 pro')) return 32768;    // 32GB max
    if (r.includes('m2')) return 24576;        // 24GB max
    
    // M1 series
    if (r.includes('m1 ultra')) return 131072; // 128GB max
    if (r.includes('m1 max')) return 65536;    // 64GB max
    if (r.includes('m1 pro')) return 32768;    // 32GB max
    if (r.includes('m1')) return 16384;        // 16GB max
    
    return 8192;
  }
  
  return null;
}

/**
 * Format VRAM size for display
 */
export function formatVRAM(vramMB: number | null): string {
  if (vramMB === null) return 'Unknown';
  if (vramMB === 0) return 'Shared Memory';
  if (vramMB >= 1024) {
    return `${(vramMB / 1024).toFixed(1)} GB`;
  }
  return `${vramMB} MB`;
}

/**
 * Get VRAM tier description
 */
export function getVRAMTierDescription(tier: 'low' | 'medium' | 'high' | 'unknown'): string {
  switch (tier) {
    case 'low':
      return 'Limited (< 4GB) - Use smaller models and reduced context';
    case 'medium':
      return 'Good (4-12GB) - Can run most models comfortably';
    case 'high':
      return 'Excellent (12GB+) - Can run large models with full context';
    case 'unknown':
      return 'Could not detect - Using conservative defaults';
  }
}





