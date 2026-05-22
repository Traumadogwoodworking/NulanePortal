## Legacy Portal and Module Inventory

### Step 1: Control Plane Leakage

- `/settings` was incorrectly listed as a control route in `src/lib/controlRoutes.ts`. This has been fixed.
- All other client routes are correctly configured and do not leak into the Control Plane.

### Step 2: Legacy Portal Analysis

The legacy portal is a single `index.html` file that functions as a Single Page Application (SPA). It uses Bootstrap and custom CSS for styling, and Auth0 for authentication. The portal communicates with a backend API at `https://api.nulanesystems.com/api`.

The legacy portal contains the following modules:

- **Dashboard:** Displays a Power BI embed.
- **Reports:** Includes Damage Reports and RSA Reports with filtering, search, and export capabilities.
- **DocuDent:** An embedded application for vehicle damage inspection.
- **DocuFit:** A module for the DocuFit system, showing health status and endpoints.
- **Settings:** Allows users to customize theme, font size, and color blindness mode, and to delete their account.
- **Administration:** A comprehensive set of tools for managing users, roles, facilities, notifications, and branding.

### Step 3: Current Module Inventory and Implementation Map

This is the inventory of the current Next.js portal modules and a recommended implementation map.

**Dashboard**
- **Current State:** Displays a Power BI embed. This is a good implementation.
- **Recommendation:** No changes needed.

**Damage Reports**
- **Current State:** Displays a list of damage reports with filtering and search. It is missing the edit functionality from the legacy portal.
- **Recommendation:** Implement the report editing functionality.

**RSA Reports**
- **Current State:** Displays RSA reports with filtering and search. The layout could be improved.
- **Recommendation:** Improve the layout and user experience.

**DocuDent**
- **Current State:** A web-native workflow for vehicle damage inspection.
- **Recommendation:** No changes needed.

**DocuFit**
- **Current State:** A desktop-native view of the mobile Valad Fit pipeline.
- **Recommendation:** No changes needed.

**Organizations**
- **Current State:** Displays information about the current organization only.
- **Recommendation:** Implement a backend service to fetch and manage all organizations.

**Facilities**
- **Current State:** Displays a list of facilities and their details.
- **Recommendation:** Implement a backend service to create and update facilities.

**Users**
- **Current State:** Displays a list of users and their details.
- **Recommendation:** Implement a backend service to create and update users and their roles.

**Support Tickets**
- **Current State:** A page with a link to a support form.
- **Recommendation:** Implement a full-fledged ticket system with a backend.

**Settings**
- **Current State:** Displays session and environment information.
- **Recommendation:** No changes needed.

### Step 4: Role Semantics and Relationships

The current role semantics (`super_admin`, `org_admin`, `admin`, `user`) are correctly implemented. The relationships between users, organizations, and facilities are partially implemented on the frontend, but require backend support for full functionality.

### Step 5: Missing Features

The following features from the legacy portal are missing in the new portal:

- **Email list management.**
- **Access management (roles and permissions).**

This inventory provides a clear picture of the current state of the portal and the work that needs to be done to achieve feature parity with the legacy portal and beyond.
