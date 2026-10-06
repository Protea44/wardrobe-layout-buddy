export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="site-container page-body">
      <h1 className="page-title">{title}</h1>
    </div>
  );
}
