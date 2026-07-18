import { AuthSignInPage } from "@/components/auth/auth-page-layout";

export default function DoctorSignInPage() {
  return (
    <AuthSignInPage
      role="doctor"
      title="مرحباً بعودتك"
      subtitle="سجّل دخولك للوصول إلى لوحة الطبيب"
      alternateHref="/auth/signup"
      alternateLabel="ليس لديك حساب؟ أنشئ حساباً مجاناً"
      footerLinks={[
        { href: "/auth/login/secretary", label: "دخول السكرتير" },
      ]}
    />
  );
}
