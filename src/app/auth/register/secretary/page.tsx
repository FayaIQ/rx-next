import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { AuthForm } from "@/components/auth/auth-form";
import Link from "next/link";

export default function SecretaryRegisterPage() {
  return (
    <AuthPageLayout role="secretary">
      <AuthForm
        mode="signup"
        role="secretary"
        title="تسجيل سكرتير"
        subtitle="ستحتاج لرمز دعوة من الطبيب بعد التسجيل"
        alternateHref="/auth/login/secretary"
        alternateLabel="لديك حساب؟ سجّل الدخول"
      />
      <div className="mt-6 text-center text-sm text-rx-muted">
        <Link href="/auth/signin" className="text-rx-primary hover:underline">
          دخول الطبيب
        </Link>
      </div>
    </AuthPageLayout>
  );
}
