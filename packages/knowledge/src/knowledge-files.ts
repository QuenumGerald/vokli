import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

import type { VapiKnowledgeProvider } from "../../core/dist/index.js";

import type { KnowledgeIssue } from "./knowledge-types.js";

export const SUPPORTED_KNOWLEDGE_EXTENSIONS = [
  ".doc",
  ".docx",
  ".md",
  ".pdf",
  ".txt",
] as const;

export interface KnowledgeDocument {
  readonly source: string;
  readonly absolutePath: string;
  readonly hash: string;
}

export async function inspectKnowledgeFiles(
  provider: VapiKnowledgeProvider,
  cwd: string,
): Promise<
  | { readonly success: true; readonly documents: readonly KnowledgeDocument[] }
  | { readonly success: false; readonly issues: readonly KnowledgeIssue[] }
> {
  const documents: KnowledgeDocument[] = [];
  const issues: KnowledgeIssue[] = [];
  const seenPaths = new Set<string>();

  for (const source of provider.sources) {
    const absolutePath = resolve(cwd, source);
    if (seenPaths.has(absolutePath)) {
      issues.push({
        path: source,
        code: "duplicate_source",
        message: "Knowledge sources must not reference the same file twice.",
      });
      continue;
    }
    seenPaths.add(absolutePath);

    const extension = extname(absolutePath).toLowerCase();
    if (!SUPPORTED_KNOWLEDGE_EXTENSIONS.some((value) => value === extension)) {
      issues.push({
        path: source,
        code: "unsupported_extension",
        message: `Supported extensions are: ${SUPPORTED_KNOWLEDGE_EXTENSIONS.join(", ")}.`,
      });
      continue;
    }

    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        issues.push({
          path: source,
          code: "not_a_file",
          message: "Knowledge source must reference a file.",
        });
        continue;
      }
      const content = await readFile(absolutePath);
      documents.push({
        source,
        absolutePath,
        hash: createHash("sha256").update(content).digest("hex"),
      });
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push({
          path: source,
          code: "file_not_found",
          message: "Knowledge source does not exist or cannot be accessed.",
        });
        continue;
      }
      throw error;
    }
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, documents };
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "EACCES")
  );
}
