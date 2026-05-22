# Portal User Password Reset

Backend dependency:
- `d8e3f11`

Frontend integration:
- UI location: `src/app/users/page.tsx`
- Action component: `src/components/users/ResetPasswordDialog.tsx`
- Service helper: `resetUserPassword()` in `src/lib/services/usersService.ts`
- Endpoint: `POST /api/admin/organizations/:organizationId/users/:userId/password-reset`

Request shape:
```json
{
  "reason": "Portal admin requested password reset"
}
```

Success shape:
```json
{
  "ok": true,
  "message": "If the account is eligible, a password reset email has been sent."
}
```

Visibility and eligibility:
- Show only for selected users with an email address.
- Hide for users that are inactive, deleted, or disabled when those states are present.
- Hide for users that expose a non-database identity/provider or other non-resettable identity metadata.
- Keep the action scoped to the current portal organization context.

Error handling:
- `429 PASSWORD_RESET_RATE_LIMITED` shows `Too many password reset requests. Try again later.`
- `403 forbidden` shows `You do not have permission to send password reset emails.`
- `404 User not found` shows `User not found.`
- `400 User email is required` shows `User email is required.`
- `400 User is not eligible for password reset` shows `User is not eligible for password reset.`
- `503 PASSWORD_RESET_UNAVAILABLE` shows `Password reset emails are temporarily unavailable.`
- `502 PASSWORD_RESET_FAILED` shows `Password reset email request failed.`
- Unknown failures show `Could not send password reset email.`

UX behavior:
- Clicking `Send reset email` opens a confirmation dialog.
- Confirming sends the backend request and disables the action while pending.
- Success closes the dialog and surfaces `Password reset email request sent.`
