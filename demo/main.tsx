import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MetalCanvas,
  type MetalMark,
  defaults,
  validate,
  serialize,
  deserialize,
  type MetalOptions,
} from "../src/index";
import "./style.css";
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function App() {
  const [options, setOptions] = useState(defaults),
    [message, setMessage] = useState("Ready for your ideas."),
    [draft, setDraft] = useState(""),
    [ready, setReady] = useState("ready");
  const renderer = useRef<MetalMark | null>(null);
  function change(p: Partial<MetalOptions>) {
    setOptions(validate({ ...options, ...p }));
  }
  return (
    <>
      <header>
        <strong>
          LUXLEAF <small>VISUAL SYSTEMS</small>
        </strong>
        <span className="badge">METAL-MARK / 01</span>
      </header>
      <main>
        <div className="intro">
          <div>
            <small>DESIGN ENGINEERING</small>
            <h1>A mark in motion.</h1>
          </div>
          <p>
            An original metal treatment for your identity. Import a transparent
            logo locally and sculpt its reflections.
          </p>
        </div>
        <div className="workspace">
          <section className="preview" aria-label="Live visual preview">
            <MetalCanvas
              options={options}
              onReady={(value) => {
                renderer.current = value;
                setReady(value?.surface.status ?? "waiting");
              }}
            />
          </section>
          <aside className="controls" aria-label="Visual settings">
            <label>
              Color
              <input
                type="color"
                value={options.color}
                onChange={(e) => change({ color: e.target.value })}
              />
            </label>
            <label>
              Speed · {options.speed}
              <input
                aria-label="Speed"
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={options.speed}
                onChange={(e) => change({ speed: Number(e.target.value) })}
              />
            </label>
            <label>
              Frequency · {options.frequency}
              <input
                aria-label="Frequency"
                type="range"
                min={1}
                max={20}
                step={0.1}
                value={options.frequency}
                onChange={(e) => change({ frequency: Number(e.target.value) })}
              />
            </label>
            <label>
              Distortion · {options.distortion}
              <input
                aria-label="Distortion"
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={options.distortion}
                onChange={(e) => change({ distortion: Number(e.target.value) })}
              />
            </label>
            <label>
              Contrast · {options.contrast}
              <input
                aria-label="Contrast"
                type="range"
                min={0.3}
                max={3}
                step={0.01}
                value={options.contrast}
                onChange={(e) => change({ contrast: Number(e.target.value) })}
              />
            </label>
            <button onClick={() => change({ animate: !options.animate })}>
              {options.animate ? "Pause motion" : "Play motion"}
            </button>
            <label>
              Transparent PNG / WebP
              <input
                type="file"
                accept="image/png,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    try {
                      await renderer.current?.load(f);
                      setMessage("Logo loaded locally");
                    } catch (error) {
                      setMessage((error as Error).message);
                    }
                }}
              />
            </label>
            <button
              onClick={async () => {
                try {
                  const blob = await renderer.current!.exportPNG();
                  download(blob, "luxleaf-render.png");
                  setMessage("PNG exported");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Export PNG
            </button>
            <button onClick={() => setOptions(defaults)}>Reset settings</button>
          </aside>
        </div>
        <div className="notes">
          <div>
            <strong>Considered by default</strong>
            <p>
              Reduced-motion preferences and hidden tabs pause the animation.
            </p>
          </div>
          <div>
            <strong>Your configuration</strong>
            <p>
              Settings are validated before rendering. Save a preset for another
              surface.
            </p>
            <button
              onClick={() => {
                const data = serialize(options);
                setDraft(data);
                download(
                  new Blob([data], { type: "application/json" }),
                  "luxleaf-preset.json",
                );
                setMessage("Preset exported");
              }}
            >
              Export preset
            </button>
          </div>
          <div>
            <strong>Private by design</strong>
            <p>No analytics or uploads. The demo runs on this device.</p>
            <output role="status">
              {message} · renderer {ready}
            </output>
          </div>
        </div>
        <details>
          <summary>Import a preset</summary>
          <textarea
            aria-label="Preset JSON"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            style={{ width: "100%" }}
          />
          <button
            onClick={() => {
              try {
                setOptions(deserialize(draft));
                setMessage("Preset imported");
              } catch (error) {
                setMessage((error as Error).message);
              }
            }}
          >
            Apply preset
          </button>
        </details>
      </main>
      <footer>
        Original LuxLeaf product · © 2026 Michelle L. Wu · Private development
        preview
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
