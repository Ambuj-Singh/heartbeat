function FilterBar({ title, subtitle, children, badge = null }) {
  return (
    <section className="panel filter-panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-subtitle">{subtitle}</p>
        </div>
        {badge ? <div className="panel-badge">{badge}</div> : null}
      </div>
      <div className="filter-row">{children}</div>
    </section>
  );
}

export default FilterBar;
