import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

describe("OpenAPI spec", () => {
  const specPath = path.join(process.cwd(), "openapi", "openapi.yaml");
  const spec = yaml.load(fs.readFileSync(specPath, "utf8")) as any;

  it("has versioned servers", () => {
    expect(spec?.servers?.length).toBeGreaterThan(0);
    expect(
      spec.servers.some((s: any) => String(s.url).includes("/api/v1")),
    ).toBe(true);
  });

  it("documents core v1 endpoints", () => {
    const paths = spec?.paths ?? {};
    for (const required of ["/tickets", "/tickets/{id}", "/messages", "/contractors/search", "/uploads/sign"]) {
      expect(paths[required]).toBeTruthy();
    }
  });

  it("uses bearer auth", () => {
    expect(spec?.components?.securitySchemes?.bearerAuth).toBeTruthy();
  });

  it("documents error shape", () => {
    const error = spec?.components?.schemas?.Error;
    expect(error).toBeTruthy();
    expect(error?.properties?.error).toBeTruthy();
  });

  it("messages request requires ticketId/to/subject", () => {
    const schema = spec?.paths?.["/messages"]?.post?.requestBody?.content?.["application/json"]?.schema;
    const required = schema?.required ?? [];
    expect(required).toContain("ticketId");
    expect(required).toContain("to");
    expect(required).toContain("subject");
  });
});
