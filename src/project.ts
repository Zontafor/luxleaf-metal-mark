import { validate, type MetalOptions } from "./index.js";
export interface MetalProject {
  version: 1;
  name: string;
  options: MetalOptions;
  logo?: string;
}
export function validateProject(input: unknown): MetalProject {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Project required");
  const v = input as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) => !["version", "name", "options", "logo"].includes(k),
    ) ||
    v.version !== 1 ||
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name.length > 80
  )
    throw new Error("Invalid project");
  if (
    v.logo !== undefined &&
    (typeof v.logo !== "string" ||
      v.logo.length > 1_500_000 ||
      !/^data:image\/(png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v.logo))
  )
    throw new Error("Invalid embedded logo");
  return {
    version: 1,
    name: v.name.trim(),
    options: validate(v.options),
    ...(v.logo ? { logo: v.logo as string } : {}),
  };
}
export function serializeProject(project: MetalProject) {
  return JSON.stringify(validateProject(project));
}
export function parseProject(text: string) {
  if (text.length > 1_520_000) throw new Error("Project too large");
  return validateProject(JSON.parse(text));
}
export function projectLink(project: MetalProject, base: string) {
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("HTTP URL required");
  const payload = serializeProject(project);
  if (payload.length > 64000)
    throw new Error("Use a project file for larger logos");
  url.hash = "project=" + encodeURIComponent(payload);
  return url.href;
}
export function projectFromLink(link: string) {
  const url = new URL(link);
  if (!url.hash.startsWith("#project=")) throw new Error("Missing project");
  return parseProject(decodeURIComponent(url.hash.slice(9)));
}
export class ProjectHistory {
  private undoStack: MetalProject[] = [];
  private redoStack: MetalProject[] = [];
  private value: MetalProject;
  constructor(project: MetalProject) {
    this.value = validateProject(project);
  }
  get current() {
    return validateProject(this.value);
  }
  commit(project: MetalProject) {
    const next = validateProject(project);
    this.undoStack.push(this.current);
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack = [];
    this.value = next;
    return this.current;
  }
  undo() {
    const p = this.undoStack.pop();
    if (p) {
      this.redoStack.push(this.current);
      this.value = p;
    }
    return this.current;
  }
  redo() {
    const p = this.redoStack.pop();
    if (p) {
      this.undoStack.push(this.current);
      this.value = p;
    }
    return this.current;
  }
}
