// Simpel "kommer snart"-side til nav-punkter der endnu ikke er bygget.
export default function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">{description}</p>
        <p className="mt-2 text-xs text-neutral-400">Under udvikling 🚧</p>
      </div>
    </div>
  );
}
