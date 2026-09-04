import { RESOURCE_LABELS, type ActionFeedback } from '@/game/action-feedback';
export function ChangeLines({
  changes,
}: {
  changes: ActionFeedback['changes'];
}) {
  return (
    <dl className="change-lines">
      {changes.map((c) => (
        <div key={c.resource}>
          <dt>{RESOURCE_LABELS[c.resource] ?? c.resource}</dt>
          <dd>
            {c.before} → {c.after}{' '}
            <b>
              {c.after > c.before ? '+' : ''}
              {c.after - c.before}
            </b>
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function ResourceChangeToast({
  feedback,
}: {
  feedback: ActionFeedback | null;
}) {
  if (!feedback) return null;
  return (
    <aside className="resource-change-toast" role="status" aria-live="polite">
      <strong>{feedback.title}</strong>
      <ChangeLines changes={feedback.changes} />
      {feedback.effects.map((text, index) => (
        <p key={index}>{text}</p>
      ))}
    </aside>
  );
}
