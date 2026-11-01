import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MetalCanvas,
  defaults,
  type MetalMark,
  validate,
  recordCanvas,
  serializeProject,
  parseProject,
  projectLink,
  projectFromLink,
  ProjectHistory,
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
  const renderer = useRef<MetalMark | null>(null),
    history = useRef(
      new ProjectHistory({
        version: 1,
        name: "LuxLeaf leaf",
        options: defaults,
      }),
    ),
    [project, set] = useState(history.current.current),
    [message, status] = useState(
      "Local processing • geometry-only SVG, PNG and WebP",
    ),
    [draft, edit] = useState(""),
    [busy, working] = useState(false);
  async function applyProject(value: typeof project, commit = true) {
    if (value.logo && renderer.current) {
      const data = value.logo.split(",")[1],
        bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      await renderer.current.load(
        new File([bytes], "logo.png", {
          type: value.logo.startsWith("data:image/webp")
            ? "image/webp"
            : "image/png",
        }),
      );
    } else renderer.current?.resetLogo();
    set(commit ? history.current.commit(value) : value);
  }
  const change = (key: string, value: number | boolean) => {
    set(
      history.current.commit({
        ...project,
        options: validate({ ...project.options, [key]: value }),
      }),
    );
  };
  return (
    <>
      <header>
        <strong>LUXLEAF METAL MARK STUDIO</strong>
      </header>
      <main>
        <h1>Your identity, in motion.</h1>
        <p>
          Distance-field bevels, directional reflections, portable projects and
          video capture.
        </p>
        <div className="workspace">
          <section className="preview">
            <MetalCanvas
              options={project.options}
              onReady={(x) => {
                renderer.current = x;
                if (x && location.hash.startsWith("#project=")) {
                  try {
                    const shared = projectFromLink(location.href);
                    window.history.replaceState(null, "", location.pathname);
                    void applyProject(shared).catch((e) => status(String(e)));
                  } catch (e) {
                    status(String(e));
                  }
                }
              }}
            />
          </section>
          <aside className="controls">
            <label>
              SVG / PNG / WebP
              <input
                type="file"
                accept="image/svg+xml,image/png,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f || !renderer.current) return;
                  working(true);
                  try {
                    if (f.type === "image/svg+xml" || f.name.endsWith(".svg"))
                      await renderer.current.loadSVG(await f.text());
                    else await renderer.current.load(f);
                    set(
                      history.current.commit({
                        ...project,
                        logo: renderer.current.exportLogo(),
                      }),
                    );
                    status("Logo processed locally");
                  } catch (e) {
                    status(String(e));
                  } finally {
                    working(false);
                  }
                }}
              />
            </label>
            {[
              ["angle", -180, 180],
              ["edge", 0, 3],
              ["chromatic", 0, 1],
              ["frequency", 1, 20],
              ["distortion", 0, 2],
              ["speed", 0, 2],
            ].map(([key, min, max]) => (
              <label key={key}>
                {key}
                <input
                  type="range"
                  aria-label={String(key)}
                  min={Number(min)}
                  max={Number(max)}
                  step=".01"
                  value={
                    project.options[key as keyof typeof defaults] as number
                  }
                  onChange={(e) => change(String(key), Number(e.target.value))}
                />
              </label>
            ))}
            <button onClick={() => change("animate", !project.options.animate)}>
              {project.options.animate ? "Pause motion" : "Play motion"}
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                try {
                  download(
                    await renderer.current!.exportPNG(),
                    "luxleaf-mark.png",
                  );
                } catch (e) {
                  status(String(e));
                }
              }}
            >
              Export PNG
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                working(true);
                status("Recording 3 seconds…");
                try {
                  download(
                    await recordCanvas(renderer.current!.surface.canvas),
                    "luxleaf-mark.webm",
                  );
                  status("Video exported");
                } catch (e) {
                  status(String(e));
                } finally {
                  working(false);
                }
              }}
            >
              Record WebM
            </button>
            <button
              onClick={() =>
                void applyProject(history.current.undo(), false).catch((e) =>
                  status(String(e)),
                )
              }
            >
              Undo
            </button>
            <button
              onClick={() =>
                void applyProject(history.current.redo(), false).catch((e) =>
                  status(String(e)),
                )
              }
            >
              Redo
            </button>
          </aside>
        </div>
        <p role="status">{message}</p>
        <button
          onClick={() =>
            download(
              new Blob([serializeProject(project)], {
                type: "application/json",
              }),
              "luxleaf-project.json",
            )
          }
        >
          Export complete project
        </button>{" "}
        <button
          onClick={() => {
            try {
              const url = projectLink(project, location.href);
              window.history.replaceState(null, "", url);
              edit(url);
              status("Share link saved in the address bar");
            } catch (e) {
              status(String(e));
            }
          }}
        >
          Share settings
        </button>
        <details>
          <summary>Import project or shared URL</summary>
          <textarea
            value={draft}
            onChange={(e) => edit(e.target.value)}
            aria-label="Project JSON or URL"
          />
          <button
            onClick={async () => {
              try {
                await applyProject(
                  draft.startsWith("http")
                    ? projectFromLink(draft)
                    : parseProject(draft),
                );
                status("Complete project imported");
              } catch (e) {
                status(String(e));
              }
            }}
          >
            Import project
          </button>
        </details>
        <a href="/checks-expanded.html">Run processing and export checks</a>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
