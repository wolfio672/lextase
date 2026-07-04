import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/feed");

  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
