class SplashCursor {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.config = Object.assign({
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 512,
      CAPTURE_RESOLUTION: 512,
      DENSITY_DISSIPATION: 3.5,
      VELOCITY_DISSIPATION: 2,
      PRESSURE: 0.1,
      PRESSURE_ITERATIONS: 20,
      CURL: 20,
      SPLAT_RADIUS: 0.2,
      SPLAT_FORCE: 5000,
      SHADING: true,
      COLOR_UPDATE_SPEED: 10,
      BACK_COLOR: { r: 0, g: 0, b: 0 },
      TRANSPARENT: true,
      RAINBOW_MODE: false,
      COLOR: '#a8a8a8'
    }, config);

    this.pointers = [];
    this.animationFrameId = null;
    this.isActive = false;
    this.gl = null;
    this.ext = null;
    this.firstMouseMoveHandled = false;

    // Track resources for clean GC
    this.textures = [];
    this.framebuffers = [];
    this.buffers = [];
    this.shaders = [];
    this.programs = [];

    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.updateFrame = this.updateFrame.bind(this);

    this.init();
  }

  init() {
    this.isActive = true;
    this.firstMouseMoveHandled = false;
    
    // Pointer setup
    this.pointers = [this.createPointer()];

    const context = this.getWebGLContext(this.canvas);
    if (!context) {
      console.warn("WebGL not supported, SplashCursor disabled");
      this.isActive = false;
      return;
    }
    this.gl = context.gl;
    this.ext = context.ext;

    if (!this.ext.supportLinearFiltering) {
      this.config.DYE_RESOLUTION = 256;
      this.config.SHADING = false;
    }

    const gl = this.gl;
    const baseVertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;

        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `
    );

    const copyShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;

        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
      `
    );

    const clearShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;

        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `
    );

    const displayShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform sampler2D uDithering;
      uniform vec2 ditherScale;
      uniform vec2 texelSize;

      vec3 linearToGamma (vec3 color) {
          color = max(color, vec3(0));
          return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
      }

      void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
              vec3 lc = texture2D(uTexture, vL).rgb;
              vec3 rc = texture2D(uTexture, vR).rgb;
              vec3 tc = texture2D(uTexture, vT).rgb;
              vec3 bc = texture2D(uTexture, vB).rgb;

              float dx = length(rc) - length(lc);
              float dy = length(tc) - length(bc);

              vec3 n = normalize(vec3(dx, dy, length(texelSize)));
              vec3 l = vec3(0.0, 0.0, 1.0);

              float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
              c *= diffuse;
          #endif

          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
      }
    `;

    const splatShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;

        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
      `
    );

    const advectionShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;

        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);

            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }

        void main () {
            #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                vec4 result = bilerp(uSource, coord, dyeTexelSize);
            #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
            #endif
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }
      `,
      this.ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
    );

    const divergenceShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;

            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }

            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `
    );

    const curlShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
      `
    );

    const vorticityShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;

        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;

            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;

            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `
    );

    const pressureShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;

        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `
    );

    const gradientSubtractShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `
    );

    // Setup blit quad buffers
    const vertexBuffer = gl.createBuffer();
    this.buffers.push(vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    
    const indexBuffer = gl.createBuffer();
    this.buffers.push(indexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.blit = (target, clear = false) => {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };

    // Material and Programs
    this.copyProgram = this.createProgramObj(baseVertexShader, copyShader);
    this.clearProgram = this.createProgramObj(baseVertexShader, clearShader);
    this.splatProgram = this.createProgramObj(baseVertexShader, splatShader);
    this.advectionProgram = this.createProgramObj(baseVertexShader, advectionShader);
    this.divergenceProgram = this.createProgramObj(baseVertexShader, divergenceShader);
    this.curlProgram = this.createProgramObj(baseVertexShader, curlShader);
    this.vorticityProgram = this.createProgramObj(baseVertexShader, vorticityShader);
    this.pressureProgram = this.createProgramObj(baseVertexShader, pressureShader);
    this.gradienSubtractProgram = this.createProgramObj(baseVertexShader, gradientSubtractShader);
    
    this.displayMaterial = this.createMaterialObj(baseVertexShader, displayShaderSource);

    this.initFramebuffers();
    this.lastUpdateTime = Date.now();
    this.colorUpdateTimer = 0.0;

    // Attach listeners to window
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchstart', this.handleTouchStart);
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd);

    this.updateFrame();
  }

  createPointer() {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: [0, 0, 0]
    };
  }

  getWebGLContext(canvas) {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false
    };
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    if (!gl) return null;

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
    let formatRGBA;
    let formatRG;
    let formatR;

    const self = this;
    function getSupportedFormat(internalFormat, format, type) {
      if (!self.supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
          case gl.R16F:
            return getSupportedFormat(gl.RG16F, gl.RG, type);
          case gl.RG16F:
            return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
          default:
            return null;
        }
      }
      return { internalFormat, format };
    }

    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl.RG16F, gl.RG, halfFloatTexType);
      formatR = getSupportedFormat(gl.R16F, gl.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering
      }
    };
  }

  supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(fbo);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  createMaterialObj(vertexShader, fragmentShaderSource) {
    const self = this;
    const gl = this.gl;
    return {
      vertexShader,
      fragmentShaderSource,
      programs: {},
      activeProgram: null,
      uniforms: [],
      setKeywords(keywords) {
        let hash = 0;
        keywords.forEach(keyword => {
          let strHash = 0;
          for (let i = 0; i < keyword.length; i++) {
            strHash = (strHash << 5) - strHash + keyword.charCodeAt(i);
            strHash |= 0;
          }
          hash += strHash;
        });
        let program = this.programs[hash];
        if (program == null) {
          let fragmentShader = self.compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
          program = self.createProgram(this.vertexShader, fragmentShader);
          this.programs[hash] = program;
        }
        if (program === this.activeProgram) return;
        this.uniforms = self.getUniforms(program);
        this.activeProgram = program;
      },
      bind() {
        gl.useProgram(this.activeProgram);
      }
    };
  }

  createProgramObj(vertexShader, fragmentShader) {
    const program = this.createProgram(vertexShader, fragmentShader);
    const uniforms = this.getUniforms(program);
    const gl = this.gl;
    return {
      program,
      uniforms,
      bind() {
        gl.useProgram(program);
      }
    };
  }

  createProgram(vertexShader, fragmentShader) {
    let program = this.gl.createProgram();
    this.programs.push(program);
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.trace(this.gl.getProgramInfoLog(program));
    }
    return program;
  }

  getUniforms(program) {
    let uniforms = [];
    let uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = this.gl.getActiveUniform(program, i).name;
      uniforms[uniformName] = this.gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  }

  compileShader(type, source, keywords) {
    source = this.addKeywords(source, keywords);
    const shader = this.gl.createShader(type);
    this.shaders.push(shader);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.trace(this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  addKeywords(source, keywords) {
    if (!keywords) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
      keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
  }

  initFramebuffers() {
    const gl = this.gl;
    const ext = this.ext;
    let simRes = this.getResolution(this.config.SIM_RESOLUTION);
    let dyeRes = this.getResolution(this.config.DYE_RESOLUTION);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);

    if (this.dye) this.destroyDoubleFBO(this.dye);
    if (this.velocity) this.destroyDoubleFBO(this.velocity);
    if (this.divergence) this.destroyFBO(this.divergence);
    if (this.curl) this.destroyFBO(this.curl);
    if (this.pressure) this.destroyDoubleFBO(this.pressure);

    this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.curl = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.pressure = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  createFBO(w, h, internalFormat, format, type, param) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    this.textures.push(texture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    this.framebuffers.push(fbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      }
    };
  }

  createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; },
      set read(value) { fbo1 = value; },
      get write() { return fbo2; },
      set write(value) { fbo2 = value; },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  destroyFBO(fbo) {
    if (!fbo) return;
    this.gl.deleteTexture(fbo.texture);
    this.gl.deleteFramebuffer(fbo.fbo);
    this.textures = this.textures.filter(t => t !== fbo.texture);
    this.framebuffers = this.framebuffers.filter(f => f !== fbo.fbo);
  }

  destroyDoubleFBO(doubleFBO) {
    if (!doubleFBO) return;
    this.destroyFBO(doubleFBO.read);
    this.destroyFBO(doubleFBO.write);
  }

  updateFrame() {
    if (!this.isActive) return;
    const dt = this.calcDeltaTime();
    if (this.resizeCanvas()) this.initFramebuffers();
    this.updateColors(dt);
    this.applyInputs();
    this.step(dt);
    this.render(null);
    this.animationFrameId = requestAnimationFrame(this.updateFrame);
  }

  calcDeltaTime() {
    let now = Date.now();
    let dt = (now - this.lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    this.lastUpdateTime = now;
    return dt;
  }

  resizeCanvas() {
    let width = this.scaleByPixelRatio(this.canvas.clientWidth);
    let height = this.scaleByPixelRatio(this.canvas.clientHeight);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      return true;
    }
    return false;
  }

  updateColors(dt) {
    this.colorUpdateTimer += dt * this.config.COLOR_UPDATE_SPEED;
    if (this.colorUpdateTimer >= 1) {
      this.colorUpdateTimer = this.wrap(this.colorUpdateTimer, 0, 1);
      this.pointers.forEach(p => {
        p.color = this.generateColor();
      });
    }
  }

  wrap(value, min, max) {
    const range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
  }

  applyInputs() {
    this.pointers.forEach(p => {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    });
  }

  step(dt) {
    const gl = this.gl;
    const ext = this.ext;
    const velocity = this.velocity;
    const curl = this.curl;
    const divergence = this.divergence;
    const pressure = this.pressure;
    const dye = this.dye;

    gl.disable(gl.BLEND);
    this.curlProgram.bind();
    gl.uniform2f(this.curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(this.curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    this.blit(curl);

    this.vorticityProgram.bind();
    gl.uniform2f(this.vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(this.vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(this.vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(this.vorticityProgram.uniforms.curl, this.config.CURL);
    gl.uniform1f(this.vorticityProgram.uniforms.dt, dt);
    this.blit(velocity.write);
    velocity.swap();

    this.divergenceProgram.bind();
    gl.uniform2f(this.divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(this.divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    this.blit(divergence);

    this.clearProgram.bind();
    gl.uniform1i(this.clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(this.clearProgram.uniforms.value, this.config.PRESSURE);
    this.blit(pressure.write);
    pressure.swap();

    this.pressureProgram.bind();
    gl.uniform2f(this.pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(this.pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(this.pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      this.blit(pressure.write);
      pressure.swap();
    }

    this.gradienSubtractProgram.bind();
    gl.uniform2f(this.gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(this.gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(this.gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    this.blit(velocity.write);
    velocity.swap();

    this.advectionProgram.bind();
    gl.uniform2f(this.advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering) {
      gl.uniform2f(this.advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    }
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(this.advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(this.advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(this.advectionProgram.uniforms.dt, dt);
    gl.uniform1f(this.advectionProgram.uniforms.dissipation, this.config.VELOCITY_DISSIPATION);
    this.blit(velocity.write);
    velocity.swap();

    if (!ext.supportLinearFiltering) {
      gl.uniform2f(this.advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    }
    gl.uniform1i(this.advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(this.advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(this.advectionProgram.uniforms.dissipation, this.config.DENSITY_DISSIPATION);
    this.blit(dye.write);
    dye.swap();
  }

  render(target) {
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.BLEND);
    this.drawDisplay(target);
  }

  drawDisplay(target) {
    let width = target == null ? this.gl.drawingBufferWidth : target.width;
    let height = target == null ? this.gl.drawingBufferHeight : target.height;
    
    // Update display shader keywords
    let displayKeywords = [];
    if (this.config.SHADING) displayKeywords.push('SHADING');
    this.displayMaterial.setKeywords(displayKeywords);
    
    this.displayMaterial.bind();
    if (this.config.SHADING) {
      this.gl.uniform2f(this.displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
    }
    this.gl.uniform1i(this.displayMaterial.uniforms.uTexture, this.dye.read.attach(0));
    this.blit(target);
  }

  splatPointer(pointer) {
    let dx = pointer.deltaX * this.config.SPLAT_FORCE;
    let dy = pointer.deltaY * this.config.SPLAT_FORCE;
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  clickSplat(pointer) {
    const color = this.generateColor();
    color.r *= 10.0;
    color.g *= 10.0;
    color.b *= 10.0;
    let dx = 10 * (Math.random() - 0.5);
    let dy = 30 * (Math.random() - 0.5);
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
  }

  splat(x, y, dx, dy, color) {
    const gl = this.gl;
    this.splatProgram.bind();
    gl.uniform1i(this.splatProgram.uniforms.uTarget, this.velocity.read.attach(0));
    gl.uniform1f(this.splatProgram.uniforms.aspectRatio, this.canvas.width / this.canvas.height);
    gl.uniform2f(this.splatProgram.uniforms.point, x, y);
    gl.uniform3f(this.splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(this.splatProgram.uniforms.radius, this.correctRadius(this.config.SPLAT_RADIUS / 100.0));
    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.uniform1i(this.splatProgram.uniforms.uTarget, this.dye.read.attach(0));
    gl.uniform3f(this.splatProgram.uniforms.color, color.r, color.g, color.b);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  correctRadius(radius) {
    let aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = this.generateColor();
  }

  updatePointerMoveData(pointer, posX, posY, color) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.canvas.height;
    pointer.deltaX = this.correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = this.correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  updatePointerUpData(pointer) {
    pointer.down = false;
  }

  correctDeltaX(delta) {
    let aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  correctDeltaY(delta) {
    let aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  hexToRGB(hex) {
    let val = hex.replace('#', '');
    if (val.length === 3) val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
    const r = parseInt(val.slice(0, 2), 16) / 255;
    const g = parseInt(val.slice(2, 4), 16) / 255;
    const b = parseInt(val.slice(4, 6), 16) / 255;
    return { r: r * 0.15, g: g * 0.15, b: b * 0.15 };
  }

  generateColor() {
    if (!this.config.RAINBOW_MODE) {
      return this.hexToRGB(this.config.COLOR);
    }
    let c = this.HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }

  HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r, g, b };
  }

  getResolution(resolution) {
    let aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) return { width: max, height: min };
    else return { width: min, height: max };
  }

  scaleByPixelRatio(input) {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  handleMouseDown(e) {
    let pointer = this.pointers[0];
    let posX = this.scaleByPixelRatio(e.clientX);
    let posY = this.scaleByPixelRatio(e.clientY);
    this.updatePointerDownData(pointer, -1, posX, posY);
    this.clickSplat(pointer);
  }

  handleMouseMove(e) {
    let pointer = this.pointers[0];
    let posX = this.scaleByPixelRatio(e.clientX);
    let posY = this.scaleByPixelRatio(e.clientY);
    if (!this.firstMouseMoveHandled) {
      let color = this.generateColor();
      this.updatePointerMoveData(pointer, posX, posY, color);
      this.firstMouseMoveHandled = true;
    } else {
      this.updatePointerMoveData(pointer, posX, posY, pointer.color);
    }
  }

  handleTouchStart(e) {
    const touches = e.targetTouches;
    let pointer = this.pointers[0];
    for (let i = 0; i < touches.length; i++) {
      let posX = this.scaleByPixelRatio(touches[i].clientX);
      let posY = this.scaleByPixelRatio(touches[i].clientY);
      this.updatePointerDownData(pointer, touches[i].identifier, posX, posY);
    }
  }

  handleTouchMove(e) {
    const touches = e.targetTouches;
    let pointer = this.pointers[0];
    for (let i = 0; i < touches.length; i++) {
      let posX = this.scaleByPixelRatio(touches[i].clientX);
      let posY = this.scaleByPixelRatio(touches[i].clientY);
      this.updatePointerMoveData(pointer, posX, posY, pointer.color);
    }
  }

  handleTouchEnd(e) {
    const touches = e.changedTouches;
    let pointer = this.pointers[0];
    for (let i = 0; i < touches.length; i++) {
      this.updatePointerUpData(pointer);
    }
  }

  destroy() {
    this.isActive = false;

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove window event listeners
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);

    // Clean up WebGL resources
    const gl = this.gl;
    if (gl) {
      this.destroyDoubleFBO(this.dye);
      this.destroyDoubleFBO(this.velocity);
      this.destroyFBO(this.divergence);
      this.destroyFBO(this.curl);
      this.destroyDoubleFBO(this.pressure);

      this.textures.forEach(tex => gl.deleteTexture(tex));
      this.framebuffers.forEach(fbo => gl.deleteFramebuffer(fbo));
      this.buffers.forEach(buf => gl.deleteBuffer(buf));
      this.shaders.forEach(shader => gl.deleteShader(shader));
      this.programs.forEach(prog => gl.deleteProgram(prog));
      
      // Release materials programs
      if (this.displayMaterial && this.displayMaterial.programs) {
        for (let hash in this.displayMaterial.programs) {
          gl.deleteProgram(this.displayMaterial.programs[hash]);
        }
      }

      this.textures = [];
      this.framebuffers = [];
      this.buffers = [];
      this.shaders = [];
      this.programs = [];
    }

    this.gl = null;
    this.ext = null;
  }
}

window.SplashCursor = SplashCursor;
