export function LoadingState({ message = "Loading..." }) {
  return <div className="empty-state">{message}</div>;
}

export function ErrorState({ message = "Something went wrong." }) {
  return <div className="empty-state empty-state-error">{message}</div>;
}

export function EmptyState({ message = "No data available." }) {
  return <div className="empty-state">{message}</div>;
}
