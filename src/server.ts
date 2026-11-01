import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { validateProject, type MetalProject } from "./project.js";
/** Local persistence adapter. The host must supply a secret and HTTPS/reverse proxy for remote deployment. */
export class ProjectStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, body TEXT NOT NULL, expires INTEGER NOT NULL);",
    );
  }
  put(project: MetalProject, ttlSeconds = 86400, now = Date.now()) {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 604800)
      throw new Error("TTL must be 1 minute–7 days");
    const body = JSON.stringify(validateProject(project));
    const id = randomBytes(24).toString("base64url");
    this.db
      .prepare("INSERT INTO projects(id,body,expires) VALUES(?,?,?)")
      .run(id, body, now + ttlSeconds * 1000);
    return id;
  }
  get(id: string, now = Date.now()) {
    if (!/^[A-Za-z0-9_-]{32}$/.test(id)) return null;
    const row = this.db
      .prepare("SELECT body,expires FROM projects WHERE id=?")
      .get(id) as { body: string; expires: number } | undefined;
    if (!row || row.expires <= now) return null;
    return validateProject(JSON.parse(row.body));
  }
  delete(id: string) {
    return (
      this.db.prepare("DELETE FROM projects WHERE id=?").run(id).changes > 0
    );
  }
  sweep(now = Date.now()) {
    return this.db.prepare("DELETE FROM projects WHERE expires<=?").run(now)
      .changes;
  }
  close() {
    this.db.close();
  }
}
function authorized(request: IncomingMessage, token: string) {
  const supplied = request.headers.authorization ?? "",
    expected = "Bearer " + token;
  const a = Buffer.from(supplied),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function reply(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(value));
}
export function createProjectServer({
  store,
  token,
  allowPublicRead = false,
}: {
  store: ProjectStore;
  token: string;
  allowPublicRead?: boolean;
}) {
  if (token.length < 32)
    throw new Error("A server token of at least 32 characters is required");
  return createServer(async (req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (req.method === "GET" && path === "/health") {
      reply(res, 200, { ok: true });
      return;
    }
    const id = /^\/(?:api\/projects|share)\/([A-Za-z0-9_-]{32})$/.exec(
      path,
    )?.[1];
    if (
      !(req.method === "GET" && id && allowPublicRead) &&
      !authorized(req, token)
    ) {
      reply(res, 401, { error: "Unauthorized" });
      req.resume();
      return;
    }
    try {
      if (
        req.method === "POST" &&
        (path === "/api/projects" || path === "/api/user-logo")
      ) {
        if (!req.headers["content-type"]?.startsWith("application/json")) {
          reply(res, 415, { error: "JSON required" });
          req.resume();
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 1_520_000) {
            reply(res, 413, { error: "Project too large" });
            req.resume();
            return;
          }
          chunks.push(chunk);
        }
        const project = validateProject(
          JSON.parse(Buffer.concat(chunks).toString("utf8")),
        );
        const id = store.put(project);
        reply(res, 201, { id, path: "/share/" + id });
        return;
      }
      if (req.method === "GET" && id) {
        const project = store.get(id);
        reply(
          res,
          project ? 200 : 404,
          project ?? { error: "Not found or expired" },
        );
        return;
      }
      if (req.method === "DELETE" && id) {
        const deleted = store.delete(id);
        reply(res, deleted ? 200 : 404, { deleted });
        return;
      }
      reply(res, 404, { error: "Not found" });
    } catch {
      reply(res, 400, { error: "Invalid request" });
    }
  });
}
