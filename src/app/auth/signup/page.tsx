import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { AuthForm } from "@/components/auth/auth-form";

export default function DoctorSignUpPage() {
  return (
    <AuthPageLayout role="doctor">
      <AuthForm
        mode="signup"
        role="doctor"
        title="ابدأ تجربتك المجانية"
        subtitle="14 يوماً مجاناً — بدون بطاقة ائتمان"
        alternateHref="/auth/signin"
        alternateLabel="لديك حساب؟ سجّل الدخول"
      />
      <p className="mt-6 text-center text-xs text-rx-muted">
        بالتسجيل توافق على شروط الاستخدام وسياسة الخصوصية
      </p>
    </AuthPageLayout>
  );
}
