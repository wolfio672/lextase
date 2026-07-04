import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/feed");

  return <ForgotPasswordForm />;
}
