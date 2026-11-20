# Test Plan

1. Open the application and log in as ADMIN.
2. Confirm the dashboard initially shows zero events and zero incidents.
3. Create an incident.
4. Add an investigation note to that incident.
5. Confirm the dashboard note and incident counts update.
6. Import an approved JSON dataset as ADMIN.
7. Confirm the imported records appear in Audit Events.
8. Log out and test an ANALYST account.
9. Confirm ANALYST cannot use the import API.
10. In MySQL Workbench, inspect tables, view, procedure, roles, and grants.