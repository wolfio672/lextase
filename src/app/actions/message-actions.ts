"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canMessage } from "@/lib/messaging";

export type SimpleActionState = { error?: string } | null;

const contentSchema = z.string().trim().min(1, "Le message ne peut pas être vide").max(2000);

export async function sendMessageAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireUser();
  const recipientUsername = String(formData.get("recipientUsername") ?? "").trim().toLowerCase();

  const parsed = contentSchema.safeParse(formData.get("content"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Message invalide" };

  const recipient = await db.user.findUnique({ where: { username: recipientUsername } });
  if (!recipient || recipient.isBanned) return { error: "Destinataire introuvable" };
  if (recipient.id === user.id) return { error: "Tu ne peux pas t'envoyer un message à toi-même" };

  const allowed = await canMessage(user.id, recipient.id);
  if (!allowed) return { error: "Vous devez être abonné·e pour démarrer une conversation" };

  await db.message.create({
    data: { senderId: user.id, recipientId: recipient.id, content: parsed.data },
  });

  revalidatePath(`/messages/${recipient.username}`);
  revalidatePath("/messages");
  return null;
}
