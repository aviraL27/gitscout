import { Router, Request, Response } from "express";
import { z } from "zod";
import { emailService } from "../email/EmailService";

export const emailRouter = Router();

const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  senderName: z.string().optional(),
});

const SendBatchSchema = z.object({
  emails: z.array(
    z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
      candidateName: z.string().optional(),
      senderName: z.string().optional(),
    })
  ).min(1).max(50),
});

// ─── GET /api/email/status ───────────────────────────────────────────────────

emailRouter.get("/status", async (_req: Request, res: Response) => {
  const configured = emailService.isConfigured();
  const senderEmail = emailService.getSenderEmail();
  res.json({
    configured,
    senderEmail,
    provider: "gmail-smtp",
    dailyQuota: 500,
  });
});

// ─── POST /api/email/send ────────────────────────────────────────────────────

emailRouter.post("/send", async (req: Request, res: Response) => {
  const parsed = SendEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email payload", details: parsed.error.flatten() });
    return;
  }

  const result = await emailService.sendEmail({
    to: parsed.data.to,
    subject: parsed.data.subject,
    body: parsed.data.body,
    senderName: parsed.data.senderName ?? "Aviral",
  });

  if (!result.success) {
    res.status(500).json({ error: result.error ?? "Failed to send email" });
    return;
  }

  res.json({
    success: true,
    messageId: result.messageId,
    recipient: parsed.data.to,
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /api/email/send-batch ──────────────────────────────────────────────

emailRouter.post("/send-batch", async (req: Request, res: Response) => {
  const parsed = SendBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid batch payload", details: parsed.error.flatten() });
    return;
  }

  const results: Array<{ to: string; success: boolean; messageId?: string; error?: string }> = [];

  for (const item of parsed.data.emails) {
    const resItem = await emailService.sendEmail({
      to: item.to,
      subject: item.subject,
      body: item.body,
      senderName: item.senderName ?? "Aviral",
    });

    results.push({
      to: item.to,
      success: resItem.success,
      messageId: resItem.messageId,
      error: resItem.error,
    });

    // Small delay between emails to respect SMTP pacing
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const sentCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  res.json({
    total: results.length,
    sentCount,
    failedCount,
    results,
  });
});
