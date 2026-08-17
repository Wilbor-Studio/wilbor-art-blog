'use client';
import { useEffect, useRef } from 'react';

interface SplashCursorProps {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  CAPTURE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: { r: number; g: number; b: number };
  TRANSPARENT?: boolean;
  RAINBOW_MODE?: boolean;
  COLOR?: string;
}

interface PointerData {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: { r: number; g: number; b: number };
}

function createPointer(): PointerData {
  return {
    id: -1, texcoordX: 0, texcoordY: 0,
    prevTexcoordX: 0, prevTexcoordY: 0,
    deltaX: 0, deltaY: 0,
    down: false, moved: false,
    color: { r: 0, g: 0, b: 0 },
  };
}

export default function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  CAPTURE_RESOLUTION = 512,
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 3,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 6000,
  SHADING = true,
  COLOR_UPDATE_SPEED = 10,
  BACK_COLOR = { r: 0, g: 0, b: 0 },
  TRANSPARENT = true,
  RAINBOW_MODE = true,
  COLOR = '#ff0000',
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;
    let isActive = true;

    const config = {
      SIM_RESOLUTION, DYE_RESOLUTION, CAPTURE_RESOLUTION,
      DENSITY_DISSIPATION, VELOCITY_DISSIPATION,
      PRESSURE, PRESSURE_ITERATIONS, CURL,
      SPLAT_RADIUS, SPLAT_FORCE, SHADING,
      COLOR_UPDATE_SPEED, PAUSED: false,
      BACK_COLOR, TRANSPARENT, RAINBOW_MODE, COLOR,
    };

    const pointers: PointerData[] = [createPointer()];

    // ── WebGL context ──────────────────────────────────────────────────────────
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl: WebGLRenderingContext | WebGL2RenderingContext;
    gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext;
    const isWebGL2 = !!gl;
    if (!isWebGL2) {
      gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as WebGLRenderingContext;
    }

    let halfFloat: { HALF_FLOAT_OES: number } | null = null;
    let supportLinearFiltering: boolean;
    if (isWebGL2) {
      (gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float');
      supportLinearFiltering = !!(gl as WebGL2RenderingContext).getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float') as { HALF_FLOAT_OES: number } | null;
      supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0, 0, 0, 1);

    const halfFloatTexType = isWebGL2
      ? (gl as WebGL2RenderingContext).HALF_FLOAT
      : (halfFloat ? halfFloat.HALF_FLOAT_OES : undefined);

    if (!supportLinearFiltering) {
      config.DYE_RESOLUTION = 256;
      config.SHADING = false;
    }

    // ── Format helpers ─────────────────────────────────────────────────────────
    function supportRenderTextureFormat(internalFormat: number, format: number, type: number) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }

    function getSupportedFormat(internalFormat: number, format: number, type: number): { internalFormat: number; format: number } | null {
      if (!supportRenderTextureFormat(internalFormat, format, type)) {
        if (isWebGL2) {
          const g2 = gl as WebGL2RenderingContext;
          if (internalFormat === g2.R16F)  return getSupportedFormat(g2.RG16F,   g2.RG,   type);
          if (internalFormat === g2.RG16F) return getSupportedFormat(g2.RGBA16F, g2.RGBA, type);
        }
        return null;
      }
      return { internalFormat, format };
    }

    let formatRGBA: { internalFormat: number; format: number } | null;
    let formatRG:   { internalFormat: number; format: number } | null;
    let formatR:    { internalFormat: number; format: number } | null;
    const type = halfFloatTexType!;

    if (isWebGL2) {
      const g2 = gl as WebGL2RenderingContext;
      formatRGBA = getSupportedFormat(g2.RGBA16F, g2.RGBA, type);
      formatRG   = getSupportedFormat(g2.RG16F,   g2.RG,   type);
      formatR    = getSupportedFormat(g2.R16F,    g2.RED,  type);
    } else {
      formatRGBA = getSupportedFormat(gl.RGBA, gl.RGBA, type);
      formatRG   = getSupportedFormat(gl.RGBA, gl.RGBA, type);
      formatR    = getSupportedFormat(gl.RGBA, gl.RGBA, type);
    }

    // ── Shader helpers ─────────────────────────────────────────────────────────
    function compileShader(shaderType: number, source: string, keywords?: string[] | null): WebGLShader {
      if (keywords) source = keywords.map(k => `#define ${k}`).join('\n') + '\n' + source;
      const shader = gl.createShader(shaderType)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    function createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      return prog;
    }

    function getUniforms(prog: WebGLProgram): Record<string, WebGLUniformLocation> {
      const u: Record<string, WebGLUniformLocation> = {};
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(prog, i)!.name;
        u[name] = gl.getUniformLocation(prog, name)!;
      }
      return u;
    }

    // ── Shaders ────────────────────────────────────────────────────────────────
    const baseVS = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);

    const copyFS      = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; void main () { gl_FragColor = texture2D(uTexture, vUv); }`);
    const clearFS     = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value; void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`);
    const splatFS     = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius; void main () { vec2 p = vUv - point.xy; p.x *= aspectRatio; vec3 splat = exp(-dot(p,p)/radius)*color; vec3 base = texture2D(uTarget,vUv).xyz; gl_FragColor = vec4(base+splat,1.0); }`);
    const divergenceFS= compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main () { float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y; vec2 C=texture2D(uVelocity,vUv).xy; if(vL.x<0.0){L=-C.x;} if(vR.x>1.0){R=-C.x;} if(vT.y>1.0){T=-C.y;} if(vB.y<0.0){B=-C.y;} gl_FragColor=vec4(0.5*(R-L+T-B),0,0,1); }`);
    const curlFS      = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main () { float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x; gl_FragColor=vec4(0.5*(R-L-T+B),0,0,1); }`);
    const vorticityFS = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt; void main () { float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x; vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); force/=length(force)+0.0001; force*=curl*C; force.y*=-1.0; vec2 vel=texture2D(uVelocity,vUv).xy+force*dt; vel=min(max(vel,-1000.0),1000.0); gl_FragColor=vec4(vel,0,1); }`);
    const pressureFS  = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uDivergence; void main () { float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x,div=texture2D(uDivergence,vUv).x; gl_FragColor=vec4((L+R+B+T-div)*0.25,0,0,1); }`);
    const gradSubFS   = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uVelocity; void main () { float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x; vec2 vel=texture2D(uVelocity,vUv).xy; vel.xy-=vec2(R-L,T-B); gl_FragColor=vec4(vel,0,1); }`);
    const advectionFS = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
      uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
      vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st=uv/tsize-0.5; vec2 iuv=floor(st); vec2 fuv=fract(st);
        vec4 a=texture2D(sam,(iuv+vec2(0.5,0.5))*tsize),b=texture2D(sam,(iuv+vec2(1.5,0.5))*tsize),
             c=texture2D(sam,(iuv+vec2(0.5,1.5))*tsize),d=texture2D(sam,(iuv+vec2(1.5,1.5))*tsize);
        return mix(mix(a,b,fuv.x),mix(c,d,fuv.x),fuv.y);
      }
      void main () {
        #ifdef MANUAL_FILTERING
          vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;
          vec4 result=bilerp(uSource,coord,dyeTexelSize);
        #else
          vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;
          vec4 result=texture2D(uSource,coord);
        #endif
        gl_FragColor=result/(1.0+dissipation*dt);
      }
    `, supportLinearFiltering ? null : ['MANUAL_FILTERING']);

    const displayFSSrc = `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
      uniform sampler2D uTexture; uniform vec2 texelSize;
      vec3 linearToGamma(vec3 c){ c=max(c,vec3(0)); return max(1.055*pow(c,vec3(0.416666667))-0.055,vec3(0)); }
      void main () {
        vec3 c=texture2D(uTexture,vUv).rgb;
        #ifdef SHADING
          vec3 lc=texture2D(uTexture,vL).rgb,rc=texture2D(uTexture,vR).rgb,
               tc=texture2D(uTexture,vT).rgb,bc=texture2D(uTexture,vB).rgb;
          float dx=length(rc)-length(lc),dy=length(tc)-length(bc);
          vec3 n=normalize(vec3(dx,dy,length(texelSize))),l=vec3(0,0,1);
          float diffuse=clamp(dot(n,l)+0.7,0.7,1.0); c*=diffuse;
        #endif
        float a=max(c.r,max(c.g,c.b));
        gl_FragColor=vec4(c,a);
      }
    `;

    // ── Programs ───────────────────────────────────────────────────────────────
    function makeProgram(vs: WebGLShader, fs: WebGLShader) {
      const prog = createProgram(vs, fs);
      return { prog, u: getUniforms(prog), bind() { gl.useProgram(prog); } };
    }

    const copyProg      = makeProgram(baseVS, copyFS);
    const clearProg     = makeProgram(baseVS, clearFS);
    const splatProg     = makeProgram(baseVS, splatFS);
    const advectionProg = makeProgram(baseVS, advectionFS);
    const divergeProg   = makeProgram(baseVS, divergenceFS);
    const curlProg      = makeProgram(baseVS, curlFS);
    const vorticityProg = makeProgram(baseVS, vorticityFS);
    const pressureProg  = makeProgram(baseVS, pressureFS);
    const gradSubProg   = makeProgram(baseVS, gradSubFS);

    // Display material supports keyword variants (SHADING)
    const displayPrograms: Record<number, WebGLProgram> = {};
    let displayActiveProgram: WebGLProgram | null = null;
    let displayUniforms: Record<string, WebGLUniformLocation> = {};

    function bindDisplayMaterial(keywords: string[]) {
      const hash = keywords.reduce((h, k) => { for (let i = 0; i < k.length; i++) h = ((h << 5) - h + k.charCodeAt(i)) | 0; return h; }, 0);
      if (!displayPrograms[hash]) {
        const fs = compileShader(gl.FRAGMENT_SHADER, displayFSSrc, keywords);
        displayPrograms[hash] = createProgram(baseVS, fs);
      }
      if (displayPrograms[hash] !== displayActiveProgram) {
        displayUniforms = getUniforms(displayPrograms[hash]);
        displayActiveProgram = displayPrograms[hash];
      }
      gl.useProgram(displayActiveProgram);
    }

    // ── Blit quad ──────────────────────────────────────────────────────────────
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    type FBO = { texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number; texelSizeX: number; texelSizeY: number; attach(id: number): number };
    type DoubleFBO = { read: FBO; write: FBO; width: number; height: number; texelSizeX: number; texelSizeY: number; swap(): void };

    function blit(target: FBO | null, clear = false) {
      if (!target) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // ── FBO helpers ────────────────────────────────────────────────────────────
    function createFBO(w: number, h: number, internalFormat: number, format: number, texType: number, param: number): FBO {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, texType, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, fbo, width: w, height: h, texelSizeX: 1/w, texelSizeY: 1/h, attach(id) { gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
    }

    function createDoubleFBO(w: number, h: number, iF: number, f: number, t: number, p: number): DoubleFBO {
      let a = createFBO(w,h,iF,f,t,p), b = createFBO(w,h,iF,f,t,p);
      return { get read(){ return a; }, set read(v){ a=v; }, get write(){ return b; }, set write(v){ b=v; }, width:w, height:h, texelSizeX:a.texelSizeX, texelSizeY:a.texelSizeY, swap(){ const tmp=a; a=b; b=tmp; } };
    }

    function resizeFBO(target: FBO, w: number, h: number, iF: number, f: number, t: number, p: number): FBO {
      const n = createFBO(w,h,iF,f,t,p);
      copyProg.bind(); gl.uniform1i(copyProg.u.uTexture, target.attach(0)); blit(n); return n;
    }

    function resizeDoubleFBO(target: DoubleFBO, w: number, h: number, iF: number, f: number, t: number, p: number): DoubleFBO {
      if (target.width===w && target.height===h) return target;
      target.read  = resizeFBO(target.read,  w,h,iF,f,t,p);
      target.write = createFBO(w,h,iF,f,t,p);
      target.width=w; target.height=h; target.texelSizeX=1/w; target.texelSizeY=1/h;
      return target;
    }

    // ── Init framebuffers ──────────────────────────────────────────────────────
    function getResolution(res: number) {
      let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (ar < 1) ar = 1/ar;
      const min = Math.round(res), max = Math.round(res*ar);
      return gl.drawingBufferWidth > gl.drawingBufferHeight ? {width:max,height:min} : {width:min,height:max};
    }

    let dye: DoubleFBO, velocity: DoubleFBO, divergenceFBO: FBO, curlFBO: FBO, pressure: DoubleFBO;

    function initFramebuffers() {
      const simRes = getResolution(config.SIM_RESOLUTION);
      const dyeRes = getResolution(config.DYE_RESOLUTION);
      const texType = halfFloatTexType!;
      const rgba = formatRGBA!, rg = formatRG!, r = formatR!;
      const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
      gl.disable(gl.BLEND);

      if (!dye)      dye      = createDoubleFBO(dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,texType,filtering);
      else           dye      = resizeDoubleFBO(dye,dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,texType,filtering);
      if (!velocity) velocity = createDoubleFBO(simRes.width,simRes.height,rg.internalFormat,rg.format,texType,filtering);
      else           velocity = resizeDoubleFBO(velocity,simRes.width,simRes.height,rg.internalFormat,rg.format,texType,filtering);

      divergenceFBO = createFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
      curlFBO       = createFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
      pressure      = createDoubleFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
    }

    // ── Simulation step ────────────────────────────────────────────────────────
    function step(dt: number) {
      gl.disable(gl.BLEND);
      curlProg.bind();
      gl.uniform2f(curlProg.u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(curlProg.u.uVelocity, velocity.read.attach(0));
      blit(curlFBO);

      vorticityProg.bind();
      gl.uniform2f(vorticityProg.u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(vorticityProg.u.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vorticityProg.u.uCurl, curlFBO.attach(1));
      gl.uniform1f(vorticityProg.u.curl, config.CURL);
      gl.uniform1f(vorticityProg.u.dt, dt);
      blit(velocity.write); velocity.swap();

      divergeProg.bind();
      gl.uniform2f(divergeProg.u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(divergeProg.u.uVelocity, velocity.read.attach(0));
      blit(divergenceFBO);

      clearProg.bind();
      gl.uniform1i(clearProg.u.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearProg.u.value, config.PRESSURE);
      blit(pressure.write); pressure.swap();

      pressureProg.bind();
      gl.uniform2f(pressureProg.u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(pressureProg.u.uDivergence, divergenceFBO.attach(0));
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProg.u.uPressure, pressure.read.attach(1));
        blit(pressure.write); pressure.swap();
      }

      gradSubProg.bind();
      gl.uniform2f(gradSubProg.u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gradSubProg.u.uPressure, pressure.read.attach(0));
      gl.uniform1i(gradSubProg.u.uVelocity, velocity.read.attach(1));
      blit(velocity.write); velocity.swap();

      advectionProg.bind();
      gl.uniform2f(advectionProg.u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (!supportLinearFiltering) gl.uniform2f(advectionProg.u.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      const velId = velocity.read.attach(0);
      gl.uniform1i(advectionProg.u.uVelocity, velId);
      gl.uniform1i(advectionProg.u.uSource, velId);
      gl.uniform1f(advectionProg.u.dt, dt);
      gl.uniform1f(advectionProg.u.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity.write); velocity.swap();

      if (!supportLinearFiltering) gl.uniform2f(advectionProg.u.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(advectionProg.u.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionProg.u.uSource, dye.read.attach(1));
      gl.uniform1f(advectionProg.u.dissipation, config.DENSITY_DISSIPATION);
      blit(dye.write); dye.swap();
    }

    function render() {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      const keywords: string[] = [];
      if (config.SHADING) keywords.push('SHADING');
      bindDisplayMaterial(keywords);
      if (config.SHADING) gl.uniform2f(displayUniforms.texelSize, 1/gl.drawingBufferWidth, 1/gl.drawingBufferHeight);
      gl.uniform1i(displayUniforms.uTexture, dye.read.attach(0));
      blit(null);
    }

    // ── Color helpers ──────────────────────────────────────────────────────────
    function HSVtoRGB(h: number, s: number, v: number) {
      const i = Math.floor(h*6), f = h*6-i, p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
      const cases: [number,number,number][] = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]];
      const [r,g,b] = cases[i%6];
      return { r, g, b };
    }

    function hexToRGB(hex: string) {
      let v = hex.replace('#','');
      if (v.length===3) v = v[0]+v[0]+v[1]+v[1]+v[2]+v[2];
      return { r: parseInt(v.slice(0,2),16)/255*0.15, g: parseInt(v.slice(2,4),16)/255*0.15, b: parseInt(v.slice(4,6),16)/255*0.15 };
    }

    function generateColor() {
      if (!config.RAINBOW_MODE) return hexToRGB(config.COLOR);
      const c = HSVtoRGB(Math.random(),1,1);
      return { r: c.r*0.15, g: c.g*0.15, b: c.b*0.15 };
    }

    // ── Splat helpers ──────────────────────────────────────────────────────────
    function correctRadius(r: number) {
      const ar = canvasEl.width/canvasEl.height;
      return ar > 1 ? r*ar : r;
    }
    function correctDeltaX(d: number) { const ar = canvasEl.width/canvasEl.height; return ar < 1 ? d*ar : d; }
    function correctDeltaY(d: number) { const ar = canvasEl.width/canvasEl.height; return ar > 1 ? d/ar : d; }

    function splat(x: number, y: number, dx: number, dy: number, color: { r:number; g:number; b:number }) {
      splatProg.bind();
      gl.uniform1i(splatProg.u.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatProg.u.aspectRatio, canvasEl.width/canvasEl.height);
      gl.uniform2f(splatProg.u.point, x, y);
      gl.uniform3f(splatProg.u.color, dx, dy, 0);
      gl.uniform1f(splatProg.u.radius, correctRadius(config.SPLAT_RADIUS/100));
      blit(velocity.write); velocity.swap();
      gl.uniform1i(splatProg.u.uTarget, dye.read.attach(0));
      gl.uniform3f(splatProg.u.color, color.r, color.g, color.b);
      blit(dye.write); dye.swap();
    }

    function splatPointer(p: PointerData) {
      splat(p.texcoordX, p.texcoordY, p.deltaX*config.SPLAT_FORCE, p.deltaY*config.SPLAT_FORCE, p.color);
    }

    function clickSplat(p: PointerData) {
      const c = generateColor();
      c.r *= 10; c.g *= 10; c.b *= 10;
      splat(p.texcoordX, p.texcoordY, 10*(Math.random()-0.5), 30*(Math.random()-0.5), c);
    }

    function updatePointerDown(p: PointerData, id: number, posX: number, posY: number) {
      p.id=id; p.down=true; p.moved=false;
      p.texcoordX=posX/canvasEl.width; p.texcoordY=1-(posY/canvasEl.height);
      p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
      p.deltaX=0; p.deltaY=0; p.color=generateColor();
    }

    function updatePointerMove(p: PointerData, posX: number, posY: number) {
      p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
      p.texcoordX=posX/canvasEl.width; p.texcoordY=1-(posY/canvasEl.height);
      p.deltaX=correctDeltaX(p.texcoordX-p.prevTexcoordX);
      p.deltaY=correctDeltaY(p.texcoordY-p.prevTexcoordY);
      p.moved=Math.abs(p.deltaX)>0||Math.abs(p.deltaY)>0;
    }

    // ── Main loop ──────────────────────────────────────────────────────────────
    function scaleByPixelRatio(n: number) { return Math.floor(n*(window.devicePixelRatio||1)); }

    let lastTime = Date.now();
    let colorTimer = 0;

    function resizeCanvas() {
      const w = scaleByPixelRatio(canvasEl.clientWidth);
      const h = scaleByPixelRatio(canvasEl.clientHeight);
      if (canvasEl.width!==w||canvasEl.height!==h) { canvasEl.width=w; canvasEl.height=h; return true; }
      return false;
    }

    function frame() {
      if (!isActive) return;
      const now = Date.now();
      const dt = Math.min((now-lastTime)/1000, 0.016666);
      lastTime = now;
      if (resizeCanvas()) initFramebuffers();
      colorTimer += dt*config.COLOR_UPDATE_SPEED;
      if (colorTimer >= 1) { colorTimer -= 1; pointers.forEach(p => { p.color=generateColor(); }); }
      pointers.forEach(p => { if (p.moved) { p.moved=false; splatPointer(p); } });
      step(dt);
      render();
      rafRef.current = requestAnimationFrame(frame);
    }

    // ── Events ─────────────────────────────────────────────────────────────────
    let firstMove = false;

    function onMouseDown(e: MouseEvent) {
      const p = pointers[0];
      updatePointerDown(p, -1, scaleByPixelRatio(e.clientX), scaleByPixelRatio(e.clientY));
      clickSplat(p);
    }
    function onMouseMove(e: MouseEvent) {
      const p = pointers[0];
      const x = scaleByPixelRatio(e.clientX), y = scaleByPixelRatio(e.clientY);
      if (!firstMove) { firstMove = true; p.color=generateColor(); }
      updatePointerMove(p, x, y);
    }
    function onTouchStart(e: TouchEvent) {
      const p = pointers[0];
      const t = e.targetTouches[0];
      updatePointerDown(p, t.identifier, scaleByPixelRatio(t.clientX), scaleByPixelRatio(t.clientY));
    }
    function onTouchMove(e: TouchEvent) {
      const p = pointers[0], t = e.targetTouches[0];
      updatePointerMove(p, scaleByPixelRatio(t.clientX), scaleByPixelRatio(t.clientY));
    }
    function onTouchEnd() { pointers[0].down = false; }

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove, false);
    window.addEventListener('touchend', onTouchEnd);

    initFramebuffers();
    frame();

    return () => {
      isActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, pointerEvents:'none' }}>
      <canvas ref={canvasRef} style={{ width:'100vw', height:'100vh', display:'block' }} />
    </div>
  );
}
