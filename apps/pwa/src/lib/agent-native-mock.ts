export function defineAction<TInput, TOutput>(options: {
  description: string;
  schema: Record<string, unknown>;
  run: (input: TInput) => Promise<TOutput>;
}) {
  return {
    description: options.description,
    schema: options.schema,
    run: options.run,
  };
}
