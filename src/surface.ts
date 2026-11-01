// Original LuxLeaf browser GPU lifecycle. Copyright 2026 Michelle L. Wu.
export type Uniform = number | readonly number[];
export class Surface {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private image: TexImageSource | null = null;
  private field: {
    pixels: Float32Array;
    width: number;
    height: number;
  } | null = null;
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private dead = false;
  private visible = true;
  private observer: ResizeObserver;
  private intersection: IntersectionObserver | null = null;
  private media = window.matchMedia("(prefers-reduced-motion: reduce)");
  private uniforms: Record<string, Uniform> = {};
  private running = true;
  status: "ready" | "fallback" | "lost" | "disposed" = "fallback";
  private vertex = `#version 300 es
  out vec2 uv; void main(){ vec2 p=vec2((gl_VertexID==1)?3.0:-1.0,(gl_VertexID==2)?3.0:-1.0);uv=(p+1.0)*0.5;gl_Position=vec4(p,0,1);}`;
  constructor(
    canvas: HTMLCanvasElement,
    private fragment: string,
  ) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    if (typeof IntersectionObserver !== "undefined") {
      this.intersection = new IntersectionObserver((entries) => {
        this.visible = entries[0]?.isIntersecting ?? true;
        this.schedule();
      });
      this.intersection.observe(canvas);
    }
    document.addEventListener("visibilitychange", this.schedule);
    this.media.addEventListener("change", this.schedule);
    canvas.addEventListener("webglcontextlost", this.lost);
    canvas.addEventListener("webglcontextrestored", this.restored);
    this.canvas.dataset.renderer = "fallback";
    this.initialize();
    this.resize();
    this.schedule();
  }
  private initialize() {
    const gl = this.gl;
    if (!gl) return;
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message ?? "Shader compile failed");
      }
      return shader;
    };
    let v: WebGLShader | null = null,
      f: WebGLShader | null = null,
      p: WebGLProgram | null = null;
    try {
      v = compile(gl.VERTEX_SHADER, this.vertex);
      f = compile(gl.FRAGMENT_SHADER, this.fragment);
      p = gl.createProgram()!;
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error("Shader link failed");
      this.program = p;
      this.status = "ready";
      this.canvas.dataset.renderer = "webgl2";
      if (this.field) this.uploadField();
      else if (this.image) this.setImage(this.image);
    } catch {
      if (p) gl.deleteProgram(p);
      this.status = "fallback";
      this.canvas.dataset.renderer = "fallback";
    } finally {
      if (v) gl.deleteShader(v);
      if (f) gl.deleteShader(f);
    }
  }
  private lost = (event: Event) => {
    event.preventDefault();
    this.status = "lost";
    this.canvas.dataset.renderer = "lost";
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  };
  private restored = () => {
    if (this.dead) return;
    this.program = null;
    this.texture = null;
    this.initialize();
    this.resize();
    this.schedule();
  };
  private resize() {
    if (this.dead) return;
    const r = this.canvas.getBoundingClientRect(),
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.min(4096, Math.round(r.width * dpr)));
    this.canvas.height = Math.max(
      1,
      Math.min(4096, Math.round(r.height * dpr)),
    );
    this.draw();
  }
  private schedule = () => {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = 0;
    if (this.dead || this.status !== "ready") return;
    this.draw();
    if (this.running && !this.media.matches && !document.hidden && this.visible)
      this.raf = requestAnimationFrame(this.frame);
  };
  private frame = (time: number) => {
    this.elapsed += this.last ? Math.min((time - this.last) / 1000, 0.05) : 0;
    this.last = time;
    this.draw();
    if (
      !this.dead &&
      this.running &&
      !this.media.matches &&
      !document.hidden &&
      this.visible
    )
      this.raf = requestAnimationFrame(this.frame);
    else this.raf = 0;
  };
  set(values: Record<string, Uniform>) {
    if (this.dead) throw new Error("Surface disposed");
    this.uniforms = { ...this.uniforms, ...values };
    this.draw();
  }
  play(value: boolean) {
    this.running = value;
    this.schedule();
  }
  setImage(image: TexImageSource) {
    if (this.dead) throw new Error("Surface disposed");
    this.image = image;
    this.field = null;
    const gl = this.gl;
    if (!gl || !this.program) return;
    if (!this.texture) this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    this.draw();
  }
  /** Upload linear data as a half-float texture, preserving smooth normal gradients. */
  setLinearField(pixels: Float32Array, width: number, height: number) {
    if (this.dead) throw new Error("Surface disposed");
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > 4194304 ||
      pixels.length !== width * height * 4
    )
      throw new Error("Invalid field dimensions");
    const flipped = new Float32Array(pixels.length);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width * 4; x++) {
        const value = pixels[y * width * 4 + x];
        if (!Number.isFinite(value) || value < 0 || value > 1)
          throw new Error("Invalid field value");
        flipped[(height - 1 - y) * width * 4 + x] = value;
      }
    this.field = { pixels: flipped, width, height };
    this.image = null;
    this.uploadField();
    this.draw();
  }
  private uploadField() {
    const gl = this.gl,
      field = this.field;
    if (!gl || !this.program || !field) return;
    if (!this.texture) this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      field.width,
      field.height,
      0,
      gl.RGBA,
      gl.FLOAT,
      field.pixels,
    );
  }
  private draw() {
    const gl = this.gl,
      p = this.program;
    if (!gl || !p || this.dead || this.status !== "ready") return;
    gl.useProgram(p);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const values = {
      ...this.uniforms,
      uTime: this.elapsed,
      uResolution: [this.canvas.width, this.canvas.height],
    };
    for (const [key, value] of Object.entries(values)) {
      const loc = gl.getUniformLocation(p, key);
      if (loc === null) continue;
      if (typeof value === "number") gl.uniform1f(loc, value);
      else if (value.length === 2) gl.uniform2fv(loc, value);
      else if (value.length === 3) gl.uniform3fv(loc, value);
      else if (value.length === 4) gl.uniform4fv(loc, value);
    }
    if (this.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(gl.getUniformLocation(p, "uImage"), 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  exportPNG(): Promise<Blob> {
    if (this.dead || this.status !== "ready")
      return Promise.reject(new Error("Renderer unavailable"));
    this.draw();
    return new Promise((resolve, reject) =>
      this.canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Export unavailable")),
        "image/png",
      ),
    );
  }
  destroy() {
    if (this.dead) return;
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.intersection?.disconnect();
    document.removeEventListener("visibilitychange", this.schedule);
    this.media.removeEventListener("change", this.schedule);
    this.canvas.removeEventListener("webglcontextlost", this.lost);
    this.canvas.removeEventListener("webglcontextrestored", this.restored);
    if (this.program) this.gl?.deleteProgram(this.program);
    if (this.texture) this.gl?.deleteTexture(this.texture);
    this.image = null;
    this.field = null;
    this.status = "disposed";
    this.canvas.dataset.renderer = "disposed";
  }
}
