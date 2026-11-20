
import os
import chromadb


from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any

# --------------------------------------------------
# 1. INITIALIZE CHROMA
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_data")

client = chromadb.PersistentClient(
    path=CHROMA_PATH
)
collection = client.get_or_create_collection(
    name="cloud_audit_events",
    metadata={"hnsw:space": "cosine"}
)

app = FastAPI(
    title="Cloud Attack Reconstruction - Chroma API",
    description="Vector search service for cloud audit-event descriptions",
    version="1.0.0"
)


# --------------------------------------------------
# 2. REQUEST MODELS
# --------------------------------------------------

class EventDocument(BaseModel):
    event_id: str
    document: str = Field(min_length=3, max_length=10000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=1000)
    limit: int = Field(default=5, ge=1, le=20)

class BulkEventRequest(BaseModel):
    events: list[EventDocument] = Field(
        min_length=1,
        max_length=5000
    )


# --------------------------------------------------
# 3. HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "running",
        "service": "Chroma",
        "collection": collection.name,
        "stored_documents": collection.count()
    }


# --------------------------------------------------
# 4. STORE EVENT DOCUMENTS
# --------------------------------------------------

@app.post("/events")
def store_event(event: EventDocument):

    try:
        metadata = {
            "event_id": event.event_id,
            **event.metadata
        }

        # Chroma metadata values must be supported scalar types.
        clean_metadata = {}

        for key, value in metadata.items():
            if isinstance(value, (str, int, float, bool)):
                clean_metadata[key] = value
            elif value is not None:
                clean_metadata[key] = str(value)

        collection.upsert(
            ids=[event.event_id],
            documents=[event.document],
            metadatas=[clean_metadata]
        )

        return {
            "message": "Event stored successfully",
            "event_id": event.event_id,
            "total_documents": collection.count()
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to store event: {str(error)}"
        )

# --------------------------------------------------
# 4B. BULK IMPORT CLOUD AUDIT EVENTS
# --------------------------------------------------

@app.post("/events/bulk")
def store_multiple_events(request: BulkEventRequest):

    try:
        ids = []
        documents = []
        metadatas = []

        for event in request.events:

            metadata = {
                "event_id": event.event_id,
                **event.metadata
            }

            clean_metadata = {}

            for key, value in metadata.items():
                if isinstance(value, (str, int, float, bool)):
                    clean_metadata[key] = value
                elif value is not None:
                    clean_metadata[key] = str(value)

            ids.append(event.event_id)
            documents.append(event.document)
            metadatas.append(clean_metadata)

        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

        return {
            "message": "Bulk import completed successfully",
            "imported": len(ids),
            "total_documents": collection.count()
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Bulk import failed: {str(error)}"
        )

# --------------------------------------------------
# 5. SEMANTIC SEARCH
# --------------------------------------------------

@app.post("/search")
def search_events(request: SearchRequest):

    try:
        total = collection.count()

        if total == 0:
            return {
                "query": request.query,
                "results": [],
                "message": "No documents have been indexed yet."
            }

        results = collection.query(
            query_texts=[request.query],
            n_results=min(request.limit, total),
            include=["documents", "metadatas", "distances"]
        )

        matches = []

        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for index in range(len(ids)):
            matches.append({
                "event_id": ids[index],
                "document": documents[index],
                "metadata": metadatas[index],
                "distance": distances[index]
            })

        return {
            "query": request.query,
            "result_count": len(matches),
            "results": matches
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(error)}"
        )


# --------------------------------------------------
# 6. COLLECTION INFORMATION
# --------------------------------------------------

@app.get("/collection-info")
def collection_info():

    return {
        "collection_name": collection.name,
        "document_count": collection.count(),
        "storage": "Local persistent Chroma database"
    }
