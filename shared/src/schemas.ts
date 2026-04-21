import { z } from 'zod';

export const CreateBallotSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  isSecret: z.boolean(),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  options: z.array(z.object({ label: z.string().min(1), orderIndex: z.number().int() })).min(2),
});

export const CastVoteSchema = z.object({
  optionId: z.string().uuid(),
});

export const CastProxyVoteSchema = z.object({
  principalId: z.string().uuid(),
  optionId: z.string().uuid(),
});

export const SetProxySchema = z.object({
  proxyId: z.string().uuid(),
});

export type CreateBallotInput = z.infer<typeof CreateBallotSchema>;
export type CastVoteInput = z.infer<typeof CastVoteSchema>;
export type CastProxyVoteInput = z.infer<typeof CastProxyVoteSchema>;
export type SetProxyInput = z.infer<typeof SetProxySchema>;
