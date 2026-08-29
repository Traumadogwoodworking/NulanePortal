# DocuDent Review Plan

## Matt review boundary

- Serve the authenticated operational portal directly with no public landing page.
- Use the Nulane Systems shell and the existing DocuDent name and logo.
- Expose exactly Home, Damage Submissions, Support Tickets, and Settings.
- Use only verified DocuDent Auth0 and API configuration; do not hardcode an Auth0 organization.
- Keep unrelated inherited modules disabled through product configuration so they remain reusable.
- Run and deploy only from the isolated DocuDent worktree and development target.

## Stop condition

Stop after the connected iPhone and isolated development portal are ready for Matt's review. Android and generalized stack-template work remain out of scope.
