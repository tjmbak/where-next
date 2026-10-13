export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto w-full max-w-[1180px] px-6 pb-24 pt-24 sm:px-10">
      <div className="wn-skeleton h-3 w-40 rounded-full" />
      <div className="wn-skeleton mt-6 h-14 w-full max-w-xl rounded-2xl" />
      <div className="wn-skeleton mt-4 h-4 w-full max-w-md rounded-full" />
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="wn-skeleton h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
