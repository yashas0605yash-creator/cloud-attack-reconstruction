
# Cloud Attack Reconstruction and Forensic Analysis System

## Project overview

A defensive forensic-analysis application designed to organize cloud audit events, manage incidents and support semantic search over event descriptions.

## Technology stack

- Frontend: Next.js
- Backend: Express.js
- SQL database: MySQL
- Vector database: Chroma
- Vector API: Python FastAPI
- Version control: Git and GitHub

## Architecture

Next.js communicates with the Express backend.

The backend communicates with:
- MySQL for structured data.
- Chroma for vector storage and semantic retrieval.

## Requirements

- Node.js
- Python 3.11
- MySQL 8+
- Git
- npm

## Starting Chroma

```powershell
cd chroma-service

.\.venv\Scripts\Activate.ps1

uvicorn app:app --host 127.0.0.1 --port 8010 --reload
```

Documentation:
http://127.0.0.1:8010/docs

## Starting the backend

```powershell
cd backend

npm install

npm run dev
```

Configure the local environment variables before starting.

## Starting the frontend

```powershell
cd frontend

npm install

npm run dev
```

Open:
http://localhost:3000

## Database

Run the approved SQL schema using MySQL Workbench.

Check that the database, tables, relationships and constraints match the final ER diagram.

## Testing

Refer to docs/TEST_CASES.md.

## Security

Never commit `.env` files, database passwords, API keys or other credentials.

## Limitations

This project is an educational defensive investigation system. Synthetic records must be labelled as synthetic. Semantic search results do not establish that an attack occurred.

## Team

Add the actual team members and responsibilities.

## License and references

Document the actual third-party libraries, datasets, papers and source code used.
