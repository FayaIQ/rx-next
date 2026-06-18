export function SubscriptionBadge({
  subscription,
}: {
  subscription: {
    isActive: boolean;
    planType: string;
    endsAt: string;
    packageName?: string | null;
  } | null;
}) {
  if (!subscription) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        بدون اشتراك
      </span>
    );
  }

  const label = subscription.isActive
    ? subscription.planType === "trial"
      ? "تجربة"
      : subscription.packageName ?? "نشط"
    : "منتهي";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${
        subscription.isActive
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
      title={new Date(subscription.endsAt).toLocaleDateString("ar-SY")}
    >
      {label}
    </span>
  );
}
