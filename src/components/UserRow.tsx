"use client";

import { useActionState, useState } from "react";
import {
  changeRoleAction,
  banUserAction,
  unbanUserAction,
  deleteUserAction,
  setVerifiedAction,
  grantSubscriptionAction,
  type SimpleActionState,
} from "@/app/actions/admin-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Role } from "@prisma/client";

const ROLE_OPTIONS: Role[] = ["USER", "CREATOR", "ADMIN", "FOUNDER"];

export function UserRow({
  id,
  username,
  displayName,
  email,
  role,
  isBanned,
  bannedReason,
  isVerified,
  canManageRole,
  canModerate,
  isFounderActor,
  isSelf,
  creators,
}: {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: Role;
  isBanned: boolean;
  bannedReason: string | null;
  isVerified: boolean;
  canManageRole: boolean;
  canModerate: boolean;
  isFounderActor: boolean;
  isSelf: boolean;
  creators: { username: string; displayName: string }[];
}) {
  const [roleState, roleAction] = useActionState<SimpleActionState, FormData>(changeRoleAction, null);
  const [banState, banAction] = useActionState<SimpleActionState, FormData>(banUserAction, null);
  const [unbanState, unbanAction] = useActionState<SimpleActionState, FormData>(unbanUserAction, null);
  const [deleteState, deleteAction] = useActionState<SimpleActionState, FormData>(deleteUserAction, null);
  const [verifiedState, verifiedAction] = useActionState<SimpleActionState, FormData>(setVerifiedAction, null);
  const [grantState, grantAction] = useActionState<SimpleActionState, FormData>(grantSubscriptionAction, null);
  const [showBanForm, setShowBanForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGrantForm, setShowGrantForm] = useState(false);

  const availableCreators = creators.filter((c) => c.username !== username);

  return (
    <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
      <td className="py-4 pr-4">
        <p className="flex items-center gap-1.5 font-semibold">
          {displayName}
          {isVerified ? <VerifiedBadge /> : null}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">@{username} · {email}</p>
        {isBanned ? (
          <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>Suspendu — {bannedReason}</p>
        ) : null}
      </td>
      <td className="py-4 pr-4">
        {isSelf || !canManageRole ? (
          <span className="badge-user">{role}</span>
        ) : (
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="userId" value={id} />
            <select name="role" defaultValue={role} className="field-input py-2 text-xs">
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <SubmitButton variant="ghost" className="px-3 py-2 text-xs" pendingLabel="…">
              Modifier
            </SubmitButton>
          </form>
        )}
        {roleState?.error ? <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>{roleState.error}</p> : null}
      </td>
      <td className="py-4 text-right">
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center justify-end gap-2">
            {isFounderActor && !isSelf && availableCreators.length > 0 ? (
              showGrantForm ? (
                <form action={grantAction} className="flex items-center justify-end gap-2">
                  <input type="hidden" name="userId" value={id} />
                  <select name="creatorUsername" required className="field-input py-2 text-xs">
                    {availableCreators.map((c) => (
                      <option key={c.username} value={c.username}>{c.displayName} (@{c.username})</option>
                    ))}
                  </select>
                  <SubmitButton variant="ghost" className="px-4 py-2 text-xs" pendingLabel="…">
                    Offrir
                  </SubmitButton>
                  <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => setShowGrantForm(false)}>
                    Annuler
                  </button>
                </form>
              ) : (
                <button type="button" className="btn-ghost px-4 py-2 text-xs" onClick={() => setShowGrantForm(true)}>
                  Offrir un abonnement
                </button>
              )
            ) : null}

            {isSelf || !canModerate ? null : (
              <>
                <form action={verifiedAction}>
                  <input type="hidden" name="userId" value={id} />
                  <input type="hidden" name="verified" value={(!isVerified).toString()} />
                  <SubmitButton variant="ghost" className="px-4 py-2 text-xs" pendingLabel="…">
                    {isVerified ? "Retirer la vérification" : "Vérifier"}
                  </SubmitButton>
                </form>

                {isBanned ? (
                  <form action={unbanAction}>
                    <input type="hidden" name="userId" value={id} />
                    <SubmitButton variant="ghost" className="px-4 py-2 text-xs" pendingLabel="…">
                      Réactiver
                    </SubmitButton>
                  </form>
                ) : showBanForm ? (
                  <form action={banAction} className="flex items-center justify-end gap-2">
                    <input type="hidden" name="userId" value={id} />
                    <input name="reason" placeholder="Motif" required className="field-input py-2 text-xs" />
                    <SubmitButton variant="danger" className="px-4 py-2 text-xs" pendingLabel="…">
                      Confirmer
                    </SubmitButton>
                  </form>
                ) : (
                  <button type="button" className="btn-danger px-4 py-2 text-xs" onClick={() => setShowBanForm(true)}>
                    Suspendre
                  </button>
                )}

                {showDeleteConfirm ? (
                  <form action={deleteAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={id} />
                    <span className="text-xs text-[var(--color-text-muted)]">Définitif —</span>
                    <SubmitButton variant="danger" className="px-4 py-2 text-xs" pendingLabel="…">
                      Confirmer
                    </SubmitButton>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-2 text-xs"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Annuler
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost px-4 py-2 text-xs"
                    style={{ color: "var(--color-danger)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Supprimer
                  </button>
                )}
              </>
            )}
          </div>
          {grantState?.error ? <p className="text-xs" style={{ color: "var(--color-danger)" }}>{grantState.error}</p> : null}
          {verifiedState?.error ? <p className="text-xs" style={{ color: "var(--color-danger)" }}>{verifiedState.error}</p> : null}
          {banState?.error ? <p className="text-xs" style={{ color: "var(--color-danger)" }}>{banState.error}</p> : null}
          {unbanState?.error ? <p className="text-xs" style={{ color: "var(--color-danger)" }}>{unbanState.error}</p> : null}
          {deleteState?.error ? <p className="text-xs" style={{ color: "var(--color-danger)" }}>{deleteState.error}</p> : null}
        </div>
      </td>
    </tr>
  );
}
