/** Asset-independent integration point; no placeholder sound or gameplay mutation. */
export function emitUiCue(
  name: 'action' | 'save' | 'navigation',
  muted = false,
) {
  if (!muted && typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent('juju:ui-cue', { detail: { name } }));
}
