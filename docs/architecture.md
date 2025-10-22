```mermaid
graph TD
  %% ========================
  %% SETUP / PORTABILITY
  %% ========================
  subgraph Setup & Portability
    T0_project_scaffold["T0_project_scaffold<br/>Create repo & Next.js app (apps/web)"]
    T0_env_basics["T0_env_basics<br/>Env & secrets structure"]
    T0_pkg_install["T0_pkg_install<br/>Install core deps"]
    T0_repo_layout["T0_repo_layout<br/>Monorepo layout (apps/packages)"]
    T0_ports_adapters["T0_ports_adapters<br/>Define ports (Email/WA/AI/Storage/Search)"]
    T0_next_standalone["T0_next_standalone<br/>Next.js standalone build (Node runtime)"]
    T0_docker_web["T0_docker_web<br/>Dockerfile for web"]
    T0_worker_scaffold["T0_worker_scaffold<br/>Worker app scaffold"]
    T0_docker_worker["T0_docker_worker<br/>Dockerfile for worker"]
  end

  T0_project_scaffold --> T0_env_basics
  T0_project_scaffold --> T0_pkg_install
  T0_project_scaffold --> T0_repo_layout
  T0_project_scaffold --> T0_next_standalone
  T0_next_standalone --> T0_docker_web
  T0_repo_layout --> T0_ports_adapters
  T0_repo_layout --> T0_worker_scaffold
  T0_worker_scaffold --> T0_docker_worker

  %% ========================
  %% DATABASE / AUTH
  %% ========================
  subgraph "Database & Auth (Supabase + Prisma)"
    T1_supabase_project["T1_supabase_project<br/>Create Supabase project"]
    T1_prisma_init["T1_prisma_init<br/>Prisma init + DATABASE_URL"]
    T1_schema_model["T1_schema_model<br/>DB schema (users/units/tenants/tickets/messages/contractors/agent_events)"]
    T1_prisma_migrate["T1_prisma_migrate<br/>Initial migration"]
    T1_db_helpers["T1_db_helpers<br/>DB helper layer"]
    T2_auth_single_admin["T2_auth_single_admin<br/>Single admin auth"]
    T12_users_roles_rls_schema["T12_users_roles_rls_schema<br/>Users/roles + RLS-ready columns"]
    T12_users_roles_migrate["T12_users_roles_migrate<br/>Apply users/roles migration"]
  end

  T0_pkg_install --> T1_prisma_init
  T1_supabase_project --> T1_prisma_init
  T1_prisma_init --> T1_schema_model --> T1_prisma_migrate --> T1_db_helpers
  T1_supabase_project --> T2_auth_single_admin
  T1_prisma_migrate --> T12_users_roles_rls_schema --> T12_users_roles_migrate

  %% ========================
  %% AI CORE
  %% ========================
  subgraph "AI Core (OpenAI)"
    T3_openai_client["T3_openai_client<br/>Client + system prompt"]
    T3_tools_contracts["T3_tools_contracts<br/>Tool schemas (triage/search_contractors)"]
    T3_reasoner["T3_reasoner<br/>Reasoning loop + tool calls"]
  end

  T0_env_basics --> T3_openai_client
  T0_pkg_install --> T3_openai_client
  T3_openai_client --> T3_tools_contracts --> T3_reasoner
  T1_db_helpers --> T3_reasoner

  %% ========================
  %% ADAPTERS
  %% ========================
  subgraph "Adapters (Ports -> Providers)"
    T3_adapter_gmail["T3_adapter_gmail<br/>Gmail adapter"]
    T3_adapter_wa["T3_adapter_wa<br/>WhatsApp Cloud adapter (RX)"]
    T3_adapter_storage["T3_adapter_storage<br/>Supabase Storage adapter"]
    T3_adapter_ai["T3_adapter_ai<br/>OpenAI adapter"]
  end

  T0_ports_adapters --> T3_adapter_gmail
  T0_ports_adapters --> T3_adapter_wa
  T0_ports_adapters --> T3_adapter_storage
  T0_ports_adapters --> T3_adapter_ai
  T3_reasoner --> T3_adapter_ai
  T1_supabase_project --> T3_adapter_storage

  %% ========================
  %% EMAIL
  %% ========================
  subgraph "Email (Gmail)"
    T4_gmail_oauth["T4_gmail_oauth<br/>Gmail OAuth setup"]
    T4_gmail_inbound["T4_gmail_inbound<br/>Inbound label polling API"]
    T4_gmail_outbound["T4_gmail_outbound<br/>Send via Gmail API"]
    T4_cron_ingest["T4_cron_ingest<br/>Worker cron for polling"]
  end

  T0_env_basics --> T4_gmail_oauth
  T4_gmail_oauth --> T3_adapter_gmail
  T4_gmail_oauth --> T4_gmail_inbound
  T4_gmail_oauth --> T4_gmail_outbound
  T1_db_helpers --> T4_gmail_inbound
  T3_reasoner --> T4_gmail_inbound
  T0_worker_scaffold --> T4_cron_ingest
  T4_gmail_inbound --> T4_cron_ingest

  %% ========================
  %% WHATSAPP (RX)
  %% ========================
  subgraph "WhatsApp (receive-only)"
    T5_wa_cloud_app["T5_wa_cloud_app<br/>Meta Cloud app setup"]
    T5_wa_webhook["T5_wa_webhook<br/>Inbound WA webhook"]
  end

  T0_env_basics --> T5_wa_cloud_app
  T5_wa_cloud_app --> T3_adapter_wa
  T1_db_helpers --> T5_wa_webhook
  T3_adapter_wa --> T5_wa_webhook

  %% ========================
  %% CONTRACTORS
  %% ========================
  subgraph "Contractor Discovery"
    T6_contractor_crud["T6_contractor_crud<br/>Directory CRUD (UI+API)"]
    T6_external_search["T6_external_search<br/>External lookup (Yelp/Places)"]
    T6_tool_handler["T6_tool_handler<br/>search_contractors tool handler"]
  end

  T1_db_helpers --> T6_contractor_crud
  T1_db_helpers --> T6_external_search
  T3_reasoner --> T6_tool_handler
  T6_external_search --> T6_tool_handler
  T6_contractor_crud --> T6_tool_handler

  %% ========================
  %% UI
  %% ========================
  subgraph "UI (Next.js)"
    T7_ui_inbox["T7_ui_inbox<br/>Inbox list + filters"]
    T7_ui_ticket_detail["T7_ui_ticket_detail<br/>Ticket detail + timeline"]
    T7_ui_composer["T7_ui_composer<br/>Agent composer (approve/send)"]
    T7_ui_contractor_panel["T7_ui_contractor_panel<br/>Suggestion panel"]
    T7_ui_settings["T7_ui_settings<br/>Channels & templates"]
  end

  T2_auth_single_admin --> T7_ui_inbox
  T1_db_helpers --> T7_ui_inbox
  T7_ui_inbox --> T7_ui_ticket_detail
  T3_reasoner --> T7_ui_ticket_detail
  T4_gmail_outbound --> T7_ui_ticket_detail
  T5_wa_webhook --> T7_ui_ticket_detail
  T6_tool_handler --> T7_ui_ticket_detail
  T7_ui_ticket_detail --> T7_ui_composer
  T4_gmail_outbound --> T7_ui_composer
  T6_tool_handler --> T7_ui_contractor_panel
  T7_ui_composer --> T7_ui_contractor_panel
  T4_gmail_oauth --> T7_ui_settings
  T5_wa_cloud_app --> T7_ui_settings
  T2_auth_single_admin --> T7_ui_settings

  %% ========================
  %% SAFETY / SEARCH / FILES
  %% ========================
  subgraph "Safety, Search & Files"
    T8_urgency_rules["T8_urgency_rules<br/>Urgent detection + banner"]
    T9_fulltext_search["T9_fulltext_search<br/>Postgres FTS"]
    T9_attachments["T9_attachments<br/>Storage & previews"]
  end

  T3_reasoner --> T8_urgency_rules
  T7_ui_ticket_detail --> T8_urgency_rules
  T1_prisma_migrate --> T9_fulltext_search
  T7_ui_inbox --> T9_fulltext_search
  T1_supabase_project --> T9_attachments
  T7_ui_ticket_detail --> T9_attachments
  T3_adapter_storage --> T9_attachments

  %% ========================
  %% /v1 BFF (Mobile-ready)
  %% ========================
  subgraph "BFF /v1 (Mobile-ready)"
    T12_api_versioning["T12_api_versioning<br/>/v1 namespace + error contract"]
    T12_auth_jwt_middleware["T12_auth_jwt_middleware<br/>Supabase JWT middleware"]
    T12_openapi_spec["T12_openapi_spec<br/>OpenAPI spec"]
    T12_api_tickets["T12_api_tickets<br/>Create/List/Get"]
    T12_api_messages["T12_api_messages<br/>Create & send"]
    T12_api_contractor_search["T12_api_contractor_search<br/>HTTP contractor search"]
    T12_signed_uploads["T12_signed_uploads<br/>Signed URLs for storage"]
    T12_devices_register["T12_devices_register<br/>Device token registry"]
    T12_event_bus["T12_event_bus<br/>Message events + consumer stub"]
    T12_worker_notify_stub["T12_worker_notify_stub<br/>Worker notification hook"]
    T12_realtime_channels["T12_realtime_channels<br/>Changefeeds (docs)"]
    T12_rate_limit["T12_rate_limit<br/>Per-user limiter"]
    T12_cors["T12_cors<br/>CORS for web/mobile"]
    T12_client_sdk["T12_client_sdk<br/>Generate typed client from OpenAPI"]
    T12_tests_contract["T12_tests_contract<br/>API contract tests"]
    T12_docs_mobile_ready["T12_docs_mobile_ready<br/>Mobile-ready API docs"]
  end

  T7_ui_inbox --> T12_api_versioning
  T3_reasoner --> T12_api_versioning
  T2_auth_single_admin --> T12_auth_jwt_middleware
  T12_api_versioning --> T12_auth_jwt_middleware
  T12_api_versioning --> T12_openapi_spec

  T12_auth_jwt_middleware --> T12_api_tickets
  T1_db_helpers --> T12_api_tickets
  T12_users_roles_migrate --> T12_api_tickets

  T12_auth_jwt_middleware --> T12_api_messages
  T4_gmail_outbound --> T12_api_messages
  T9_attachments --> T12_api_messages
  T1_db_helpers --> T12_api_messages

  T6_tool_handler --> T12_api_contractor_search
  T12_auth_jwt_middleware --> T12_api_contractor_search

  T1_supabase_project --> T12_signed_uploads
  T9_attachments --> T12_signed_uploads
  T12_auth_jwt_middleware --> T12_signed_uploads

  T12_users_roles_migrate --> T12_devices_register

  T12_api_messages --> T12_event_bus
  T4_gmail_inbound --> T12_event_bus
  T5_wa_webhook --> T12_event_bus
  T12_event_bus --> T12_worker_notify_stub

  T1_supabase_project --> T12_realtime_channels
  T12_api_tickets --> T12_realtime_channels
  T12_api_messages --> T12_realtime_channels

  T12_auth_jwt_middleware --> T12_rate_limit
  T12_api_versioning --> T12_cors

  T12_openapi_spec --> T12_client_sdk
  T12_api_tickets --> T12_client_sdk
  T12_api_messages --> T12_client_sdk
  T12_api_contractor_search --> T12_client_sdk
  T12_signed_uploads --> T12_client_sdk
  T12_devices_register --> T12_client_sdk

  T12_auth_jwt_middleware --> T12_tests_contract
  T12_api_tickets --> T12_tests_contract
  T12_api_messages --> T12_tests_contract
  T12_signed_uploads --> T12_tests_contract

  T12_realtime_channels --> T12_docs_mobile_ready
  T12_client_sdk --> T12_docs_mobile_ready
  T12_openapi_spec --> T12_docs_mobile_ready

  %% ========================
  %% DEPLOY / POLISH / BACKLOG
  %% ========================
  subgraph "Deploy & Polish"
    T10_deploy_vercel["T10_deploy_vercel<br/>Deploy web (Vercel)"]
    T10_worker_host["T10_worker_host<br/>Host worker (Render/Fly)"]
    T10_logging["T10_logging<br/>Structured logs + token metrics"]
    T10_seed_data["T10_seed_data<br/>Seed script"]
    T11_templates["T11_templates<br/>Message templates"]
    T11_readme["T11_readme<br/>README runbook"]
  end

  T7_ui_inbox --> T10_deploy_vercel
  T7_ui_ticket_detail --> T10_deploy_vercel
  T4_cron_ingest --> T10_deploy_vercel

  T0_docker_worker --> T10_worker_host
  T4_cron_ingest --> T10_worker_host

  T3_reasoner --> T10_logging
  T1_db_helpers --> T10_logging

  T1_db_helpers --> T10_seed_data

  T7_ui_composer --> T11_templates

  T10_deploy_vercel --> T11_readme
  T10_worker_host --> T11_readme

  %% Backlog
  subgraph Backlog / Later
    B1_wa_outbound["B1_wa_outbound<br/>WhatsApp outbound + templates"]
    B2_voice_phase2["B2_voice_phase2<br/>Voice/IVR (Realtime API)"]
    B3_metrics["B3_metrics<br/>Metrics dashboard"]
  end

  T5_wa_webhook --> B1_wa_outbound
  T7_ui_composer --> B1_wa_outbound
  T3_reasoner --> B2_voice_phase2
  T10_logging --> B3_metrics
