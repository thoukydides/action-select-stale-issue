# `action-select-stale-issue`

This action identifies (but does not modify) open issues that have not had any recent activity (non-bot comment, removal/addition of the `stale` label, or reopened).

> [!TIP]
> Each invocation of this action selects a maximum of one issue to be labelled as stale, and one issue to be closed; schedule it sufficiently frequently for the expected number of stale issues.

> [!CAUTION]
> This action is provided for my own use and published in case it is useful to others. If you rely on it, fork and maintain your own copy. No support or stability guarantees are offered.

## Prerequisites

Before using this workflow, ensure:
- The workflow has `issues: read` permissions (either via the default `GITHUB_TOKEN` or a fine-grained token).

## Inputs

Various inputs are defined in the action to configure its operation:

| Name | Description | Default
| --- | --- | ---
| `days_before_stale` | The number of days since the last relevant activity on a non-stale issue before it is considered stale | `14`
| `days_before_close` | The number of days since the last relevant activity on a stale issue before it is closed | `7`
| `stale_issue_label` | The label applied to stale issues | `'stale'`
| `issue_number` |The GitHub issue to treat as stale; if not provided, a stale issue is selected based on the number of days since last update | &nbsp;
| `github_token` | The GitHub token used to create an authenticated client | `${{ github.token }}`

## Outputs

The action provides the following outputs:

| Name | Description
| --- | ---
| `stale_issue_number` | An issue that should be labelled as stale, if any
| `close_issue_number` | An issue that should be closed, if any

## Usage

Example workflow to check for stale issues every hour:

```yaml
name: AI Stale Issue Triage
permissions:
  issues: write
concurrency:
  group: triage-stale
  cancel-in-progress: false

on:
  schedule:
  - cron: '10 * * * *'
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number'
        required: false
        type: number
      dry_run:
        description: 'Dry run (do not modify issue)'
        type: boolean
        default: true

jobs:
  stale:
    runs-on: ubuntu-latest

    steps:

    - name: Select stale issue
      id: select
      uses: thoukydides/action-select-stale-issue@v1
      with:
        days_before_stale: 14
        days_before_close: 7
        stale_issue_label: 'stale'
        issue_number: ${{ fromJson(inputs.issue_number) }}

    - name: Label stale issue
      if: ${{ steps.select.outputs.stale_issue_number != '' }}
      uses: thoukydides/action-post-issue-comment@v1
      with:
        issue_number: ${{ steps.select.outputs.stale_issue_number }}
        body: 'This issue is stale because it has been open 14 days with no activity. Remove stale label or comment or this will be closed in 7 days.'
        marker: '<!-- triage-stale-issue -->'
        labels_add: '["stale"]'
        dry_run: ${{ inputs.dry_run }}

    - name: Close stale issue
      if: ${{ steps.select.outputs.close_issue_number != '' }}
      uses: thoukydides/action-post-issue-comment@v1
      with:
        issue_number: ${{ steps.select.outputs.close_issue_number }}
        body: 'This issue was closed because it has been stalled for 7 days with no activity.'
        marker: '<!-- triage-stale-issue -->'
        close_issue: true
        dry_run: ${{ inputs.dry_run }}
```

## ISC License (ISC)

<details>
<summary>Copyright © 2026 Alexander Thoukydides</summary>

> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
</details>