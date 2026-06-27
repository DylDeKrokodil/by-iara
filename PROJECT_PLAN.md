# By Iara Project Plan

## 1. Goal

Build a scalable booking platform for By Iara with:

- Public website at `by-iara.com`
- Admin dashboard at `admin.by-iara.com`
- Spring Boot Kotlin API at `api.by-iara.com`
- PostgreSQL as the primary database

The first version should support browsing massage services, checking availability, submitting reservation requests, and allowing admins to manage reservations and core business settings.

## 2. Guiding Principles

- Keep domain boundaries clear from the start.
- Avoid placing all reservation logic in one large controller or service.
- Model the business explicitly: massage types, durations, prices, availability, reservations, customers, notifications, and admin users.
- Use migrations for every database change.
- Keep public API and admin API separated by route, authorization, validation, and response models.
- Prefer simple, well-structured modules over premature microservices.
- Make the MVP small enough to ship, but structured enough to grow.

## 3. System Overview

```text
by-iara-web
  public website
  admin dashboard

by-iara-api
  Spring Boot Kotlin Web API

PostgreSQL
  application database

Domains
  by-iara.com
    public website

  admin.by-iara.com
    admin dashboard

  api.by-iara.com
    backend API
```

## 4. Recommended Backend Stack

- Kotlin
- Spring Boot
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL
- Flyway
- Bean Validation
- Mail sender
- JWT or session-based admin authentication

Initial recommendation: use JWT for admin API auth if the admin frontend and API are on separate subdomains. Use short-lived access tokens with refresh support when needed. If admin usage remains simple and same-site cookie constraints are easy to control, secure HTTP-only session cookies are also valid.

## 5. Repository Structure

Recommended scalable structure:

```text
by-iara/
  by-iara-web/
    apps/
      website/
      admin/
    packages/
      shared-ui/
      api-client/
      config/

  by-iara-api/
    src/main/kotlin/com/byiara/api/
      auth/
      customer/
      reservation/
      massage/
      pricing/
      availability/
      notification/
      common/
    src/main/resources/
      db/migration/
      application.yml
      application-local.yml

  docs/
    architecture/
    api/
    database/
    operations/
```

If the web project starts small, `website` and `admin` can live in one frontend workspace while still keeping separate apps, routes, environment configs, and deployments.

## 6. Backend Package Design

Base package:

```text
com.byiara.api
```

Recommended domain packages:

```text
auth
  AdminUser
  AdminAuthController
  AdminAuthService
  PasswordService
  JwtService or SessionService

customer
  Customer
  CustomerRepository
  CustomerService

massage
  MassageType
  MassageDuration
  MassageController
  MassageAdminController
  MassageService

pricing
  MassagePrice
  Discount
  PricingAdminController
  PricingService

availability
  AvailabilityRule
  AvailabilityBlock
  AvailabilityController
  AvailabilityAdminController
  AvailabilityService

reservation
  Reservation
  ReservationController
  ReservationAdminController
  ReservationService
  ReservationStatus

notification
  EmailLog
  EmailService
  ReservationEmailService

common
  error handling
  validation
  security config
  auditing
  pagination
  API response helpers
  time/date utilities
```

Controller rule:

- Public controllers expose only customer-facing operations.
- Admin controllers live separately and require admin authentication.
- Services own business rules.
- Repositories only handle persistence.
- DTOs should not be reused blindly between public and admin APIs.

## 7. Database Tables

Core tables:

```text
admin_users
customers
massage_types
massage_durations
massage_prices
discounts
reservations
availability_rules
availability_blocks
email_logs
```

Recommended common columns:

```text
id UUID primary key
created_at timestamp with time zone not null
updated_at timestamp with time zone not null
deleted_at timestamp with time zone nullable, only where soft delete is useful
```

Suggested table responsibilities:

| Table | Responsibility |
| --- | --- |
| `admin_users` | Admin login identities, password hashes, roles, active status |
| `customers` | Customer contact details and normalized phone/email fields |
| `massage_types` | Public service categories and descriptions |
| `massage_durations` | Supported duration options, for example 60, 90, 120 minutes |
| `massage_prices` | Price by massage type, duration, and optional date range |
| `discounts` | Promotional or manual discounts |
| `reservations` | Customer booking requests and lifecycle status |
| `availability_rules` | Recurring working schedule rules |
| `availability_blocks` | One-off unavailable periods or overrides |
| `email_logs` | Outbound email audit trail and delivery status |

## 8. Reservation Status

```kotlin
enum class ReservationStatus {
    PENDING,
    CONFIRMED,
    REJECTED,
    CANCELLED,
    COMPLETED
}
```

Initial lifecycle:

```text
PENDING -> CONFIRMED
PENDING -> REJECTED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
CONFIRMED -> COMPLETED
```

Keep status transitions in `ReservationService`, not in the controller.

## 9. Public API

Base path:

```text
/api
```

Endpoints:

```text
GET  /api/massage-types
GET  /api/availability
POST /api/reservations
```

Public API responsibilities:

- Return only active, public massage types.
- Return availability in a frontend-friendly format.
- Accept reservation requests, validate inputs, calculate expected price, persist with `PENDING` status, and trigger notification emails.

## 10. Admin API

Base path:

```text
/api/admin
```

Authentication:

```text
POST /api/admin/auth/login
```

Reservations:

```text
GET   /api/admin/reservations
PATCH /api/admin/reservations/{id}/confirm
PATCH /api/admin/reservations/{id}/reject
```

Massage types:

```text
GET    /api/admin/massage-types
POST   /api/admin/massage-types
PATCH  /api/admin/massage-types/{id}
DELETE /api/admin/massage-types/{id}
```

Prices:

```text
GET   /api/admin/prices
POST  /api/admin/prices
PATCH /api/admin/prices/{id}
```

Availability:

```text
GET    /api/admin/availability
POST   /api/admin/availability
DELETE /api/admin/availability/{id}
```

Admin API responsibilities:

- Require authentication on every endpoint except login.
- Use pagination for list endpoints from day one.
- Keep filters explicit, especially for reservations by status, date range, and customer search.
- Write audit-friendly updates where reservation status or pricing changes.

## 11. MVP Scope

Build the first version in this order:

1. Project setup
2. Database schema and migrations
3. Massage types, durations, and prices
4. Availability
5. Reservation request
6. Admin login
7. Admin reservation management
8. Email notifications
9. Production deployment baseline

Do not start with every admin CRUD screen. Start with the minimum needed to operate bookings reliably.

## 12. Implementation Phases

### Phase 1: Foundation

Deliverables:

- Create `by-iara-api` Spring Boot Kotlin project.
- Configure PostgreSQL connection.
- Add Flyway.
- Add Spring Security baseline.
- Add global exception handling.
- Add validation error response format.
- Add local Docker Compose for PostgreSQL.
- Add health endpoint.

Backend quality gates:

- Application starts locally.
- Flyway migrations run cleanly.
- Basic integration test can connect to test database.

### Phase 2: Massage Catalog And Pricing

Deliverables:

- `massage_types`
- `massage_durations`
- `massage_prices`
- Public `GET /api/massage-types`
- Admin CRUD for massage types.
- Admin price management.

Important rules:

- A massage type can be inactive without losing historical reservation data.
- Prices should be versionable or date-aware before the business needs complex pricing.
- Reservation records should snapshot the selected service name, duration, and price at booking time.

### Phase 3: Availability

Deliverables:

- `availability_rules`
- `availability_blocks`
- `GET /api/availability`
- Admin availability management.

Important rules:

- Rules define normal working windows.
- Blocks define exceptions such as holidays, unavailable days, or private appointments.
- Availability responses should hide internal rule details from the public API.
- Time zone should be explicit and consistent.

### Phase 4: Reservations

Deliverables:

- `customers`
- `reservations`
- `POST /api/reservations`
- Admin reservation list.
- Admin confirm and reject actions.

Important rules:

- New reservations start as `PENDING`.
- Validate massage type, duration, price, and requested date/time.
- Store customer details separately from reservation details.
- Snapshot reservation price and service details.
- Prevent invalid status transitions.
- Send email notifications through a domain service, not directly from the controller.

### Phase 5: Admin Authentication

Deliverables:

- `admin_users`
- Password hashing.
- `POST /api/admin/auth/login`
- Protected admin routes.
- Basic role-ready structure.

Important rules:

- Never store plaintext passwords.
- Seed the first admin through migration, CLI task, or secure one-time setup.
- Keep roles simple initially, for example `ADMIN`.
- Design so `SUPER_ADMIN` or staff-level roles can be added later.

### Phase 6: Notifications

Deliverables:

- `email_logs`
- Email sender configuration.
- Reservation request email to admin.
- Reservation confirmation or rejection email to customer.

Important rules:

- Log attempted emails.
- Keep email templates separate from business logic.
- Do not block reservation persistence if email sending fails unless the business explicitly requires it.
- Add retry support later if needed.

### Phase 7: Frontend Website

Deliverables:

- Public service overview.
- Massage type display.
- Reservation request form.
- Availability selection.
- Confirmation state after submission.

Frontend rules:

- Public website should consume only public API endpoints.
- Validate forms on the client, but keep server validation authoritative.
- Keep API client code shared and typed.
- Do not expose admin-only fields or routes in public bundles.

### Phase 8: Admin Dashboard

Deliverables:

- Login page.
- Reservations list.
- Reservation detail view.
- Confirm/reject actions.
- Massage type management.
- Price management.
- Availability management.

Frontend rules:

- Admin dashboard should be a separate app or deployable target.
- Use guarded routes.
- Use pagination and filters for reservation lists.
- Keep state management simple until complexity justifies a heavier solution.

### Phase 9: Deployment And Operations

Deliverables:

- Production environment variables.
- Database backup plan.
- HTTPS and domain setup.
- CORS configuration for `by-iara.com` and `admin.by-iara.com`.
- Logging baseline.
- Error monitoring.
- Basic uptime checks.

Important rules:

- Do not allow wildcard CORS in production.
- Keep secrets outside the repository.
- Run migrations during deployment in a controlled way.
- Back up PostgreSQL before destructive migrations.

## 13. Suggested First Database Migration Order

```text
V001__create_admin_users.sql
V002__create_massage_catalog.sql
V003__create_pricing.sql
V004__create_availability.sql
V005__create_customers.sql
V006__create_reservations.sql
V007__create_email_logs.sql
```

## 14. Testing Strategy

Backend:

- Unit tests for services with business rules.
- Repository tests for queries and constraints.
- Controller integration tests for public and admin APIs.
- Security tests for protected admin routes.
- Migration tests against PostgreSQL.

Frontend:

- Component tests for form-heavy flows.
- API client tests for request/response mapping.
- End-to-end tests for reservation request flow.
- Admin smoke tests for login, list reservations, confirm, and reject.

High-priority test cases:

- Reservation cannot be created for inactive massage type.
- Reservation cannot be created for blocked availability.
- Reservation snapshots price at creation time.
- Admin cannot confirm rejected reservation.
- Unauthenticated admin requests are rejected.

## 15. Security Checklist

- Hash admin passwords with a strong password hashing algorithm.
- Validate all request bodies with Bean Validation.
- Use server-side authorization for every admin endpoint.
- Configure CORS per environment.
- Rate limit login and reservation submission later if abuse appears.
- Avoid leaking internal errors in API responses.
- Store secrets in environment variables or secret manager.
- Keep admin authentication tokens or cookies short-lived.

## 16. Scalability Notes

- Start as a modular monolith, not microservices.
- Keep domain packages independent enough that they can evolve separately.
- Use UUIDs for external-facing identifiers.
- Add pagination before reservation volume grows.
- Keep pricing and availability logic isolated because they are likely to change.
- Snapshot reservation details to protect historical data from catalog and price edits.
- Use database constraints for data integrity, not only application checks.
- Introduce async jobs only when email, reminders, or integrations require it.
- Add observability before traffic grows: structured logs, error monitoring, and basic metrics.

## 17. Open Decisions

These should be decided before implementation starts:

- Frontend framework for `by-iara-web`.
- JWT versus HTTP-only session cookies for admin auth.
- Payment support now or later.
- Whether customers can cancel reservations themselves in v1.
- Email provider.
- Hosting platform for web, API, and PostgreSQL.

## 18. Recommended Immediate Next Steps

1. Create the repository structure.
2. Scaffold `by-iara-api`.
3. Add PostgreSQL and Flyway.
4. Implement database migrations for massage catalog and pricing.
5. Build public `GET /api/massage-types`.
6. Build availability before accepting reservations.
7. Add reservation request flow.
8. Add admin login and reservation management.

