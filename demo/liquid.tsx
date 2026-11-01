import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LiquidMark,
  liquidDefaults,
  liquidRanges,
  liquidExamples,
  type LiquidSettings,
  type LiquidProject,
  liquidShare,
  liquidFromShare,
  validateLiquidProject,
} from "../src/liquid";
import { recordCanvas } from "../src/recording";
import "./liquid.css";
const labels: Record<keyof LiquidSettings, string> = {
  refraction: "Refraction",
  edge: "Edge",
  patternBlur: "Pattern Blur",
  liquify: "Liquify",
  speed: "Speed",
  patternScale: "Pattern Scale",
};
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function App() {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<LiquidMark | null>(null),
    input = useRef<HTMLInputElement>(null);
  const [settings, set] = useState<LiquidSettings>({ ...liquidDefaults }),
    [background, bg] = useState("gradient"),
    [message, status] = useState(""),
    [busy, working] = useState(false),
    [ready, isReady] = useState(false);
  async function restore(project: LiquidProject) {
    const x = validateLiquidProject(project);
    const bytes = Uint8Array.from(atob(x.logo.split(",")[1]), (c) =>
      c.charCodeAt(0)
    );
    await renderer.current!.load(
      new File([bytes], "logo.png", { type: "image/png" })
    );
    set(x.settings);
    bg(x.background);
  }
  useEffect(() => {
    let r: LiquidMark;
    try {
      r = new LiquidMark(canvas.current!);
    } catch (error) {
      status(String(error));
      return;
    }
    renderer.current = r;
    void (async () => {
      try {
        if (location.hash.startsWith("#liquid="))
          await restore(liquidFromShare(location.href));
        else await r.example("leaf");
        isReady(true);
      } catch (e) {
        status(String(e));
      }
    })();
    return () => {
      r.destroy();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    renderer.current?.update(settings);
  }, [settings]);
  async function load(file: File) {
    working(true);
    try {
      if (file.name.endsWith(".json")) {
        if (file.size > 1520000) throw Error("Project too large");
        await restore(JSON.parse(await file.text()));
      } else await renderer.current!.load(file);
      status("Image loaded");
      isReady(true);
    } catch (e) {
      status(String(e));
    } finally {
      working(false);
    }
  }
  function project(): LiquidProject {
    return {
      version: 1,
      kind: "liquid-logo",
      settings,
      background,
      logo: renderer.current!.exportLogo(),
    };
  }
  return (
    <>
      <header>
        <strong>LuxLeaf</strong>
        <span>Liquid Metal</span>
        <a href="/checks-liquid.html">Verification</a>
      </header>
      <main>
        <div className="editor">
          <section
            className="logo-preview"
            aria-label="Logo preview"
            style={{
              background:
                background === "gradient"
                  ? "linear-gradient(#efefef,#b8b8b8)"
                  : background,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void load(file);
            }}
          >
            <canvas ref={canvas} aria-label="Liquid metal logo" />
          </section>
          <section className="parameters" aria-label="Liquid metal controls">
            <div className="background">
              <span>Background</span>
              <div>
                {["gradient", "#ffffff", "#000000"].map((color) => (
                  <button
                    key={color}
                    aria-label={
                      color === "gradient"
                        ? "Gradient background"
                        : color === "#ffffff"
                        ? "White background"
                        : "Black background"
                    }
                    onClick={() => bg(color)}
                    style={{
                      background:
                        color === "gradient"
                          ? "linear-gradient(#fff,#aaa)"
                          : color,
                    }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom background"
                  value={background === "gradient" ? "#c8c8c8" : background}
                  onChange={(e) => bg(e.target.value)}
                />
              </div>
            </div>
            {(Object.keys(labels) as (keyof LiquidSettings)[]).map((key) => (
              <div className="parameter" key={key}>
                <label htmlFor={key}>{labels[key]}</label>
                <input
                  id={key}
                  type="range"
                  min={liquidRanges[key][0]}
                  max={liquidRanges[key][1]}
                  step={liquidRanges[key][2]}
                  value={settings[key]}
                  onChange={(e) =>
                    set({ ...settings, [key]: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  aria-label={labels[key] + " value"}
                  min={liquidRanges[key][0]}
                  max={liquidRanges[key][1]}
                  step={liquidRanges[key][2]}
                  value={settings[key]}
                  onChange={(e) => {
                    const value = e.target.valueAsNumber;
                    if (
                      Number.isFinite(value) &&
                      value >= liquidRanges[key][0] &&
                      value <= liquidRanges[key][1]
                    )
                      set({ ...settings, [key]: value });
                  }}
                />
              </div>
            ))}
            <button
              className="upload"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              Upload image
            </button>
            <input
              ref={input}
              type="file"
              hidden
              accept="image/svg+xml,image/png,image/webp,image/jpeg,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void load(f);
              }}
            />
            <p className="hint">
              Use a transparent or white background. SVG and high-resolution
              images work well.
            </p>
            <p role="status">{message}</p>
          </section>
        </div>
        <nav className="examples" aria-label="Example shapes">
          {liquidExamples.map((shape) => (
            <button
              key={shape}
              disabled={!ready || busy}
              onClick={() =>
                void renderer.current
                  ?.example(shape)
                  .catch((e) => status(String(e)))
              }
            >
              <span aria-hidden="true">
                {
                  {
                    leaf: "◒",
                    circle: "●",
                    diamond: "◆",
                    star: "★",
                    ring: "◉",
                    wave: "∿",
                  }[shape]
                }
              </span>
              {shape}
            </button>
          ))}
        </nav>
        <details>
          <summary>Export and share</summary>
          <div className="actions">
            <button
              disabled={!ready || busy}
              onClick={async () => {
                try {
                  download(
                    await renderer.current!.exportPNG(),
                    "luxleaf-liquid.png"
                  );
                } catch (e) {
                  status(String(e));
                }
              }}
            >
              Export PNG
            </button>
            <button
              disabled={!ready || busy}
              onClick={async () => {
                working(true);
                try {
                  download(
                    await recordCanvas(canvas.current!),
                    "luxleaf-liquid.webm"
                  );
                } catch (e) {
                  status(String(e));
                } finally {
                  working(false);
                }
              }}
            >
              Export video
            </button>
            <button
              disabled={!ready || busy}
              onClick={() => {
                try {
                  download(
                    new Blob([JSON.stringify(project())], {
                      type: "application/json",
                    }),
                    "luxleaf-liquid.json"
                  );
                } catch (e) {
                  status(String(e));
                }
              }}
            >
              Save project
            </button>
            <button
              disabled={!ready || busy}
              onClick={() => {
                try {
                  history.replaceState(
                    null,
                    "",
                    liquidShare(project(), location.href)
                  );
                  status("Share link is in the address bar");
                } catch (e) {
                  status(String(e));
                }
              }}
            >
              Create share link
            </button>
            <button onClick={() => set({ ...liquidDefaults })}>
              Reset settings
            </button>
          </div>
        </details>
        <p className="provenance">
          Independent LuxLeaf implementation. Procedural sample shapes are
          original; pixel parity with the reference is not yet certified.
        </p>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
