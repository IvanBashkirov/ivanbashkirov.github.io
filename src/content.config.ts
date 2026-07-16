import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/docs' }),
  schema: z.object({
    title: z.string(),
    ref: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['essay', 'thought', 'tune']),
    minutes: z.number().optional(),
    standfirst: z.string().optional(),
    hidden: z.boolean().default(false),
  }),
});

export const collections = { docs };
