import { AuthSignInPage } from "@/components/auth/auth-page-layout";

export default function AdminSignInPage() {
  return (
    <AuthSignInPage
      role="admin"
      title="لوحة الإدارة"
      subtitle="دخول المسؤولين فقط"
      alternateHref="/auth/signin"
      alternateLabel="العودة لدخول الطبيب"
    />
  );
}
