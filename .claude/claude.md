# Workflow
- Be sure to typecheck when you’re done making a series of code changes
- Always consider the database design when making chages. Make sure to sattisfy the foreign key dependencies
- Never perform database migrations that will result in lost data
- Make sure to nto access database from presentation layer (e.g. page components) directly, ALWAYS go through Service Layer


# Architecture
┌─────────────────────────────────────┐
│   Presentation Layer                │
│  ┌──────────┐      ┌──────────┐    │
│  │ Web App  │      │ Mobile   │    │
│  │ (Server  │      │   API    │    │
│  │ Actions) │      │ Routes   │    │
│  └────┬─────┘      └────┬─────┘    │
├───────┴──────────────────┴──────────┤
│      Business Logic Layer           │
│  ┌────────────────────────────┐    │
│  │    Service Layer           │    │
│  │  • unit-service            │    │
│  │  • tenancy-service         │    │
│  │  • contractor-service      │    │
│  │  • ticket-service          │    │
│  └──────────┬─────────────────┘    │
├─────────────┴──────────────────────┤
│       Data Access Layer             │
│  ┌────────────────────────────┐    │
│  │    Prisma ORM              │    │
│  └──────────┬─────────────────┘    │
├─────────────┴──────────────────────┤
│         Database                    │
│  ┌────────────────────────────┐    │
│  │    PostgreSQL              │    │
│  └────────────────────────────┘    │
└─────────────────────────────────────┘