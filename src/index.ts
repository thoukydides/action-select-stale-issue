// GitHub action
// Copyright © 2026 Alexander Thoukydides

import { getOctokit } from '@actions/github';
import * as core from '@actions/core';
import { getOpenIssues, Issue, IssueTimelineEvent, IssueWithTimeline } from './get_open_issues.js';
import { formatList } from './utils.js';

// Script entry point
async function run() {
    // Action inputs
    const days_before_stale     = Number(core.getInput('days_before_stale', { required: true }));
    const days_before_close     = Number(core.getInput('days_before_close', { required: true }));
    const stale_issue_label     =        core.getInput('stale_issue_label', { required: true });
    const issue_number_string   =        core.getInput('issue_number',      { required: false });
    const issue_number = issue_number_string ? Number(issue_number_string) : undefined;
    const token                 =        core.getInput('github_token',      { required: true });

    // Create an authenticated GitHub client
    const github = getOctokit(token);

    // Retrieve a list of all open issues (or specified one) in the repository
    const issues = await getOpenIssues(github, issue_number);

    // Select the issues that are stale
    const stale_issues: number[] = [], close_issues: number[] = [];
    for (const issue of issues) {
        const staleDays = issueStaleDays(issue, stale_issue_label);
        core.info(`Issue #${issue.number} has been inactive for ${staleDays.toFixed(1)} days`);
        if (issueHasStaleLabel(issue, stale_issue_label)) {
            if (days_before_close <= staleDays || issue_number) close_issues.push(issue.number);
        } else {
            if (days_before_stale <= staleDays || issue_number) stale_issues.push(issue.number);
        }
    }
    const formatIssuesList = (numbers: number[]): string => formatList(numbers.map(n => `#${n}`));
    core.info(`Stale issues: ${formatIssuesList(stale_issues)}`);
    core.info(`Close issues: ${formatIssuesList(close_issues)}`);

    // Action outputs
    core.setOutput('stale_issue_number', stale_issues[0] ?? '');
    core.setOutput('close_issue_number', close_issues[0] ?? '');
}

// Check whether an issue is currently labeled as stale
function issueHasStaleLabel(issue: Issue, stale_issue_label: string): boolean {
    const labelName = (l: Issue['labels'][number]): string => typeof l === 'string' ? l : l.name ?? '';
    return issue.labels.some(l => labelName(l) === stale_issue_label);
}

// Determine the staleness of an issue
function issueStaleDays(issue: IssueWithTimeline, stale_issue_label: string): number {
    const lastEvent = issue.timeline.findLast(event => isActiveEvent(event, stale_issue_label));
    const lastEventDate = lastEvent?.created_at ?? issue.created_at;
    const age = Date.now() - new Date(lastEventDate).getTime();
    return age / (24 * 60 * 60 * 1000);
}

// Check whether a timeline event was created by a bot
function isBotEvent(event: IssueTimelineEvent): boolean {
    const user = 'user' in event ? event.user : 'actor' in event ? event.actor : undefined;
    if (!user) return false;
    return user.type === 'Bot' || user.login.endsWith('[bot]');
};

// Identify timeline events that are relevant to the staleness of an issue
function isActiveEvent(event: IssueTimelineEvent, stale_issue_label: string): boolean {
    switch (event.event) {
    case 'commented':
        return !isBotEvent(event);
    case 'reopened':
        return true;
    case 'labeled':
    case 'unlabeled':
        return 'label' in event && event.label.name === stale_issue_label;
    default:
        return false;
    }
}

// Run the script and handle errors
try {
    await run();
} catch (err: unknown) {
    core.setFailed(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    if (err instanceof Error && err.stack) core.debug(err.stack);
}