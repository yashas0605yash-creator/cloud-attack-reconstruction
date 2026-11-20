
const CHROMA_URL =
    process.env.CHROMA_URL || "http://127.0.0.1:8010";

// --------------------------------------------------
// Store an event in Chroma
// --------------------------------------------------

async function indexAuditEvent(event) {
    const response = await fetch(
        `${CHROMA_URL}/events`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                event_id: String(event.event_id),

                document:
                    `Event type: ${event.event_type}. ` +
                    `Actor: ${event.actor}. ` +
                    `Risk: ${event.risk_level}. ` +
                    `Description: ${event.description}`,

                metadata: {
                    event_type: event.event_type,
                    actor: event.actor,
                    risk_level: event.risk_level,
                    mysql_event_id: String(event.event_id)
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error("Chroma indexing failed");
    }

    return response.json();
}

// --------------------------------------------------
// Search events using semantic search
// --------------------------------------------------

async function semanticSearch(query, limit = 5) {
    const response = await fetch(
        `${CHROMA_URL}/search`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query,
                limit
            })
        }
    );

    if (!response.ok) {
        throw new Error("Chroma search failed");
    }

    return response.json();
}

// --------------------------------------------------
// Example Express routes
// Add these to your existing Express app.
// --------------------------------------------------

// app.post("/api/search", async (req, res) => {
//     try {
//         const { query, limit = 5 } = req.body;
//
//         if (typeof query !== "string" || query.trim().length < 2) {
//             return res.status(400).json({
//                 error: "Enter a valid search query."
//             });
//         }
//
//         const result = await semanticSearch(query, limit);
//
//         res.json(result);
//
//     } catch (error) {
//         res.status(502).json({
//             error: "Semantic search is temporarily unavailable."
//         });
//     }
// });

export {
    indexAuditEvent,
    semanticSearch
};
