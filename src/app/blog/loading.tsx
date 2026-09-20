export default function BlogLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#F6F8F7]">
      <div className="h-18 border-b border-slate-100 bg-white" />
      <div className="h-72 bg-[#0B2C3D]" />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="h-[430px] rounded-[2rem] bg-slate-200" />
        <div className="mt-12 h-10 w-56 rounded-xl bg-slate-200" />
        <div className="mt-7 grid gap-6 md:grid-cols-2">
          <div className="h-96 rounded-[1.5rem] bg-white" />
          <div className="h-96 rounded-[1.5rem] bg-white" />
        </div>
      </div>
    </div>
  );
}
