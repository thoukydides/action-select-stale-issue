// GitHub action
// Copyright © 2026 Alexander Thoukydides

import { context } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import * as core from '@actions/core';
import { plural } from './utils.js';

// GitHub REST API type
export type Issue = RestEndpointMethodTypes['issues']['get']['response']['data'];
export type IssueTimelineEventRaw = RestEndpointMethodTypes['issues']['listEventsForTimeline']['response']['data'][number];
export type IssueTimelineEvent = Extract<IssueTimelineEventRaw, { created_at: unknown }>;
export type IssueWithTimeline = Issue & { timeline: IssueTimelineEvent[] };

// Retrieve all open issues (or just the specified issue)
export async function getOpenIssues(github: InstanceType<typeof GitHub>, issue_number?: number): Promise<IssueWithTimeline[]> {
    // Retrieve either a specific issue or all open issues in the repository
    const issues = issue_number ? [await getIssue(github, issue_number)] : await getAllOpenIssues(github);

    // Retrieve the timeline for each issue
    const issuesWithTimeline: IssueWithTimeline[] = [];
    for (const issue of issues) {
        const timeline = await getIssueTimeline(github, issue.number);
        issuesWithTimeline.push({ ...issue, timeline });
    }
    return issuesWithTimeline;
}

// Retrieve all open issues
async function getAllOpenIssues(github: InstanceType<typeof GitHub>): Promise<Issue[]> {
    // Retrieve all open issues in the repository (least recently updated first)
    const issuesAndPRs = await github.paginate(github.rest.issues.listForRepo, {
        ...context.repo, per_page: 100, state: 'open', sort: 'updated', direction: 'asc'
    });

    // Exclude pull requests
    const issues = issuesAndPRs.filter(i => !i.pull_request);
    core.info(`Retrieved ${plural(issues.length, 'open issue')}`);
    core.debug(`REST API Open Issues:\n${JSON.stringify(issues, null, 4)}`);
    return issues;
}

// Retrieve a specific issue by number
async function getIssue(github: InstanceType<typeof GitHub>, issue_number: number): Promise<Issue> {
    // Attempt to retrieve the specified issue
    const issue = (await github.rest.issues.get({ ...context.repo, issue_number })).data;
    core.info(`Retrieved issue #${issue_number}: ${issue.title}`);
    core.debug(`REST API Issue:\n${JSON.stringify(issue, null, 4)}`);

    // Check that it is open and not a pull request
    if (issue.state !== 'open') throw new Error(`Issue #${issue_number} is not open`);
    if (issue.pull_request) throw new Error(`Issue #${issue_number} is a pull request`);
    return issue;
}

// Retrieve the timeline for an issue
export async function getIssueTimeline(github: InstanceType<typeof GitHub>, issue_number: number): Promise<IssueTimelineEvent[]> {
    // Retrieve the timeline for the specified issue (oldest first)
    const timeline = await github.paginate(github.rest.issues.listEventsForTimeline, {
        ...context.repo, issue_number, per_page: 100
    });
    core.info(`Retrieved ${plural(timeline.length, 'timeline entry')} for issue #${issue_number}`);
    core.debug(`REST API Timeline:\n${JSON.stringify(timeline, null, 4)}`);

    // Only return events that have a creation date
    return timeline.filter((event): event is IssueTimelineEvent => 'created_at' in event);
}