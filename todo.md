# TaxAce Pickup Log — TODO

## Database & Backend
- [x] Database schema: clients, businesses, tax_year_records, record_history tables
- [x] Run migrations via drizzle-kit and webdev_execute_sql
- [x] Backend router: clients CRUD (add, edit, soft-delete, list, search)
- [x] Backend router: businesses CRUD (add, edit, delete, link to client)
- [x] Backend router: tax year records CRUD (add, edit, status change with auto-date)
- [x] Backend router: record history (log every change with timestamp)
- [x] Backend router: dashboard stats (live counts per status)
- [x] Backend router: filtered list queries (by status, sort, filter)
- [x] Backend router: duplicate detection (fuzzy name, shared spouse, shared business)
- [x] Backend router: global search (clients, spouses, businesses)
- [x] Backend router: CSV import (parse, validate, default ambiguous to Research Needed)

## Frontend — Layout & Branding
- [x] Upload TaxAce logo to static assets
- [x] Apply TaxAce brand colors (teal #00A896, charcoal #4A4A4A) in index.css
- [x] Add Inter font via Google Fonts
- [x] Build left-side navigation sidebar with all nav items
- [x] Integrate AppLayout with custom nav items and TaxAce logo

## Frontend — Pages
- [x] Dashboard page with 9 live stat cards (Total Clients, In Vault, Ready for Pickup, Picked Up, Hold, Eligible for Shred, Shredded, Research Needed, All Records)
- [x] Clients list page (A-Z, searchable, one entry per client)
- [x] Client Profile page (personal tax years + linked businesses + business tax years)
- [x] Add/Edit Client modal/form
- [x] Add/Edit Business modal/form linked to client
- [x] Add/Edit Tax Year Record modal/form (with auto-date on status change)
- [x] Duplicate Review page (fuzzy name, shared spouse, shared business)
- [x] All Records filtered list page (sort + filter controls)
- [x] In Vault filtered list page
- [x] Ready for Pickup filtered list page
- [x] Picked Up filtered list page
- [x] Hold filtered list page
- [x] Eligible for Shred filtered list page
- [x] Shredded filtered list page
- [x] Research Needed filtered list page
- [x] Record History viewer (View History link inside each tax year record)
- [x] Global search bar in top header
- [x] CSV Import page with column template documentation and preview

## Quality
- [x] Write vitest tests for key backend procedures (11 tests, all passing)
- [x] Handle loading, empty, and error states on all pages
- [x] Soft-delete for clients (not hard delete)
- [x] Status labels exactly: In Vault, Ready for Pickup, Picked Up, Hold, Eligible for Shred, Shredded, Research Needed

## Phase 2 Updates
- [x] Update status enum to: In Vault, Contacted, Scheduled, Prepped, Picked Up, Prep to Shred, Shredded, Hold
- [x] Replace "Research Needed" with "Hold" as CSV import default
- [x] Add contactStatus field to tax_year_records: Not Contacted, Left Voicemail, Called No Answer, Spoke to Client, Email Sent
- [x] Auto-set main status to "Contacted" when contactStatus = "Spoke to Client"
- [x] Add dismissed_duplicates table to track dismissed pairs
- [x] Backend: bulk status update procedure (update multiple records at once)
- [x] Backend: dismiss duplicate procedure
- [x] Frontend: update all status badges, dropdowns, and filtered routes
- [x] Frontend: bulk select checkboxes + bulk status change on list pages
- [x] Frontend: contact status field in add/edit record form
- [x] Frontend: "Not a Duplicate" dismiss button on Duplicate Review page
- [x] Frontend: update CSV import template with new statuses
- [x] Update vitest tests for new schema

## Phase 3 Updates
- [x] DB: add isArchived field to tax_year_records
- [x] DB: run migration
- [x] Backend: archive/unarchive tax year record procedure
- [x] Backend: merge clients procedure (move records, soft-delete duplicate, handle conflicts)
- [x] Backend: listClients returns tax year summary per client
- [x] Backend: listAll/filtered queries respect isArchived filter
- [x] Seed: insert demo clients, businesses, and tax year records across all statuses/years
- [x] Frontend Clients: color-coded year badges with status color legend
- [x] Frontend Client Profile: inline dropdown editing for status, contactStatus, taxYear
- [x] Frontend Client Profile: Archive button on each tax year record
- [x] Frontend Client Profile: Show Archived toggle
- [x] Frontend RecordsList: multi-select filter bar (status + year)
- [x] Frontend RecordsList: Show Archived toggle
- [x] Frontend DuplicateReview: Merge button opening side-by-side comparison
- [x] Frontend DuplicateReview: Conflict resolution picker for overlapping tax years
- [x] Tests: update/add tests for archive, merge, filter procedures

## Phase 4 Updates
- [x] Revise status color palette: In Vault = teal, Picked Up = emerald (clearly distinct)
- [x] Update StatusBadge component with new distinct colors for all 8 statuses
- [x] Remove vault slot / shelf location field from add/edit record forms
- [x] Remove vault slot from TaxYearRow inline display
- [x] Remove vault slot from CSV import template and backend
- [x] Colorful status option pills in all status dropdowns (forms + inline selects)
- [x] Quick status change on hover of year badge in Clients list (mini popover picker)
- [x] Notes indicator icon on client rows that have notes

## Phase 5 Updates
- [x] New distinct status color palette (In Vault=dark teal, Contacted=sky blue, Prepped=amber, Hold=slate)
- [x] Auto-populate datePickedUp when status changes to "Picked Up" (single update, inline, bulk)
- [x] Backend: bulk status change skips records already in "Picked Up" or "Shredded", returns skip count
- [x] Frontend: bulk update toast shows updated count and skipped count
- [x] Clients list: show linked business names under client name
- [x] Backend: listClientsWithSummary includes business names per client
- [x] RecordsList: click-to-change status popover on status badges (same as Clients page)
- [x] ClientProfile: multi-select checkboxes on tax year rows
- [x] ClientProfile: Select All checkbox at top of tax year list
- [x] ClientProfile: bulk status change action for selected years (with skip logic for terminal statuses)

## Password Gate (Testing Phase)
- [x] Backend: tRPC procedure to verify site password and set a session cookie
- [x] Frontend: PasswordGate component shown to all visitors before app content
- [x] Store password in env secret (SITE_PASSWORD)
- [x] Gate persists across page refreshes via cookie

## OAuth Bypass + Branding
- [x] Bypass Manus OAuth redirect for password-gate-unlocked users (no email prompt)
- [x] Add "Pickup Log" label to sidebar header so it's identifiable among multiple dashboards
- [x] Update browser tab title to "TaxAce Pickup Log"

## Phase 6 Build (Tester Feedback)
- [x] DB schema: add statusDate (timestamp), rename contactStatus→commStatus, add commDate (timestamp), add spouseFirstName + spouseLastName columns
- [x] DB migration: generate SQL and apply via webdev_execute_sql
- [x] Backend: auto-stamp statusDate when status changes, auto-stamp commDate when commStatus changes
- [x] Backend: delete two Unknown Client records and all their tax year data
- [x] ClientProfile: full-width table layout
- [x] ClientProfile: Status & Date inline (badge left, date right, close together)
- [x] ClientProfile: Communication Status & Date inline (label left, date right, close together)
- [x] ClientProfile: icon-only actions (remove "View History" text, keep clock icon)
- [x] ClientProfile: archive confirmation pop-up
- [x] ClientProfile: delete confirmation pop-up
- [x] All Records / status tabs: rename Contact Status → Communication Status column
- [x] All Records / status tabs: replace Date Picked Up with Status Date (inline with status)
- [x] All Records / status tabs: remove Location column
- [x] All Records / status tabs: show "Prepped for Pickup" label
- [x] Edit drawer: rename Date Picked Up → Status Date, remove Date Shredded, add Communication Status + Communication Date editable fields
- [x] Add/Edit Client form: split spouse into Spouse First Name + Spouse Last Name fields
- [x] Add/Edit Client form: require First Name + Last Name before saving (block empty name)
- [x] Search: include spouseLastName in client search

## User Feedback — July 2026
- [x] Show Archived toggle on ClientProfile personal records section (confirm wired and visible)
- [x] Confirmation dialog before archiving a tax year record
- [x] Confirmation dialog before deleting a tax year record
- [x] Role-based access: hide trash/delete button from non-admin users (only admins can delete)
- [x] Role-based access: all users can archive, only admins can delete

## Surgical Patch — August 17, 2026
- [x] Apply the supplied surgical patch overlay and execute migration 0008_cleanup_orphaned_client_records.sql once
- [x] Validate the patched project with its existing type check, automated test suite, and production build

## Filter-State Hotfix — August 17, 2026
- [x] Apply the supplied six-file filter-state hotfix overlay mechanically
- [x] Validate the requested archive, inactive, and independent filter behavior
- [x] Run the existing type check, automated tests, and production build

> Preview verification note: Samantha’s authenticated session showed 205 active clients by default and exactly 15 inactive clients after selecting Show Inactive; each displayed row was marked Inactive. Moving to All Records showed its independent default list (304 records) with both Show Archived and Show Inactive off, confirming it did not inherit the Clients filter. Selecting Show Archived displayed only two explicitly marked archived rows; turning it back off restored the 304 non-archived records. Selecting Show Inactive on All Records displayed 20 records for the inactive-client set only; opening the In Vault status tab then displayed its separate 53-record active default, confirming no inherited inactive filter. Returning to All Records preserved its 20-record inactive filter across navigation, and selecting Clear restored the normal 304-record list. Returning to Clients preserved its separate 15-client inactive filter; selecting Clear restored the 205-client active list.

## Codebase Archive — August 17, 2026
- [x] Package the current TaxAce Pickup Log source code and project configuration as a downloadable ZIP

## Rebuild Blueprint — August 17, 2026
- [x] Document the current technology stack, schema, folder structure, authentication, routes, and implemented features in a comprehensive Rebuild Blueprint
