# ResolveDesk

A customer concern management platform. Organizations use it to receive, assign, investigate, track, and resolve customer concerns in one accountable workflow, instead of across chat threads, inboxes, and spreadsheets.

- **Frontend:** React 18, React Router 6, Tailwind CSS 3, Vite 7, Axios, Lucide icons
- **Backend:** Laravel 12 (PHP 8.2+), REST JSON API, Sanctum cookie authentication, Eloquent, Form Requests, Policies
- **Database:** MySQL 8+ or MariaDB 10.4+
- **Tests:** PHPUnit 11 (backend), Vitest + React Testing Library (frontend)

## Features

**Concerns**

- Submit, view, edit, and withdraw concerns; each receives a reference such as `RD-2026-000123`
- Server-side search, filters (status, priority, category, assignee, date range, overdue), sorting, and pagination
- A dedicated page per concern with description, discussion, details, and a merged history
- Enforced workflow: Open → Under review → In progress → Resolved → Closed, with Waiting for customer as a side step
- Resolving requires a written resolution note; closing is a separate step the customer can confirm
- Public replies and private staff notes; private notes are never sent to customers
- Assignment to staff, target dates, and overdue flags
- Append-only status history plus an audit trail for assignment, edits, and deletion (soft delete)
- In-app notifications for assignments, status changes, and replies

**Roles, per workspace**

| Role | Can |
| --- | --- |
| Customer | Submit concerns, see and edit their own while Open, reply, confirm a resolution |
| Staff | See all concerns in the workspace, assign, set priority and target dates, move concerns they own or that are unassigned, post updates and internal notes, view reports |
| Organization administrator | Everything staff can do on any concern, plus reopen closed concerns, delete, manage team, categories, and settings |

**Workspaces**

- Multiple organizations, isolated from each other. Access comes only from a membership record.
- A person can belong to several workspaces with a different role in each, and switch between them.
- Customers join with a workspace code; creating a new workspace makes its creator the administrator.

**Dashboards and reports**

- Role-specific overview: customers see their own concerns and updates; staff see their queue; administrators see workload, status and category distribution, and recent activity.
- Reports: submitted versus resolved per day, average time to resolve, distribution by status, priority, and category.
- Every figure is a live database query. Nothing is hardcoded.

## Requirements

- PHP 8.2 or newer with `pdo_mysql`, `mbstring`, `openssl`, `fileinfo` (and `pdo_sqlite` to run the tests)
- Composer 2
- Node.js 20 or newer and npm
- MySQL 8+ or MariaDB 10.4+

## Installation

```bash
composer install
npm install

cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
php artisan key:generate
```

Create the database, then set its credentials in `.env`:

```sql
CREATE DATABASE resolvedesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=resolvedesk
DB_USERNAME=root
DB_PASSWORD=
```

Create the tables and load the demo data:

```bash
php artisan migrate --seed
```

## Running locally

Two processes, in two terminals:

```bash
php artisan serve      # the application, at http://localhost:8000
npm run dev            # Vite, for hot reloading while you edit the frontend
```

Open **http://localhost:8000**. `composer run dev` starts both, plus the queue listener and log viewer.

To run without Vite, build the frontend once (`npm run build`) and start only `php artisan serve`.

> Open the site at the host named in `APP_URL` and `SANCTUM_STATEFUL_DOMAINS`. `localhost:8000` and `127.0.0.1:8000` are both allowed by default. A host that is not listed will load the pages but fail to stay signed in.

> The app is served from the web root. Under XAMPP's Apache, point a virtual host at the `public/` directory rather than opening `http://localhost/ResolveDesk/public`.

## Starter accounts (local development only)

`php artisan db:seed` creates an empty **Northgate Residences** workspace: no concerns and no customers. Everything else is added by hand. All accounts use the password `password`; change it from the Profile page.

| Role | Name | Email |
| --- | --- | --- |
| Organization administrator | Administrator | `admin@resolvedesk.test` |
| Staff | Ben10 | `ben10@resolvedesk.test` |
| Staff | Guko | `guko@resolvedesk.test` |
| Staff | Dino | `dino@resolvedesk.test` |
| Staff | Barney | `barney@resolvedesk.test` |

Customers create their own accounts on the Register page and join this workspace automatically.

To load the larger sample dataset (about 40 concerns with history) instead, run `php artisan db:seed --class="Database\Seeders\DemoSeeder"`.

With `VITE_SHOW_DEMO_ACCOUNTS=true` the sign-in page offers these accounts in a panel. It is read at build time, so rebuild after changing it. The seeders refuse to run when `APP_ENV=production`.

### Resetting

```bash
php artisan migrate:fresh --seed
```

This **drops every table** in the configured database and rebuilds it with the starter accounts. Use it only on a local or disposable database, and check `DB_DATABASE` in `.env` first.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `APP_URL` | The URL people open in their browser |
| `APP_KEY` | Encryption key. Generate with `php artisan key:generate`; never commit it |
| `APP_ENV`, `APP_DEBUG` | `production` and `false` on a live site |
| `DB_*` | Database connection |
| `SESSION_DRIVER` | `database` by default (uses the `sessions` table) |
| `SESSION_SECURE_COOKIE` | `true` in production so the session cookie is sent over HTTPS only |
| `SESSION_SAME_SITE` | `lax` by default |
| `SESSION_DOMAIN` | Set to `.example.com` when the frontend and API are on different subdomains |
| `SANCTUM_STATEFUL_DOMAINS` | Hosts (with port) the frontend is served from |
| `FRONTEND_URL` | Origins allowed to call the API with cookies, comma separated. Only matters for a separately hosted frontend |
| `RESOLVEDESK_TICKET_PREFIX` | Prefix of ticket references, `RD` by default |
| `RESOLVEDESK_DEFAULT_ORGANIZATION` | Slug of the workspace that people registering without a code join as customers. Leave empty to require a code |
| `VITE_API_BASE_URL` | Base URL of the API. Empty when Laravel serves the frontend |
| `VITE_SHOW_DEMO_ACCOUNTS` | Show the demo-account panel on the sign-in page. Keep `false` in production |

`VITE_*` variables are compiled into the JavaScript bundle. They are public by nature: never put a secret in one.

## Tests and checks

```bash
php artisan test          # backend: 64 tests, in-memory SQLite
npm test                  # frontend: 38 tests
npm run build             # production build
php artisan route:list    # inspect routes
php artisan migrate:status
vendor/bin/pint --test    # code style
```

The backend suite runs on in-memory SQLite by default. To run it against MySQL, create an empty database and override the connection:

```bash
DB_CONNECTION=mysql DB_DATABASE=resolvedesk_test php vendor/bin/phpunit
```

The tests erase the database they run against. Never point them at one that holds real data.

What the backend tests cover: registration, sign-in, sign-out, rate limiting, concern create/list/show/update/delete, validation, pagination and filter whitelisting, every workflow rule, assignment rules, private-note visibility, status history, notifications, dashboard and report figures, and team, category, and settings administration. `OrganizationIsolationTest` consists of negative tests: changing an id to reach another customer's concern, and every way of reaching another organization's records.

## Architecture

```
app/
  Enums/                 ConcernStatus, ConcernPriority, MemberRole, ...
  Http/
    Controllers/Api/     Thin controllers, one per resource or action
    Middleware/          EnsureOrganizationMember, SecurityHeaders
    Requests/            Form Requests (validation + authorization)
    Resources/           API Resources (the only shape data leaves in)
  Models/                Organization, Membership, Category, Concern, ...
  Policies/              ConcernPolicy, CategoryPolicy, MembershipPolicy, OrganizationPolicy
  Services/              ConcernWorkflow, ConcernService, TicketReferenceGenerator,
                         DashboardService, ReportService, OrganizationService, ConcernNotifier
  Support/               OrganizationContext
resources/js/
  app/  routes/          Providers and the route table
  components/ui/         Button, Field, Dialog, Dropdown, Pagination, Toast, StatusIndicator, ...
  components/layout/     AppShell, Sidebar, SiteHeader, SiteFooter, AuthLayout
  features/              auth, concerns, dashboard, reports, categories, organizations, notifications, profile
  pages/                 HomePage, LoginPage, RegisterPage
  hooks/  lib/           useQuery, API client, services, formatting
```

Decisions worth knowing:

- **One origin.** Laravel serves the React app (a Blade shell plus a catch-all route) and the API under `/api`. The browser holds an HttpOnly session cookie; Axios echoes the CSRF cookie as a header. No tokens, and nothing sensitive in `localStorage`.
- **The workspace is never taken from the request.** `EnsureOrganizationMember` resolves it from the signed-in user's own active memberships (`users.current_organization_id`, validated on every request). Policies only authorize a record when it belongs to that workspace.
- **Roles live on memberships** (`organization_user.role`), not on users. The `User` model has no role attribute to mass-assign, and registration can only create a customer membership.
- **One place decides status changes.** `ConcernWorkflow` holds the transition table, who may use each transition, and which need a note. It re-reads the concern under a row lock, so concurrent requests validate against the real current status.
- **Ticket references** come from a per-year counter row locked inside the transaction that inserts the concern, so concurrent submissions cannot receive the same number.
- **Cross-workspace requests return 404**, not 403, so the existence of another organization's records is not confirmed. Within a workspace, a refused action returns 403 with a reason.
- **The interface asks the server what is allowed.** Each concern in an API response carries `permissions` and, on the detail endpoint, the `transitions` available to this user. The same policies are enforced again when an action is attempted.

## Database

| Table | Purpose |
| --- | --- |
| `users` | Accounts. `current_organization_id` remembers the selected workspace |
| `organizations` | Workspaces: `name`, unique `slug`, `status`, unique `join_code` |
| `organization_user` | Memberships: `role`, `status`; unique per (organization, user) |
| `categories` | Per workspace; name unique within the workspace; `is_active` |
| `concerns` | `reference` (unique), organization, creator, assignee, category, title, description, priority, status, `resolution_note`, `due_at`, `resolved_at`, `closed_at`, soft deletes |
| `concern_comments` | Discussion; `visibility` is `public` or `internal` |
| `concern_status_histories` | Append-only: `old_status`, `new_status`, `note`, `changed_by` |
| `concern_activities` | Audit trail: assignment, edits, priority, category, target date, deletion |
| `ticket_sequences` | One counter row per year for references |
| `notifications` | Laravel's standard database notifications |
| `sessions`, `cache`, `jobs` | Framework tables |

All concern indexes lead with `organization_id`, matching how every query is scoped: by status, creation date, last update, priority, due date, resolution date, creator, assignee, and category.

## API

All endpoints are under `/api`, return JSON, and (except register and login) require a session. Errors use `{ "message": "...", "errors": { "field": ["..."] } }`.

**Authentication**

| Method | Endpoint | |
| --- | --- | --- |
| GET | `/sanctum/csrf-cookie` | Obtain the CSRF cookie before signing in |
| POST | `/api/register` | `name`, `email`, `password`, `password_confirmation`, optional `workspace_code` |
| POST | `/api/login` | `email`, `password`, optional `remember` |
| POST | `/api/logout` | |
| GET | `/api/user` | User, their workspaces, and the current workspace and role |
| PATCH | `/api/profile` | `name`, `email` |
| PUT | `/api/profile/password` | `current_password`, `password`, `password_confirmation` |

**Workspaces**

| Method | Endpoint | |
| --- | --- | --- |
| GET | `/api/organizations` | The user's workspaces |
| POST | `/api/organizations` | Create one; the creator becomes its administrator |
| POST | `/api/organizations/join` | Join as a customer with `code` |
| POST | `/api/organizations/{id}/switch` | Make it the current workspace |
| GET, PATCH | `/api/organizations/{id}` | View; update (administrators) |
| POST | `/api/organizations/{id}/join-code` | Generate a new workspace code (administrators) |

**Concerns**

| Method | Endpoint | |
| --- | --- | --- |
| GET | `/api/concerns` | Query: `search`, `status` (a status, or `active`), `category_id`, `priority`, `assignee` (`me`, `unassigned`, or a user id), `created_from`, `created_to`, `overdue`, `sort` (`created_at`, `updated_at`, `priority`, `due_at`), `direction`, `page`, `per_page` |
| POST | `/api/concerns` | `title`, `description`, `category_id`, optional `priority`; `due_at` for staff |
| GET | `/api/concerns/{id}` | With comments, status history, activities, permissions, and transitions |
| PATCH | `/api/concerns/{id}` | Editable fields depend on role |
| DELETE | `/api/concerns/{id}` | Soft delete |
| POST | `/api/concerns/{id}/assign` | `assigned_to`: a team member's user id, or `null` |
| POST | `/api/concerns/{id}/status` | `status`, and `note` where the transition requires one. Resolving and closing both go through here |
| GET, POST | `/api/concerns/{id}/comments` | `body`, optional `visibility` (`public` or `internal`) |

Concern actions use dedicated endpoints rather than fields on `PATCH`, so `status` and `assigned_to` can never be changed by a general update.

**Everything else**

| Method | Endpoint | |
| --- | --- | --- |
| GET | `/api/dashboard?period=7\|30\|90` | Payload depends on the user's role in the current workspace |
| GET | `/api/reports/summary?period=7\|30\|90` | Staff and administrators |
| GET, POST, PATCH, DELETE | `/api/categories` | Read: everyone. Write: administrators |
| GET | `/api/members/assignable` | People a concern can be assigned to (staff and administrators) |
| GET, POST, PATCH, DELETE | `/api/members` | Team management (administrators) |
| GET | `/api/notifications` | Latest 20 and the unread count |
| POST | `/api/notifications/{id}/read`, `/api/notifications/read-all` | |

## Security

Implemented, and covered by tests where it can be:

- Passwords hashed with bcrypt through Laravel's `hashed` cast; minimum 8 characters with a letter and a number.
- Sanctum cookie sessions with CSRF protection; the session id is regenerated at sign-in and invalidated at sign-out.
- Rate limiting: 5 failed sign-ins per email and address, 10 requests a minute on authentication and workspace-code endpoints, 40 writes a minute per user, 180 API requests a minute.
- Authorization in Policies and Form Requests on every endpoint. The frontend's route guards are a convenience, not a control.
- Organization isolation, record ownership, and role escalation each have negative tests.
- Mass assignment: models list only descriptive fields as fillable; identity, workspace, role, status, and assignment are set by server code. Strict mode in development rejects unexpected attributes.
- SQL injection: Eloquent and bound parameters throughout. Sort columns and directions are whitelisted; `LIKE` wildcards in search terms are escaped.
- XSS: React renders all user content as text. There is no `dangerouslySetInnerHTML` in the codebase.
- API errors never include stack traces or SQL when `APP_DEBUG=false`; the frontend replaces any 5xx message with a generic one.
- Response headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and HSTS over HTTPS.

Passing tests show these controls work as written. They are not a security audit, and this application has not had an independent review or penetration test. Arrange one before using it with real customer data.

## Deployment

Nothing in this repository has been deployed. This is what a deployment needs.

1. **Server:** PHP 8.2+, a web server whose document root is `public/`, MySQL or MariaDB, and HTTPS.
2. **Configure `.env`:**
   ```dotenv
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://concerns.example.com
   SESSION_SECURE_COOKIE=true
   SESSION_ENCRYPT=true
   SANCTUM_STATEFUL_DOMAINS=concerns.example.com
   FRONTEND_URL=https://concerns.example.com
   VITE_SHOW_DEMO_ACCOUNTS=false
   ```
   Use a dedicated database user with a strong password, and leave `RESOLVEDESK_DEFAULT_ORGANIZATION` empty unless one workspace should accept every registration.
3. **Build and install:**
   ```bash
   composer install --no-dev --optimize-autoloader
   npm ci && npm run build
   php artisan migrate --force
   php artisan config:cache && php artisan route:cache && php artisan view:cache
   ```
4. **Do not seed.** Register the first account, then create the organization from the welcome screen; that account becomes its administrator.
5. **Behind a load balancer or proxy,** configure trusted proxies so Laravel recognises HTTPS.

**Hosting the frontend separately** (for example a static host, with the API on `api.example.com`): build with `VITE_API_BASE_URL=https://api.example.com`, set `SESSION_DOMAIN=.example.com`, list the frontend host in `SANCTUM_STATEFUL_DOMAINS` and its origin in `FRONTEND_URL`, and have the static host serve `index.html` for every path. Both must share a registrable domain for the session cookie to work.

### Backups and migrations

- Back up before every deployment that includes a migration, and on a schedule:
  ```bash
  mysqldump --single-transaction --routines -u USER -p resolvedesk > resolvedesk-$(date +%F).sql
  ```
  Store backups off the server and test restoring one.
- Run `php artisan migrate --pretend` to read the SQL before applying it.
- In production use `php artisan migrate --force` only. Never run `migrate:fresh`, `migrate:refresh`, or `db:wipe`: they delete data.
- Write new migrations to be additive where possible: add a nullable column, backfill, then tighten. Avoid renaming or dropping a column in the same release that stops using it.
- Database dumps contain personal data. Keep them out of version control.

## Known limitations

- **No email.** Notifications are in-app only, and there is no password reset or email verification flow. `MAIL_MAILER=log` by default.
- **No attachments.** File upload was left out rather than shipped without malware scanning and storage isolation.
- **No invitations.** An administrator can add a person who already has an account; customers join with the workspace code. There is no emailed invite.
- **Notifications poll** every 60 seconds; there is no real-time push.
- **No Content-Security-Policy header.** Add one at the web server once the production asset origins are fixed.
- **Changing a password does not sign out other sessions.**
- **Dates are stored in UTC** and shown in the browser's time zone. "Overdue" is measured against the end of the target day in the server's time zone, and list date filters use UTC days.
- **Search is a `LIKE` match** on reference and title. It is fine for thousands of concerns; a full-text index would be the next step beyond that.
- **Light theme only.**
- **No Privacy Policy or Terms pages.** Add your own before going live.

## Note on the starter scaffold

The project began as a Laravel Breeze (Inertia) scaffold. Its controllers, pages, and tests were replaced by this application and moved, not deleted, to `storage/app/breeze-scaffold-backup/` (ignored by git). Delete that folder once you are sure you do not need it.
