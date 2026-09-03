/**
 * Shared vocabulary for attendance exceptions.
 *
 * The three types were being spelled out separately everywhere they appeared,
 * and the queue was reduced to `replace(/_/g, ' ')` on the stored key — which
 * is how "late_arrival" reached a reviewer as "late arrival", lower case and
 * visibly machine-made.
 */
export const EXCEPTION_TYPE_LABEL: Record<string, string> = {
  late_arrival: 'Late arrival',
  early_departure: 'Early departure',
  out_of_office: 'Out of office',
}

/** The label for a stored type, falling back to a readable form of the key. */
export function exceptionTypeLabel(type: string): string {
  return EXCEPTION_TYPE_LABEL[type] ?? type.replace(/_/g, ' ')
}
