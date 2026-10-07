import nodemailer from "nodemailer";

import type { AppConfig } from "../config";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type Mailer = {
  send(message: MailMessage): Promise<void>;
};

type MailerConfig = Pick<
  AppConfig,
  "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASSWORD" | "MAIL_FROM"
>;

export function createMailer(config: MailerConfig): Mailer {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    // Port 465 speaks TLS from the first byte; other ports upgrade via STARTTLS when offered.
    secure: config.SMTP_PORT === 465,
    ...(config.SMTP_USER !== undefined &&
      config.SMTP_PASSWORD !== undefined && {
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
      }),
  });

  return {
    async send({ to, subject, text }) {
      await transport.sendMail({ from: config.MAIL_FROM, to, subject, text });
    },
  };
}
