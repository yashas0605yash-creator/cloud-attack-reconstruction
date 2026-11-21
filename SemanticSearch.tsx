
"use client";

import { useState } from "react";

type SearchResult = {
    event_id: string;
    document: string;
    distance: number;
    metadata?: Record<string, unknown>;
};

export default function SemanticSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSearch(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (query.trim().length < 2) {
            setMessage("Please enter a longer search query.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE}/api/search`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        query: query.trim(),
                        limit: 5
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Search failed."
                );
            }

            setResults(data.results || []);

            setMessage(
                `Found ${data.result_count || 0} matching events.`
            );

        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to search events."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section>
            <h2>Semantic Event Search</h2>

            <p>
                Search audit events using natural-language
                descriptions.
            </p>

            <form onSubmit={handleSearch}>
                <input
                    value={query}
                    onChange={(event) =>
                        setQuery(event.target.value)
                    }
                    placeholder="Example: unusual login failures"
                    minLength={2}
                    maxLength={1000}
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>

            {message && <p role="status">{message}</p>}

            {results.map((result) => (
                <article key={result.event_id}>
                    <h3>
                        Event ID: {result.event_id}
                    </h3>

                    <p>{result.document}</p>

                    <small>
                        Cosine distance:{" "}
                        {result.distance.toFixed(4)}
                    </small>
                </article>
            ))}
        </section>
    );
}
