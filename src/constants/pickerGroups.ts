/**
 * The headings a picker splits its options under.
 *
 * Two halves, always the same question: is this one already part of the work,
 * or does picking it add it? The service, assignee and reviewer pickers on a
 * task all offer that second half — a service the project does not run yet, a
 * person not staffed on the block — and a flat list gave no sign that some rows
 * quietly do more than others.
 *
 * Services belong to a project; people are staffed onto one of its services, so
 * the wording differs on purpose. Somebody can be on the project through Design
 * and still be new to Development.
 */
export const IN_PROJECT = 'Added to this project'
export const NOT_IN_PROJECT = 'Not added to this project'
export const ON_SERVICE = 'Added to this service'
export const NOT_ON_SERVICE = 'Not added to this service'
