### Portal Admin Wiring - To Do

This document outlines incomplete admin-related features and their current status, requiring further backend integration and frontend implementation.

- **Invite Users Modal:** The modal in the Users page (`/users`) is currently incomplete and/or transparent. It is not fully wired to backend endpoints for inviting new users.
- **Organizations Page (`/organizations`):** The functionality for managing organizations is not yet complete.
- **Settings Page (`/settings`):** The settings functionality is not complete or persistent. Changes made here may not be saved or fully reflected.
- **Support Tickets Backend:** The backend for support tickets is not yet implemented.
- **User-Facility Assignment UI:** The UI for assigning users to facilities lacks real endpoint validation and write contracts.
- **Facility Create/Edit Controls:** Controls for creating and editing facilities are not fully wired to backend write contracts.
- **Frontend Error Capture Backend Endpoint:** The backend endpoint for capturing frontend errors is still pending implementation.
- **Damage Reports Data Source:** Damage reports (`/reports/damage`) must continue to use the dedicated `/report/pull` endpoint. They should NOT fetch data from admin organization endpoints.
- **No Fake Data:** Frontend components should not rely on fake data; all data displayed must originate from the backend.
