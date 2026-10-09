import "server-only";

// No compliant deployment has been approved. An environment flag cannot lift this gate.
// Replace only after documenting provider eligibility, region, model and paid-tier decisions.
export const GEMINI_DEPLOYMENT_APPROVAL: string | null = null;
// The eligibility record must also verify audio, JSON Schema, region and supported MIME types for this model.
export const GEMINI_APPROVED_MODEL: string | null = null;
