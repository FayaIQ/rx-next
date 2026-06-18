import { AuthSignInPage } from "@/components/auth/auth-page-layout";

export default function SecretarySignInPage() {
  return (
    <AuthSignInPage
      role="secretary"
      title="دخول السكرتير"
      subtitle="أدخل بيانات حسابك المرتبط بالطبيب"
      alternateHref="/auth/register/secretary"
      alternateLabel="ليس لديك حساب؟ سجّل الآن"
      footerLinks={[{ href: "/auth/signin", label: "دخول الطبيب" }]}
    />
  );
}
