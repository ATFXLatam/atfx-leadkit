import { z } from "zod";

function emptyArrayAsObject(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 0) {
    return {};
  }
  return value;
}

const fieldErrorsSchema = z.preprocess(emptyArrayAsObject, z.record(z.string(), z.string()));

const responseDataPayloadSchema = z.preprocess(
  emptyArrayAsObject,
  z.object({
    aanumber: z.string().optional(),
    redirect_url: z.string().optional(),
    usertype: z.string().optional(),
  }),
);

const responseDataSchema = z.preprocess(
  emptyArrayAsObject,
  z.object({
    message: z.string().optional(),
    errors: fieldErrorsSchema.optional(),
    data: responseDataPayloadSchema.optional(),
  }),
);

const elementorResponseSchema = z.object({
  success: z.boolean(),
  data: responseDataSchema,
});

export type ElementorResponse = z.infer<typeof elementorResponseSchema>;

export function parseElementorResponse(body: unknown): ElementorResponse | null {
  const parsed = elementorResponseSchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
