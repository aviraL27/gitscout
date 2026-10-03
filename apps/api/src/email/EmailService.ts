import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  senderName?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private user: string;
  private pass: string;

  constructor() {
    this.user = process.env.GMAIL_USER ?? "aviral270406@gmail.com";
    this.pass = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");

    if (this.user && this.pass) {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: this.user,
          pass: this.pass,
        },
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.user && this.pass && this.transporter);
  }

  getSenderEmail(): string {
    return this.user;
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (err) {
      console.error("[EmailService] Verification failed:", err);
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: "Gmail SMTP is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.",
      };
    }

    const { to, subject, body, senderName = "Aviral" } = options;

    if (!to || !to.includes("@")) {
      return {
        success: false,
        error: `Invalid recipient email address: "${to}"`,
      };
    }

    if (!subject.trim()) {
      return {
        success: false,
        error: "Subject line cannot be empty.",
      };
    }

    if (!body.trim()) {
      return {
        success: false,
        error: "Message body cannot be empty.",
      };
    }

    try {
      // Escape and format body as clean HTML paragraphs
      const htmlBody = body
        .split("\n\n")
        .map((p) => `<p style="margin:0 0 14px 0;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;font-size:15px;">${p.replace(/\n/g, "<br/>")}</p>`)
        .join("");

      const info = await this.transporter.sendMail({
        from: `"${senderName}" <${this.user}>`,
        to,
        subject,
        text: body,
        html: `<div style="max-width:600px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">${htmlBody}</div>`,
      });

      console.log(`[EmailService] Email successfully sent to ${to} (MessageId: ${info.messageId})`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EmailService] Failed to send email to ${to}:`, errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

export const emailService = new EmailService();
