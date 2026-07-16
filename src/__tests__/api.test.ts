import { describe, it, expect } from "vitest";
import {
  badRequest,
  unauthorized,
  ok,
  created,
} from "@/lib/api";

describe("api — Responses HTTP", () => {
  it("unauthorized retourne 401", () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
  });

  it("badRequest retourne 400 avec le message", async () => {
    const res = badRequest("Champ manquant");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Champ manquant");
  });

  it("ok retourne 200 avec les données", async () => {
    const data = { name: "Test" };
    const res = ok(data);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Test");
  });

  it("created retourne 201 avec les données", async () => {
    const data = { id: 1 };
    const res = created(data);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(1);
  });
});
