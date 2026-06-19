interface Meta { page: number; pages: number; total: number; }
interface Props { meta: Meta; onPage: (page: number) => void; }

export function Pagination({ meta, onPage }: Props) {
  if (meta.pages <= 1) return null;
  const pages = Array.from({ length: meta.pages }, (_, i) => i + 1);
  return (
    <div className="pagination">
      <button className="pagination-btn" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>← Prev</button>
      {pages.map((p) => (
        <button key={p} className={`pagination-btn${p === meta.page ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button className="pagination-btn" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next →</button>
      <span className="pagination-info">{meta.total} total</span>
    </div>
  );
}
