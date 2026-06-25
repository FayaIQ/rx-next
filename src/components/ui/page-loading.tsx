import { Skeleton } from "@/components/ui/skeleton";
import { PageContent } from "@/components/ui/page-shell";

export function PageLoadingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-rx-border bg-rx-surface/95 backdrop-blur-sm">
      <div className="flex h-[var(--rx-header-height)] items-center justify-between gap-4 px-4 lg:px-6">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-44 max-w-[60vw]" />
          <Skeleton className="h-3 w-28 max-w-[40vw]" />
        </div>
        <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
      </div>
    </header>
  );
}

function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-10 w-32 rounded-xl" />}
    </div>
  );
}

function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-rx-border/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="hidden h-4 w-24 lg:block" />
          <div className="mr-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TablePageLoading({
  withSearch = true,
  rows = 6,
}: {
  withSearch?: boolean;
  rows?: number;
}) {
  return (
    <>
      <PageLoadingHeader />
      <PageContent>
        <PageHeaderSkeleton />
        {withSearch && <Skeleton className="mb-6 h-10 max-w-md rounded-xl" />}
        <div className="overflow-hidden rounded-2xl border border-rx-border bg-rx-surface">
          <div className="border-b border-rx-border px-5 py-3.5">
            <div className="flex gap-8">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <TableRowsSkeleton rows={rows} />
        </div>
      </PageContent>
    </>
  );
}

export function CardsPageLoading({ cards = 4 }: { cards?: number }) {
  return (
    <>
      <PageLoadingHeader />
      <PageContent className="space-y-6">
        <PageHeaderSkeleton />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-rx-border bg-rx-surface">
          <div className="divide-y divide-rx-border/60">
            {Array.from({ length: cards }).map((_, i) => (
              <div key={i} className="space-y-2 p-5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-8 w-24 rounded-xl" />
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageContent>
    </>
  );
}

export function PatientRecordPageLoading() {
  return (
    <>
      <PageLoadingHeader />
      <PageContent className="space-y-6">
        <Skeleton className="h-8 w-28 rounded-xl" />
        <PageHeaderSkeleton withAction={false} />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-rx-border bg-rx-surface p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-52" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-14 rounded-xl" />
                  <Skeleton className="h-8 w-16 rounded-xl" />
                </div>
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </PageContent>
    </>
  );
}

export function CalendarPageLoading() {
  return (
    <>
      <PageLoadingHeader />
      <PageContent className="space-y-4">
        <div className="space-y-4 rounded-2xl border border-rx-border bg-rx-surface p-4">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-rx-border bg-rx-surface">
          <div className="flex items-center justify-between border-b border-rx-border px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2 p-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </PageContent>
    </>
  );
}

export function ComposerPageLoading() {
  return (
    <>
      <PageLoadingHeader />
      <PageContent className="space-y-6 pb-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <div className="grid gap-2 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-14" />
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="min-h-[28rem] w-full rounded-2xl" />
        </div>
      </PageContent>
    </>
  );
}

export function RecipeDesignerPageLoading() {
  return (
    <>
      <PageLoadingHeader />
      <PageContent wide className="space-y-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="min-h-[32rem] w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </PageContent>
    </>
  );
}

export function DashboardPageLoading() {
  return (
    <>
      <PageLoadingHeader />
      <PageContent className="space-y-6">
        <PageHeaderSkeleton withAction={false} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-rx-border bg-rx-surface p-5"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-rx-border bg-rx-surface p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </PageContent>
    </>
  );
}

export function DetailPageLoading() {
  return (
    <>
      <PageLoadingHeader />
      <PageContent className="space-y-6">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-rx-border bg-rx-surface p-6 lg:col-span-1">
            <Skeleton className="mx-auto h-20 w-20 rounded-full" />
            <Skeleton className="mx-auto h-5 w-40" />
            <Skeleton className="mx-auto h-4 w-32" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-rx-border bg-rx-surface p-6">
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}

export function DocumentPageLoading() {
  return (
    <div className="min-h-screen bg-gray-100 p-4" dir="rtl">
      <div className="mx-auto mb-4 flex max-w-[210mm] gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mx-auto h-[297mm] max-w-[210mm] rounded-sm" />
    </div>
  );
}

export function FormPageLoading() {
  return (
    <>
      <PageLoadingHeader />
      <PageContent className="space-y-6">
        <PageHeaderSkeleton />
        <div className="space-y-6 rounded-2xl border border-rx-border bg-rx-surface p-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
        </div>
      </PageContent>
    </>
  );
}
