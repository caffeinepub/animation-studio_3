# Animation Studio

## Current State
Full animation studio with Motoko backend (projects CRUD) and React frontend (dashboard + editor).

## Requested Changes (Diff)

### Add
- Backend: `visitCount` stable variable, `recordVisit()` update call, `getVisitCount()` query
- Frontend: call `recordVisit` once on app load, show visit count in dashboard footer

### Modify
- `main.mo`: add visit tracking
- `Dashboard.tsx`: display visit count in footer
- `App.tsx`: call recordVisit on mount

### Remove
- Nothing

## Implementation Plan
1. Add `visitCount` var + `recordVisit` + `getVisitCount` to main.mo
2. Wire up frontend hooks for the new backend calls
3. Show count in footer with eye icon
