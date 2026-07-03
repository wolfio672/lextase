import { requireUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/ProfileForm";
import { ImageUploadForm } from "@/components/ImageUploadForm";
import { PaymentActionButton } from "@/components/PaymentActionButton";
import { SubscriptionPriceForm } from "@/components/SubscriptionPriceForm";
import { createBillingPortalAction } from "@/app/actions/subscription-actions";
import { PAYMENT_CURRENCY } from "@/lib/stripe";
import {
  updateAvatarAction,
  updateBannerAction,
  removeAvatarAction,
  removeBannerAction,
} from "@/app/actions/profile-actions";

export default async function SettingsProfilePage() {
  const sessionUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <div className="space-y-6">
      {hasRole(user, "CREATOR") ? (
        <div className="glass-card max-w-xl p-8">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl italic">Monétisation</h2>
          <SubscriptionPriceForm currentPriceCents={user.subscriptionPriceCents} currency={PAYMENT_CURRENCY} />
        </div>
      ) : null}
      {user.stripeCustomerId ? (
        <div className="glass-card max-w-xl p-8">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl italic">Facturation</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            Gère tes abonnements payants à des créateurs·rices, ta carte enregistrée et tes factures.
          </p>
          <PaymentActionButton action={createBillingPortalAction} variant="ghost" size="sm">
            Gérer mes abonnements / ma carte
          </PaymentActionButton>
        </div>
      ) : null}
      <div className="glass-card max-w-xl space-y-8 p-8">
        <ImageUploadForm
          action={updateBannerAction}
          removeAction={removeBannerAction}
          fieldName="banner"
          currentUrl={user.bannerUrl}
          shape="banner"
          label="Bannière"
        />
        <ImageUploadForm
          action={updateAvatarAction}
          removeAction={removeAvatarAction}
          fieldName="avatar"
          currentUrl={user.avatarUrl}
          shape="avatar"
          label="Photo de profil"
        />
      </div>
      <div className="glass-card max-w-xl p-8">
        <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl italic">Profil</h1>
        <ProfileForm displayName={user.displayName} bio={user.bio} />
      </div>
    </div>
  );
}
