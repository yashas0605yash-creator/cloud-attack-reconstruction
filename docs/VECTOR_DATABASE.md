
# CHROMA VECTOR DATABASE IMPLEMENTATION

## 1. Why Chroma?

Cloud audit-event descriptions are text-based. The same type of activity may be described using different words.

A traditional exact keyword search may not find every relevant description.

Chroma supports semantic retrieval by comparing vector representations of text.

## 2. What data is embedded?

The system can convert an event description into searchable text containing:
- Event type
- Actor
- Risk level
- Description

Do not include passwords, secret keys or unnecessary personal information.

## 3. Embedding approach

Chroma uses an embedding function to convert text into numerical vectors.

Record the exact embedding function and model used by the installed Chroma version after verifying it.

## 4. Vector storage

Vectors are stored in the Chroma collection:

cloud_audit_events

Each document has an event ID and metadata.

## 5. Similarity metric

The collection is configured with cosine distance.

Cosine distance measures how different two vector directions are. Lower distance generally indicates greater similarity for this configuration.

## 6. Retrieval process

1. User submits a natural-language query.
2. Chroma converts the query into a vector.
3. Chroma compares it with stored event vectors.
4. Chroma returns the closest matching documents.
5. The application displays the results.

## 7. Example

Stored event:
"Repeated unsuccessful sign-in attempts were recorded for a test account."

Search:
"Suspicious authentication failures"

The semantic-search system may retrieve the stored event even though the exact words differ.

## 8. Limitations

- Semantic similarity does not prove an attack occurred.
- Search results require human investigation.
- Incorrect or incomplete event descriptions affect retrieval quality.
- Vector indexes must be reconciled with MySQL records.
