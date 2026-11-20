
# SECURITY AND DATA INTEGRITY

## Authentication
The application should verify the identity of each user before allowing access to protected features.

## Authorization
At least two roles should be considered where relevant:

ADMIN
- Manage users.
- Access administrative features.
- Manage project data.

ANALYST
- View authorized audit events.
- Investigate incidents.
- Add investigation notes.
- Search event descriptions.

These permissions are proposed. Implement and test them in the actual application before claiming they work.

## Password security
- Never store plaintext passwords.
- Use a password-hashing algorithm such as bcrypt or Argon2id.
- Do not hard-code default administrator credentials.
- Do not display passwords in logs.

## Database security
- Use parameterized SQL queries.
- Use a least-privilege MySQL account.
- Keep credentials in environment variables.
- Validate user input.
- Apply database constraints.

## API security
- Restrict CORS to the frontend origin.
- Limit request sizes.
- Protect sensitive endpoints.
- Use secure authentication and session handling.
- Do not expose internal error details.

## Chroma security
- Do not store passwords, tokens or secret keys in vector documents.
- Restrict the Chroma service to the local machine unless a secured deployment is configured.
- Validate metadata and document lengths.
- Restrict access to the vector API.

## Data integrity
MySQL is the source of truth.

If an event is saved in MySQL but Chroma indexing fails:
- Keep the MySQL record.
- Report the indexing failure.
- Retry indexing.
- Reconcile records periodically.

## Ethical use
Use only cloud logs that you are authorized to examine. Use clearly labelled synthetic records for demonstrations.
