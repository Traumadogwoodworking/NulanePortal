### Support Ticket Backend Plan

This document outlines the recommended backend contract for a support ticket system.

#### `support_tickets` Table

| Column | Type | Description |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Foreign key to the `organizations` table. |
| `submitted_by_user_id` | `uuid` | Foreign key to the `users` table. |
| `subject` | `text` | The subject of the ticket. |
| `description` | `text` | The full description of the issue. |
| `priority` | `enum('low', 'medium', 'high')` | The priority of the ticket. |
| `status` | `enum('open', 'in_progress', 'closed')` | The status of the ticket. |
| `attachments` | `jsonb` | Optional: JSON array of attachment URLs. |
| `created_at` | `timestamp` | The timestamp when the ticket was created. |
| `updated_at` | `timestamp` | The timestamp when the ticket was last updated. |

#### API Endpoints

- **`GET /api/support/tickets`**
  - Returns a list of all support tickets for the current user's organization.
  - Supports filtering by `status` and `priority`.

- **`POST /api/support/tickets`**
  - Creates a new support ticket.
  - Expects `subject`, `description`, and `priority` in the request body.

- **`GET /api/support/tickets/:id`**
  - Returns the details of a specific support ticket.

- **`PATCH /api/support/tickets/:id`**
  - Updates the status or priority of a specific support ticket.
  - Only allowed for admins.
