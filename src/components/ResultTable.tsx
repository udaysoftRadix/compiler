interface ResultTableProps {
  columns: string[];
  rows: unknown[][];
}

function Cell({ value }: { value: unknown }) {
  if (value === null) return <span className="sql-null">NULL</span>;
  if (value instanceof Uint8Array) return <span className="sql-null">{`<blob ${value.length} bytes>`}</span>;
  return <>{String(value)}</>;
}

export function ResultTable({ columns, rows }: ResultTableProps) {
  return (
    <div className="sql-table-wrap">
      <table className="sql-table">
        <thead>
          <tr>
            {columns.map((name, i) => (
              <th key={i}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((value, c) => (
                <td key={c}>
                  <Cell value={value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
