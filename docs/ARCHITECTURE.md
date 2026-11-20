# Architecture

Browser frontend -> Express backend -> MySQL database.

The browser does not connect directly to MySQL. All displayed database information is requested through backend API endpoints.

## Main modules
- Authentication
- Dashboard statistics
- Audit event listing
- Incident management
- Investigation notes
- Administrator dataset import


# SYSTEM ARCHITECTURE

```text
                 USER
                  |
                  v
          NEXT.JS FRONTEND
                  |
                  v
          EXPRESS BACKEND API
             /          \
            /            \
           v              v
        MYSQL           CHROMA
    Structured data   Vector storage
           |              |
           v              v
     Events, users,   Event descriptions,
     incidents,      embeddings, metadata
     notes
```

## MySQL responsibilities

- User records
- Cloud resources
- Audit events
- Incidents
- Investigation notes
- Relationships and constraints

## Chroma responsibilities

- Store event descriptions
- Generate or use embeddings
- Store vector metadata
- Perform semantic similarity retrieval

## Backend responsibilities

- Validate requests
- Communicate with MySQL
- Communicate with Chroma
- Return results to Next.js
- Handle failures between services

## Frontend responsibilities

- Display dashboard information
- Display audit events
- Display incidents
- Display investigation notes
- Submit semantic-search queries
- Display matching event descriptions

## Integration flow

1. User submits an event.
2. Backend validates the event.
3. Backend saves it in MySQL.
4. Backend indexes its description in Chroma.
5. User submits a natural-language search.
6. Backend forwards the query to Chroma.
7. Chroma returns matching event IDs and descriptions.
8. Backend can retrieve the authoritative event records from MySQL.
9. Frontend displays the results.
