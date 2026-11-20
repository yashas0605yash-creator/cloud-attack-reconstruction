
# PROJECT TEST CASES

Record the actual output and screenshot for every test.

| Test ID | Test description | Expected result |
|---|---|---|
| TC01 | Open Chroma health endpoint | Service responds |
| TC02 | Open FastAPI documentation | Documentation loads |
| TC03 | Store a test event in Chroma | Document is stored |
| TC04 | Search Chroma using natural language | Matching documents returned |
| TC05 | Check collection information | Document count displayed |
| TC06 | Connect MySQL | Connection succeeds |
| TC07 | Retrieve audit events | Event rows returned |
| TC08 | Insert an event through application | MySQL record created |
| TC09 | Index inserted event in Chroma | Vector document stored |
| TC10 | Search event through frontend | Relevant results displayed |
| TC11 | Create incident | Incident record created |
| TC12 | Link event to incident | Relationship stored |
| TC13 | Add investigation note | Note stored |
| TC14 | Execute JOIN query | Related records returned |
| TC15 | Execute GROUP BY query | Grouped results returned |
| TC16 | Execute stored procedure | Expected result returned |
| TC17 | Execute view | Incident summary displayed |
| TC18 | Test transaction rollback | Uncommitted changes discarded |
| TC19 | Submit invalid input | Validation error returned |
| TC20 | Test unauthorized role | Access denied |
| TC21 | Restart Chroma | Persistent records remain available |
| TC22 | Stop Chroma temporarily | Application reports indexing/search failure safely |

## Test result record

For every test, record:

- Test ID:
- Date:
- Environment:
- Input:
- Expected output:
- Actual output:
- Status: PASS / FAIL / NOT TESTED
- Screenshot filename:

Do not mark tests as passed without actually running them.
