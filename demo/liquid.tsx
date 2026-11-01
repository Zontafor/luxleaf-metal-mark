import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LiquidMark,
  liquidDefaults,
  liquidRanges,
  liquidExamples,
  type LiquidSettings,
  type ArtworkMode,
  type LiquidProject,
  liquidShare,
  liquidFromShare,
  validateLiquidProject,
} from "../src/liquid";
import { exportPreviewPNG, recordPreview } from "../src/preview-export";
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
    [inputMode, mode] = useState<ArtworkMode>("auto"),
    [message, status] = useState(""),
    [busy, working] = useState(false),
    [ready, isReady] = useState(false);
  async function restore(project: LiquidProject) {
    const x = validateLiquidProject(project);
    renderer.current!.setInputMode(x.inputMode ?? "auto");
    mode(x.inputMode ?? "auto");
    const bytes = Uint8Array.from(atob(x.logo.split(",")[1]), (c) =>
      c.charCodeAt(0),
    );
    await renderer.current!.load(
      new File([bytes], "logo.png", { type: "image/png" }),
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
        else {
          const response = await fetch("/sentileaf.png");
          if (!response.ok) throw Error("SentiLeaf demo image unavailable");
          await r.load(
            new File([await response.blob()], "sentileaf.png", {
              type: "image/png",
            }),
          );
        }
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
      status(
        renderer.current!.artworkTreatment === "relief"
          ? "Full-image relief: the entire artwork is opaque metal"
          : "Logo cutout: background removed",
      );
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
      inputMode,
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
            <label className="artwork-mode">
              Artwork mode{" "}
              <select
                aria-label="Artwork mode"
                value={inputMode}
                disabled={busy}
                onChange={(e) => {
                  const next = e.target.value as ArtworkMode;
                  try {
                    renderer.current!.setInputMode(next);
                    mode(next);
                    status(
                      renderer.current!.artworkTreatment === "relief"
                        ? "Full-image relief: the entire artwork is opaque metal"
                        : "Logo cutout: background removed",
                    );
                  } catch (error) {
                    status(String(error));
                  }
                }}
              >
                <option value="auto">Automatic</option>
                <option value="cutout">Logo cutout</option>
                <option value="relief">Full-image relief</option>
              </select>
            </label>
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
              Transparent or flat-color logos use a cutout. Choose Full-image
              relief for textured photographs to keep the entire artwork
              metallic.
            </p>
            <p className="hint">
              {settings.speed === 0
                ? "Motion paused — increase Speed to animate."
                : "Motion playing"}
            </p>
            <p role="status">{message}</p>
          </section>
        </div>
        <button
          disabled={!ready || busy}
          onClick={async () => {
            working(true);
            try {
              renderer.current!.setInputMode("auto");
              mode("auto");
              const response = await fetch("/sentileaf.png");
              if (!response.ok) throw Error("Demo image unavailable");
              await load(
                new File([await response.blob()], "sentileaf.png", {
                  type: "image/png",
                }),
              );
              set({ ...liquidDefaults });
            } catch (e) {
              status(String(e));
            } finally {
              working(false);
            }
          }}
        >
          SentiLeaf demo
        </button>
        <button
          disabled={!ready || busy}
          onClick={async () => {
            working(true);
            try {
              renderer.current!.setInputMode("cutout");
              mode("cutout");
              const response = await fetch("/aulin_leather.png");
              if (!response.ok) throw Error("AULIN image unavailable");
              await load(
                new File([await response.blob()], "aulin_leather.png", {
                  type: "image/png",
                }),
              );
              set({ ...liquidDefaults, speed: 1 });
            } catch (e) {
              status(String(e));
            } finally {
              working(false);
            }
          }}
        >
          AULIN previous look
        </button>
        <button
          disabled={!ready || busy}
          onClick={async () => {
            working(true);
            try {
              renderer.current!.setInputMode("relief");
              mode("relief");
              const response = await fetch("/aulin_leather.png");
              if (!response.ok) throw Error("AULIN image unavailable");
              await load(
                new File([await response.blob()], "aulin_leather.png", {
                  type: "image/png",
                }),
              );
              set({ ...liquidDefaults, speed: 1 });
            } catch (e) {
              status(String(e));
            } finally {
              working(false);
            }
          }}
        >
          AULIN full surface
        </button>
        <nav className="examples" aria-label="Example shapes">
          {liquidExamples.map((shape) => (
            <button
              key={shape}
              disabled={!ready || busy}
              onClick={() => {
                renderer.current!.setInputMode("auto");
                mode("auto");
                void renderer.current
                  ?.example(shape)
                  .catch((e) => status(String(e)));
              }}
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
          <p className="hint">
            PNG and video include the selected background. Use Transparent PNG
            for compositing.
          </p>
          <div className="actions">
            <button
              disabled={!ready || busy}
              onClick={async () => {
                try {
                  download(
                    await renderer.current!.exportPNG(),
                    "sentileaf-transparent.png",
                  );
                } catch (e) {
                  status(String(e));
                }
              }}
            >
              Transparent PNG
            </button>
            <button
              disabled={!ready || busy}
              onClick={async () => {
                try {
                  download(
                    await exportPreviewPNG(canvas.current!, background),
                    "luxleaf-liquid.png",
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
                if (settings.speed === 0) {
                  status("Motion is paused. Increase Speed before recording.");
                  return;
                }
                working(true);
                status("Recording 10 seconds with the selected background…");
                try {
                  download(
                    await recordPreview(canvas.current!, background),
                    "luxleaf-liquid.webm",
                  );
                  status("Video saved with the selected background");
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
                    "luxleaf-liquid.json",
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
                    liquidShare(project(), location.href),
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
