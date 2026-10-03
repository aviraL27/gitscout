const envBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
export const API_BASE = envBase ? envBase.replace(/\/$/, "") : "/api";

export async function postSearch(body: {
  requirement: string;
  locationScope: string;
  languages?: string[];
  minRelevance?: number;
}): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getSearchJob(jobId: string) {
  const res = await fetch(`${API_BASE}/search/${jobId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

import type { Candidate } from "@gitscout/shared";

export async function postOutreach(
  jobId: string,
  username: string,
  body: { senderName: string; requirement: string; candidate?: Candidate }
) {
  const safeJobId = jobId || "latest";
  const res = await fetch(`${API_BASE}/search/${safeJobId}/outreach/${username}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ subject: string; body: string }>;
}

export async function sendEmail(payload: {
  to: string;
  subject: string;
  body: string;
  senderName?: string;
}): Promise<{ success: boolean; messageId: string; recipient: string; timestamp: string }> {
  const res = await fetch(`${API_BASE}/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function sendBatchEmails(payload: {
  emails: Array<{
    to: string;
    subject: string;
    body: string;
    candidateName?: string;
    senderName?: string;
  }>;
}): Promise<{ total: number; sentCount: number; failedCount: number; results: Array<{ to: string; success: boolean; error?: string }> }> {
  const res = await fetch(`${API_BASE}/email/send-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
