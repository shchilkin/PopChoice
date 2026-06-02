import type {
  CatalogMovieDetailPersonCredit,
  CatalogMovieDetailTaxonomyItem,
} from '@pop-choice/shared';

export function TaxonomyList({
  emptyLabel,
  items,
}: {
  emptyLabel: string;
  items: CatalogMovieDetailTaxonomyItem[];
}) {
  if (items.length === 0) return <p className="empty">{emptyLabel}</p>;

  return (
    <div className="tag-list">
      {items.map((item) => (
        <span key={`${item.id}-${item.name}`} className="data-pill neutral">
          {item.name}
        </span>
      ))}
    </div>
  );
}

export function PeopleTable({
  emptyLabel,
  people,
}: {
  emptyLabel: string;
  people: CatalogMovieDetailPersonCredit[];
}) {
  if (people.length === 0) return <p className="empty">{emptyLabel}</p>;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>TMDB</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>
                <strong>{person.name}</strong>
                {person.characterName ? <div className="muted">{person.characterName}</div> : null}
              </td>
              <td>{person.job ?? person.role}</td>
              <td>{person.tmdbId ?? '-'}</td>
              <td>{person.billingOrder ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
