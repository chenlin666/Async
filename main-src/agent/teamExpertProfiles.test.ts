import { describe, expect, it } from 'vitest';

import { resolveTeamExpertProfiles } from './teamExpertProfiles.js';

describe('resolveTeamExpertProfiles', () => {
	it('keeps the researcher available as a specialist assignment target', () => {
		const resolved = resolveTeamExpertProfiles(
			{
				useDefaults: false,
				experts: [
					{
						id: 'lead',
						name: 'Team Lead',
						roleType: 'team_lead',
						assignmentKey: 'team_lead',
						systemPrompt: 'lead',
						enabled: true,
					},
					{
						id: 'researcher',
						name: 'Researcher',
						roleType: 'custom',
						assignmentKey: 'researcher',
						systemPrompt: 'research',
						enabled: true,
					},
					{
						id: 'frontend',
						name: 'Frontend',
						roleType: 'frontend',
						assignmentKey: 'frontend',
						systemPrompt: 'frontend',
						enabled: true,
					},
					{
						id: 'reviewer',
						name: 'Reviewer',
						roleType: 'reviewer',
						assignmentKey: 'reviewer',
						systemPrompt: 'reviewer',
						enabled: true,
					},
				],
			},
			[]
		);

		expect(resolved.teamLead?.assignmentKey).toBe('team_lead');
		expect(resolved.reviewer?.assignmentKey).toBe('reviewer');
		expect(resolved.specialists.map((expert) => expert.assignmentKey)).toEqual(['researcher', 'frontend']);
	});
});
