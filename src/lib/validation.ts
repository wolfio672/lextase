import { z } from "zod";

const usernameRegex = /^[a-z0-9_]{3,24}$/;

export const passwordSchema = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères")
  .max(128, "Le mot de passe est trop long")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[^a-zA-Z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(255),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(usernameRegex, "3 à 24 caractères : lettres minuscules, chiffres, underscore"),
  displayName: z.string().trim().min(1, "Nom d'affichage requis").max(50),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(255),
  password: z.string().min(1, "Mot de passe requis").max(128),
});

export const twoFactorTokenSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, "Le code doit contenir 6 chiffres");

export const recoveryCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/i, "Format de code de récupération invalide");

export const changeRoleSchema = z.object({
  userId: z.string().min(1).max(64),
  role: z.enum(["USER", "CREATOR", "ADMIN", "FOUNDER"]),
});

export const banUserSchema = z.object({
  userId: z.string().min(1).max(64),
  reason: z.string().trim().min(1).max(500),
});
