class Lightning {
  constructor(canvas, options = {}) {
    // Singleton Guard
    if (window.__lightningInstance) {
      return window.__lightningInstance;
    }
    window.__lightningInstance = this;

    this.canvas = canvas;
    
    // Auto-detect accent hue if not specified
    let defaultHue = 10; // Orange
    const currentAccent = document.documentElement.getAttribute('data-accent');
    if (currentAccent === 'green') defaultHue = 140;
    else if (currentAccent === 'amber') defaultHue = 45;

    this.hue = options.hue !== undefined ? options.hue : defaultHue;
    this.xOffset = options.xOffset !== undefined ? options.xOffset : 0;
    this.speed = options.speed !== undefined ? options.speed : 1;
    this.intensity = options.intensity !== undefined ? options.intensity : 1;
    this.size = options.size !== undefined ? options.size : 1;
    this.gl = null;
    this.program = null;
    this.startTime = performance.now();
    this.animationId = null;
    this.paused = false;
    this.pauseTime = 0;
    this.isFallback = false;

    // Interactive parameters
    this.targetXOffset = 0;
    this.scrollVelocity = 0;
    this.scrollVelocityTarget = 0;
    this.flashIntensity = 0;
    
    // Scroll trackers
    this.lastScrollTop = window.scrollY;
    this.lastScrollTime = performance.now();

    // FPS / Debug trackers
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.isDebug = false;
    this.hudElement = null;

    // Check compatibility before loading WebGL
    if (!this.checkCompatibility()) {
      this.isFallback = true;
      this.canvas.style.display = 'none';
      return;
    }

    // Check initial theme state
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (currentTheme === 'light') {
      this.paused = true;
    }

    // Initialize WebGL instantly to load lightning background fast
    this.init();
  }

  checkCompatibility() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return true;
  }

  init() {
    if (this.isFallback) return;

    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      console.warn('WebGL context not supported.');
      this.canvas.style.display = 'none';
      return;
    }
    this.gl = gl;

    // Check URL query parameters for debug mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug') && urlParams.get('debug') === 'lightning') {
      this.isDebug = true;
      this.createDebugHUD();
    }

    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uXOffset;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;
      
      #define OCTAVE_COUNT 5

      vec3 hsv2rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return c.z * mix(vec3(1.0), rgb, c.y);
      }

      float hash11(float p) {
          p = fract(p * .1031);
          p *= p + 33.33;
          p *= p + p;
          return fract(p);
      }

      float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * .1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
      }

      mat2 rotate2d(float theta) {
          float c = cos(theta);
          float s = sin(theta);
          return mat2(c, -s, s, c);
      }

      float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 fp = fract(p);
          float a = hash12(ip);
          float b = hash12(ip + vec2(1.0, 0.0));
          float c = hash12(ip + vec2(0.0, 1.0));
          float d = hash12(ip + vec2(1.0, 1.0));
          
          vec2 t = smoothstep(0.0, 1.0, fp);
          return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
      }

      float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < OCTAVE_COUNT; ++i) {
              value += amplitude * noise(p);
              p *= rotate2d(0.45);
              p *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / iResolution.xy;
          uv = 2.0 * uv - 1.0;
          uv.x *= iResolution.x / iResolution.y;
          uv.x += uXOffset;
          
          uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
          
          float dist = abs(uv.x);
          vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
          vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
          col = pow(col, vec3(1.0));
          float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
          gl_FragColor = vec4(col, a);
      }
    `;

    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    this.program = program;

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    this.iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
    this.iTimeLocation = gl.getUniformLocation(program, 'iTime');
    this.uHueLocation = gl.getUniformLocation(program, 'uHue');
    this.uXOffsetLocation = gl.getUniformLocation(program, 'uXOffset');
    this.uSpeedLocation = gl.getUniformLocation(program, 'uSpeed');
    this.uIntensityLocation = gl.getUniformLocation(program, 'uIntensity');
    this.uSizeLocation = gl.getUniformLocation(program, 'uSize');

    this.resize();
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);

    // Setup interactivity listeners
    this.setupInteractivity();

    if (!this.paused) {
      this.render();
    }
  }

  setupInteractivity() {
    // 1. Mouse Move tracking (for offset)
    this.mouseHandler = (e) => {
      const normX = (e.clientX / window.innerWidth) * 2.0 - 1.0;
      this.targetXOffset = normX * 0.35;
    };
    window.addEventListener('mousemove', this.mouseHandler);

    // 2. Scroll Velocity tracking
    this.scrollHandler = () => {
      const now = performance.now();
      const st = window.scrollY;
      const dt = now - this.lastScrollTime;
      if (dt > 0) {
        const speed = Math.abs(st - this.lastScrollTop) / dt;
        this.scrollVelocity = Math.min(speed * 8.0, 3.5);
      }
      this.lastScrollTop = st;
      this.lastScrollTime = now;
    };
    window.addEventListener('scroll', this.scrollHandler);

    // 3. Tab visibility throttling (pause when tab hidden)
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.pause();
      } else {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        if (currentTheme !== 'light') {
          this.resume();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // 4. HTML data attribute updates (Theme and Accent changes)
    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-theme') {
          const theme = document.documentElement.getAttribute('data-theme') || 'dark';
          if (theme === 'light') {
            this.pause();
          } else {
            this.resume();
          }
        }
        if (mutation.attributeName === 'data-accent') {
          const accent = document.documentElement.getAttribute('data-accent');
          let nextHue = 30;
          if (accent === 'green') nextHue = 140;
          else if (accent === 'amber') nextHue = 45;
          this.triggerAccentFlash(nextHue);
        }
      });
    });
    this.observer.observe(document.documentElement, { attributes: true });
  }

  triggerAccentFlash(newHue) {
    this.hue = newHue;
    // Set off a brief white flash intensity surge
    this.flashIntensity = 2.2;
  }

  createDebugHUD() {
    this.hudElement = document.createElement('div');
    this.hudElement.className = 'lightning-debug-hud';
    document.body.appendChild(this.hudElement);
  }

  resize() {
    if (!this.canvas || !this.gl) return;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  setHue(newHue) {
    this.hue = newHue;
  }

  render() {
    if (!this.gl || this.paused) return;
    const gl = this.gl;
    const currentTime = performance.now();
    const elapsedTime = (currentTime - this.startTime) / 1000.0;

    // Decay the scroll velocity towards 0 slowly
    this.scrollVelocityTarget += (this.scrollVelocity - this.scrollVelocityTarget) * 0.1;
    this.scrollVelocity *= 0.94; // natural friction decay

    // Decay the flash intensity towards 0
    if (this.flashIntensity > 0) {
      this.flashIntensity -= 0.08;
      if (this.flashIntensity < 0) this.flashIntensity = 0;
    }

    // Lerp horizontal cursor parallax offset
    this.xOffset += (this.targetXOffset - this.xOffset) * 0.06;

    // Compute interactive speed and intensity modifiers
    const activeSpeed = this.speed * (1.0 + this.scrollVelocityTarget * 1.5);
    const activeIntensity = this.intensity * (1.0 + this.scrollVelocityTarget * 0.8) + this.flashIntensity;

    gl.uniform2f(this.iResolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.iTimeLocation, elapsedTime);
    gl.uniform1f(this.uHueLocation, this.hue);
    gl.uniform1f(this.uXOffsetLocation, this.xOffset);
    gl.uniform1f(this.uSpeedLocation, activeSpeed);
    gl.uniform1f(this.uIntensityLocation, activeIntensity);
    gl.uniform1f(this.uSizeLocation, this.size);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Update Debug HUD statistics
    if (this.isDebug && this.hudElement) {
      const dt = currentTime - this.lastFpsTime;
      this.frameCount++;
      if (dt >= 400) {
        const fps = Math.round((this.frameCount * 1000) / dt);
        this.hudElement.innerHTML = `
          <strong>LIGHTNING DBG</strong><br>
          FPS: ${fps}<br>
          Resolution: ${this.canvas.width}x${this.canvas.height}<br>
          Hue: ${Math.round(this.hue)}&deg;<br>
          Scroll Velocity: ${this.scrollVelocityTarget.toFixed(2)}<br>
          Cursor Offset: ${this.xOffset.toFixed(2)}<br>
          Flash: ${this.flashIntensity.toFixed(2)}<br>
          State: ${this.paused ? 'PAUSED' : 'RUNNING'}
        `;
        this.frameCount = 0;
        this.lastFpsTime = currentTime;
      }
    }

    this.animationId = requestAnimationFrame(() => this.render());
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.pauseTime = performance.now();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    if (this.isFallback || !this.paused) return;
    
    // Double check theme before resuming
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (currentTheme === 'light') return;

    this.paused = false;
    const pausedDuration = performance.now() - this.pauseTime;
    this.startTime += pausedDuration;
    
    // Ensure render loop starts back up
    if (!this.animationId) {
      this.render();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.mouseHandler) {
      window.removeEventListener('mousemove', this.mouseHandler);
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.hudElement) {
      this.hudElement.remove();
    }
    if (window.__lightningInstance === this) {
      window.__lightningInstance = null;
    }
  }
}

window.Lightning = Lightning;


/* ======================================================================
   ElectricBorder - High-Performance Neon Glow Border Wrapper
   ====================================================================== */
class ElectricBorder {
  constructor(element, options = {}) {
    // Guard to prevent double execution on same element
    if (element.__electricBorderInstance) {
      return element.__electricBorderInstance;
    }
    element.__electricBorderInstance = this;

    this.element = element;
    
    // Auto-detect custom border radius
    const computedRadius = window.getComputedStyle(element).borderRadius;
    const defaultRadius = parseFloat(computedRadius) || 20;

    // Configuration defaults
    this.color = options.color || this.detectAccentColor();
    this.thickness = options.thickness !== undefined ? options.thickness : 1.5;
    this.borderRadius = options.borderRadius !== undefined ? options.borderRadius : defaultRadius;
    this.baseSpeed = options.speed !== undefined ? options.speed : 0.5;
    this.baseChaos = options.chaos !== undefined ? options.chaos : 0.15;

    // Dynamic animation parameters
    this.speed = this.baseSpeed;
    this.chaos = this.baseChaos;
    this.glowSize = 10;
    this.activeGlow = 0;
    this.intensity = 0.45;

    this.isHovered = false;
    this.clickPulse = 0;
    this.time = Math.random() * 100;
    
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.visible = true;

    this.mouseX = 0;
    this.mouseY = 0;
    
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  detectAccentColor() {
    const accent = document.documentElement.getAttribute('data-accent') || 'orange';
    if (accent === 'green') return '#3FB950';
    if (accent === 'amber') return '#E3A31C';
    return '#FF4D00';
  }

  init() {
    this.element.classList.add('electric-border-card');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'electric-border-canvas';
    this.element.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.resize();
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);

    this.setupInteractivity();
    this.setupViewportObserver();

    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-accent') {
          this.color = this.detectAccentColor();
          if (this.reducedMotion) this.drawStatic();
        }
      });
    });
    this.observer.observe(document.documentElement, { attributes: true });

    if (this.reducedMotion) {
      this.drawStatic();
    } else {
      this.render();
    }
  }

  resize() {
    if (!this.canvas || !this.element) return;
    const rect = this.element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = (rect.width + 16) * dpr;
    this.canvas.height = (rect.height + 16) * dpr;
    
    this.canvas.style.width = (rect.width + 16) + 'px';
    this.canvas.style.height = (rect.height + 16) + 'px';

    this.ctx.scale(dpr, dpr);
    
    if (this.reducedMotion) {
      this.drawStatic();
    }
  }

  setupInteractivity() {
    this.element.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.speed = this.baseSpeed * 1.5;
      this.chaos = this.baseChaos * 1.5;
      this.glowSize = 16;
      this.intensity = 0.85;
    });

    this.element.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.speed = this.baseSpeed;
      this.chaos = this.baseChaos;
      this.glowSize = 10;
      this.intensity = 0.45;
      this.element.style.removeProperty('--mouse-x');
      this.element.style.removeProperty('--mouse-y');
    });

    this.element.addEventListener('mousemove', (e) => {
      const rect = this.element.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      this.element.style.setProperty('--mouse-x', `${x}%`);
      this.element.style.setProperty('--mouse-y', `${y}%`);
      
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.element.addEventListener('mousedown', () => {
      this.clickPulse = 4.0;
    });
  }

  setupViewportObserver() {
    this.viewportObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.visible = entry.isIntersecting;
        if (this.visible && !this.reducedMotion && !this.animationId) {
          this.render();
        }
      });
    }, { threshold: 0.05 });
    this.viewportObserver.observe(this.element);
  }

  drawStatic() {
    if (!this.ctx || !this.element) return;
    const rect = this.element.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const r = this.borderRadius;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w + 16, h + 16);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.color + '44';
    ctx.lineWidth = this.thickness;
    this.drawRoundedPath(ctx, 8, 8, w, h, r);
    ctx.stroke();
  }

  drawRoundedPath(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  drawCracklyLineTo(ctx, x1, y1, x2, y2, px, py, chaos, time) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.floor(dist / 14);

    if (ctx.isFirstPoint) {
      ctx.moveTo(x1, y1);
      ctx.isFirstPoint = false;
    }

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const lx = x1 + dx * t;
      const ly = y1 + dy * t;

      const osc = (Math.sin(t * 15 + time * 9) * 0.4 + 
                   Math.sin(t * 40 - time * 18) * 0.2 + 
                   (Math.random() - 0.5) * chaos) * 2.2;

      ctx.lineTo(lx + px * osc, ly + py * osc);
    }
    ctx.lineTo(x2, y2);
  }

  drawCracklyArc(ctx, cx, cy, r, a1, a2, chaos, time) {
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = a1 + (a2 - a1) * t;

      const osc = (Math.sin(angle * 6 + time * 10) * 0.4 + 
                   (Math.random() - 0.5) * chaos) * 2.2;

      const rad = r + osc;
      const lx = cx + Math.cos(angle) * rad;
      const ly = cy + Math.sin(angle) * rad;

      if (ctx.isFirstPoint) {
        ctx.moveTo(lx, ly);
        ctx.isFirstPoint = false;
      } else {
        ctx.lineTo(lx, ly);
      }
    }
  }

  constructElectricPath(ctx, w, h, r, chaos, time) {
    ctx.beginPath();
    ctx.isFirstPoint = true;

    // 1. Top border
    this.drawCracklyLineTo(ctx, 8 + r, 8, 8 + w - r, 8, 0, -1, chaos, time);

    // 2. Top-Right corner
    this.drawCracklyArc(ctx, 8 + w - r, 8 + r, r, -Math.PI / 2, 0, chaos, time);

    // 3. Right border
    this.drawCracklyLineTo(ctx, 8 + w, 8 + r, 8 + w, 8 + h - r, 1, 0, chaos, time);

    // 4. Bottom-Right corner
    this.drawCracklyArc(ctx, 8 + w - r, 8 + h - r, r, 0, Math.PI / 2, chaos, time);

    // 5. Bottom border
    this.drawCracklyLineTo(ctx, 8 + w - r, 8 + h, 8 + r, 8 + h, 0, 1, chaos, time);

    // 6. Bottom-Left corner
    this.drawCracklyArc(ctx, 8 + r, 8 + h - r, r, Math.PI / 2, Math.PI, chaos, time);

    // 7. Left border
    this.drawCracklyLineTo(ctx, 8, 8 + h - r, 8, 8 + r, -1, 0, chaos, time);

    // 8. Top-Left corner
    this.drawCracklyArc(ctx, 8 + r, 8 + r, r, Math.PI, (3 * Math.PI) / 2, chaos, time);

    ctx.closePath();
  }

  render() {
    if (!this.visible || !this.ctx || this.reducedMotion) {
      this.animationId = null;
      return;
    }

    const rect = this.element.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const r = this.borderRadius;
    const ctx = this.ctx;

    this.time += this.speed * 0.05;

    if (this.clickPulse > 0) {
      this.clickPulse -= 0.15;
      if (this.clickPulse < 0) this.clickPulse = 0;
    }

    ctx.clearRect(0, 0, w + 16, h + 16);

    const activeGlow = this.glowSize + this.clickPulse * 5.0;
    const activeThickness = this.thickness + (this.clickPulse > 0 ? 1 : 0);

    if (this.isHovered && document.documentElement.getAttribute('data-theme') !== 'light') {
      const gradient = ctx.createRadialGradient(
        this.mouseX + 8, this.mouseY + 8, 0,
        this.mouseX + 8, this.mouseY + 8, 120
      );
      gradient.addColorStop(0, this.color + '15');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      this.drawRoundedPath(ctx, 8, 8, w, h, r);
      ctx.fill();
    }

    this.constructElectricPath(ctx, w, h, r, this.chaos, this.time);

    // Layer 1: Diffused Outer Glow bloom
    ctx.shadowColor = this.color;
    ctx.shadowBlur = activeGlow;
    ctx.lineWidth = activeThickness + 3;
    ctx.strokeStyle = this.color + '1a';
    ctx.stroke();

    // Layer 2: Middle Glow
    ctx.shadowBlur = activeGlow * 0.5;
    ctx.lineWidth = activeThickness + 1;
    ctx.strokeStyle = this.color + '4d';
    ctx.stroke();

    // Layer 3: Sharp Core Line
    ctx.shadowBlur = 0;
    ctx.lineWidth = activeThickness;
    
    const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
    ctx.strokeStyle = isLightTheme ? this.color : '#FFFFFF';
    ctx.stroke();

    this.animationId = requestAnimationFrame(() => this.render());
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.viewportObserver) {
      this.viewportObserver.disconnect();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

window.ElectricBorder = ElectricBorder;

// Auto-decorator bootstrapper routine
document.addEventListener('DOMContentLoaded', () => {
  const CARD_SELECTORS = [
    '#delivoos-card',
    '.hero-btn-primary',
    '#java-card'
  ];

  function decorateCards() {
    const selectors = CARD_SELECTORS.join(', ');
    const cards = document.querySelectorAll(selectors);
    
    cards.forEach(card => {
      if (card.querySelector('.electric-border-canvas')) return;
      new ElectricBorder(card);
    });
  }

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => decorateCards());
  } else {
    setTimeout(() => decorateCards(), 150);
  }

  // Handle SPA style page changes or dynamic modal opens
  const bodyObserver = new MutationObserver(mutations => {
    let shouldDecorate = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        shouldDecorate = true;
      }
    });
    if (shouldDecorate) decorateCards();
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
});
