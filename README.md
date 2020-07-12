# Approve Pages (Confluence)

## Inspiration

It can be challenging to track different versions and approvals of company documents. For many businesses, this is required by regulatory and it's often done via email. This however, has some major disadvantages:

- No history of document changes is available
- Approval flow e.g. Draft -> Review -> Approved/Rejected cannot be easily enforced
- Statistical analysis of approvals is impractical or impossible (e.g. answering: "How long did it take to go from draft to approved 95% of the time?" is not a simple task)

By using Approve Pages for Confluence all of the above are not only possible but also simple to implement with just existing Confluence and Jira subscription.

## What it does

Approve Pages let's editors submit version of a Confluence page for review by approvers. Jira issue is created for each submitted version for review. Depending on Jira workflow, approvers may approve changes, reject them or anything in between. Different business may define Jira worklow that suits their own approval process.

## How I built it

Approve Pages is build on the new [Atlassian Forge](https://www.atlassian.com/forge) - trusted, scalable platform with Atlassian-hosted compute and storage, eliminating the need to manage infrastructure or security. Your Confluence pages or any information about them will never leave your existing Confluence and Jira subscriptions.


## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start

- Build and deploy the app by running:
```
forge deploy
```

- Install the app in an Atlassian site by running:
```
forge install
```

- Develop the app by running `forge tunnel` to proxy invocations locally:
```
forge tunnel
```

### Notes
- Use the `forge deploy` command when you want to persist code changes.
- Use the `forge install` command when you want to install the app on a new site.
- Once the app is installed on a site, the site picks up the new app changes you deploy without needing to rerun the install command.

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.
