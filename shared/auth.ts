import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const email = z
  .string()
  .trim()
  .min(1, "Bitte gib deine E-Mail-Adresse ein.")
  .email("Bitte gib eine gültige E-Mail-Adresse ein.");

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Das Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`)
  .max(PASSWORD_MAX_LENGTH, `Das Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen haben.`);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Bitte gib dein Passwort ein."),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bitte gib deinen Namen ein.")
    .max(100, "Der Name darf höchstens 100 Zeichen haben."),
  email,
  password: newPassword,
});

export const requestPasswordResetSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
