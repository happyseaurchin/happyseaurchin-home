#!/usr/bin/env python3
"""
build.py — stand this session's tools in a pscale block, nine to a ring, and write the tasks.
weft, lane pscale.lab, 20 November 2026.

The tools are the 534 a Claude Code session on happyseaurchin's account held back from the model's window on
20 November 2026 (its deferred tools: Vercel, GitHub, Supabase, Gmail, Google Drive, Calendar and Docs, Stripe, Claude
Docs, the beach through bsp-mcp under five identities, two biomes, and the session's own helpers), each definition
exactly as the session handed it over when it was searched for (session_tools.json).

Writes tree.json (the whole session), tree81.json (nine of each family, the tasks' tools among them, for the flat list
a small model can hold), and tasks.json. A ring's line is written once, here, before any task; a leaf is the tool's
name, its definition kept where the session keeps it.
"""
import json
import random

V = 'mcp__Vercel__'
G = 'mcp__github__'
S = 'mcp__Supabase__'
T = 'mcp__Stripe__'
M = 'mcp__Gmail__'
C = 'mcp__Google_Calendar__'
D = 'mcp__Google_Drive__'
GD = 'mcp__Google_Docs__'
CD = 'mcp__Claude_Docs__'
BSP = ['bsp', 'bsp-floor', 'pscale_stream_engage', 'pscale_pool_engage', 'pscale_play', 'pscale_invite', 'pscale_networking',
       'pscale_grain_reach', 'pscale_key_publish', 'pscale_verify_rider', 'pscale_settle', 'pscale_genus']


def p(prefix, names):
    return [prefix + n for n in names.split()]


def identity(server, line):
    q = 'mcp__' + server + '__'
    return (line, [
        ('Blocks: read and write any block, or its floor', p(q, 'bsp bsp-floor')),
        ("What people are doing, and play: everyone's readings at a moment, pools, and entering a world",
         p(q, 'pscale_stream_engage pscale_pool_engage pscale_play')),
        ('People, grains and keys: invite a newcomer, networking, a grain between two, publishing keys, verifying a rider, settling',
         p(q, 'pscale_invite pscale_networking pscale_grain_reach pscale_key_publish pscale_verify_rider pscale_settle')),
        ("Minds: wake an agent's mind from its shell (genus one)", p(q, 'pscale_genus')),
    ])


SPEC = ('THIS SESSION\'S TOOLS — the 534 tools a Claude Code session held back from its model\'s window, nine families to a ring', [
    ('Code on GitHub: repositories, files and branches, commits and releases, pull requests and reviews, issues, and Actions runs', [
        ('Files and branches in a repository: read, create, change, delete or push files; make or list branches',
         p(G, 'get_file_contents create_or_update_file delete_file push_files create_branch list_branches')),
        ('Commits, tags and releases: look up commits, tags, and the releases cut from them',
         p(G, 'get_commit list_commits get_tag list_tags get_latest_release get_release_by_tag list_releases')),
        ('Pull requests: open, change, read, list and merge them, or set them to merge themselves',
         p(G, 'create_pull_request update_pull_request pull_request_read list_pull_requests merge_pull_request update_pull_request_branch enable_pr_auto_merge disable_pr_auto_merge')),
        ('Reviewing pull requests: write a review, comment on lines, reply, resolve threads, or ask Copilot to review',
         p(G, 'pull_request_review_write add_comment_to_pending_review add_reply_to_pull_request_comment resolve_review_thread unresolve_review_thread request_copilot_review')),
        ('Issues: read, open and change issues and sub-issues, list them, comment on them, and their labels, fields and types',
         p(G, 'issue_read issue_write list_issues add_issue_comment update_issue_comment sub_issue_write list_issue_fields list_issue_types get_label')),
        ('Actions, checks and security: workflow runs, their jobs and logs, check runs, and secret scanning',
         p(G, 'actions_get actions_list actions_run_trigger get_job_logs get_check_run run_secret_scanning')),
        ('Repositories, people and teams: create or fork a repository, its collaborators, yourself, and your teams',
         p(G, 'create_repository fork_repository list_repository_collaborators get_me get_teams get_team_members')),
    ]),
    ('Websites on Vercel: deployments, projects and their settings, domains and DNS, routing and caches, flags, logs and analytics, security and teams, sandboxes, the AI Gateway and CI', [
        ('Deployments: make, cancel and inspect deployments, their files and pages, aliases, promotion and rollback, and rolling releases', [
            ('Deploying: create, cancel, find and open deployments, and what went into each',
             p(V, 'create_deployment cancel_deployment get_deployment list_deployments open_deployments get_git_deployment_context list_deployment_events get_deployment_feature_flags upload_file')),
            ("A deployment's files and pages: read its source files, or fetch a page it serves",
             p(V, 'get_deployment_file_contents list_deployment_files get_access_to_vercel_url web_fetch_vercel_url')),
            ('Aliases, promotion and rollback: point a domain at a deployment, promote one to production, or roll back',
             p(V, 'assign_alias get_alias list_aliases list_deployment_aliases list_promote_aliases request_promote request_rollback')),
            ('Rolling releases: start, advance, finish or configure a staged rollout to production',
             p(V, 'start_rolling_release approve_rolling_release_stage complete_rolling_release get_rolling_release get_rolling_release_billing_status get_rolling_release_config update_rolling_release_config')),
        ]),
        ('Projects: create, change, pause or move projects, their environment variables and environments, and their git repositories', [
            ('Projects themselves: create, find, change, pause, delete, or accept the transfer of a project',
             p(V, 'create_project create_git_project get_project list_projects update_project pause_project unpause_project get_project_deletion_link accept_project_transfer_request')),
            ("Environment variables and environments: set, change, read or filter a project's variables, and its custom environments",
             p(V, 'create_project_env edit_project_env filter_project_envs get_project_env get_shared_env_var get_custom_environment list_project_custom_environments')),
            ('Git and microfrontends: the git accounts and repositories a project can connect to, and its microfrontends',
             p(V, 'git_namespaces search_repo get_microfrontends_config get_microfrontends_config_for_project')),
        ]),
        ('Domains, DNS and certificates: the domains a project serves, domains you hold, buying domains, TLDs, DNS records and certificates', [
            ('A project\'s domains: add, verify, list or inspect the domains a project serves',
             p(V, 'add_project_domain verify_project_domain list_project_domains get_project_domain get_domain_project_domains')),
            ('Domains you hold: find a domain, its configuration and its verification record',
             p(V, 'get_domain list_domains search_domains get_domain_config get_domain_verification_record')),
            ('Buying and transferring domains: check availability and prices, buy or transfer, and follow the order',
             p(V, 'buy_domain create_or_transfer_domain get_domain_availability get_bulk_availability get_domain_price get_bulk_price get_purchase_quote get_order get_domain_order')),
            ('TLDs and registrant contacts: which endings are offered and their prices, and contact details for registering',
             p(V, 'get_tld get_tld_price list_supported_tlds get_domain_contact_verification get_contact_info_schema')),
            ("DNS records: create, change, list or replace a domain's DNS records",
             p(V, 'create_record update_record get_records get_domains_records_by_record_id replace_domain_dns_records')),
            ('Certificates: issue, list or inspect TLS certificates', p(V, 'issue_cert list_certs get_cert_by_id')),
        ]),
        ("Routes, redirects and caches: a project's routing rules, bulk redirects, purging caches, and build artifacts", [
            ("Routes: add, edit, generate, stage and version a project's routing rules",
             p(V, 'add_route edit_route generate_route list_project_routes list_project_route_versions stage_routes update_route_versions')),
            ("Bulk redirects: list, stage, restore and version a project's redirects",
             p(V, 'list_bulk_redirects list_bulk_redirect_versions stage_redirects restore_redirects update_bulk_redirect_version')),
            ('Caches and build artifacts: purge cached content and images, and the remote build cache',
             p(V, 'invalidate_by_src_images invalidate_by_tags get_remote_cache_status artifact_query upload_artifact')),
        ]),
        ('Edge Config and feature flags: key-value stores read at the edge, their backups and tokens; flags, their segments and settings, their projects, and SDK keys', [
            ('Edge Config stores and their items: create, read, change and patch them',
             p(V, 'create_edge_config get_edge_config get_edge_configs update_edge_config patch_edge_config_items get_edge_config_item get_edge_config_items')),
            ('Edge Config backups and tokens: back up and restore a store, and the tokens that read it',
             p(V, 'get_edge_config_backup get_edge_config_backups restore_edge_config_backup create_edge_config_token get_edge_config_token get_edge_config_tokens')),
            ('Feature flags: create, find and change a flag, and see its versions',
             p(V, 'create_flag get_flag list_flags list_flags_v2 update_flag list_flag_versions')),
            ("Flag segments and settings: who a flag targets, and a team's flag settings",
             p(V, 'get_flag_segment list_flag_segments update_flag_segment get_flag_settings update_flag_settings list_team_flag_settings list_team_flags list_team_flags_v2')),
            ('Flags in projects, and SDK keys: connect flags to a project or disconnect them, and the keys an SDK reads them with',
             p(V, 'create_flags_project_connection list_flags_project_connections get_flags_project_disconnection_link create_sdk_key list_feature_flag_sdk_keys')),
        ]),
        ('Logs, analytics and monitoring: runtime logs and errors, traces, web analytics, observability queries, drains and webhooks, and agent runs', [
            ('Runtime logs and errors: what a project logged, its errors, and traces of its requests',
             p(V, 'get_runtime_logs get_runtime_errors get_project_trace create_trace_session')),
            ("Web analytics: count and aggregate events and pageviews, record events, and a user's events",
             p(V, 'aggregate_events count_events list_event_types record_events aggregate_pageviews count_pageviews list_user_events')),
            ("Observability queries: query a project's metrics, the schema to query them by, and which projects are set up for it",
             p(V, 'create_observability_query get_observability_schema get_observability_configuration_projects')),
            ('Drains and webhooks: send logs and traces elsewhere, test a drain, and list webhooks',
             p(V, 'create_drain get_drain list_drains update_drain test_drain get_webhooks')),
            ('Agent runs: runs of AI agents, their traces, and the projects they ran in',
             p(V, 'list_agent_runs get_agent_run get_agent_run_trace list_agent_run_projects')),
        ]),
        ('Security, teams and access: the firewall and attacks, deployment protection, signing keys, teams and members, access groups', [
            ("Firewall and attacks: a project's firewall rules, an attack in progress, and the challenge mode",
             p(V, 'get_firewall_config put_firewall_config update_firewall_config get_active_attack_status update_attack_challenge_mode get_bypass_ip')),
            ('Deployment protection: bypasses that let automation or a URL through protection',
             p(V, 'update_project_protection_bypass patch_url_protection_bypass')),
            ('KMS signing keys: issuers, their policies, and the signing keys they hold',
             p(V, 'create_kms_issuer get_kms_issuer list_kms_issuers update_kms_issuer create_kms_issuer_policy update_kms_issuer_policy create_kms_signing_key activate_kms_signing_key revoke_kms_signing_key')),
            ('Teams, members and sign-in: your teams, their members, team access and single sign-on, and who you are',
             p(V, 'get_team list_teams list_team_members authorize_team_access authorize_team_sso get_auth_user')),
            ('Access groups: groups of members, and the projects they can reach',
             p(V, 'list_access_groups read_access_group list_access_group_members list_access_group_projects read_access_group_project')),
        ]),
        ('Sandboxes and storage: create and run sandboxes, their sessions, commands, files and snapshots, drives and blob stores', [
            ('Sandboxes: create, find, change or delete a sandbox',
             p(V, 'create_sandboxes_v2 create_sandboxes_v3 create_sandboxes_v4 delete_sandbox get_named_sandbox list_named_sandboxes update_sandbox')),
            ('Sandbox sessions: find, stop or extend a session, and its network policy',
             p(V, 'get_session list_sessions stop_session extend_session_timeout update_session_network_policy')),
            ('Commands and files in a session: run commands and read their logs, read or write files',
             p(V, 'run_session_command get_session_command get_session_command_logs kill_session_command list_session_commands read_session_file write_session_files create_session_directory')),
            ('Session snapshots: save a session as a snapshot, find or delete snapshots',
             p(V, 'create_sandboxes_sessions_by_session_id_snapshot_v2 create_sandboxes_sessions_by_session_id_snapshot_v3 get_session_snapshot list_session_snapshots delete_session_snapshot')),
            ('Drives and blob storage: persistent drives, and blob stores',
             p(V, 'delete_drive get_or_create_drive list_drives create_storage_stores_blob get_storage_stores_by_id')),
        ]),
        ('The AI Gateway, CI, comments, imports, billing and integrations', [
            ('AI Gateway models and usage: the models offered, usage, the leaderboard, and budgets',
             p(V, 'get_ai_gateway_model list_ai_gateway_models get_ai_gateway_usage get_ai_gateway_leaderboard list_ai_gateway_budgets upsert_ai_gateway_budget upsert_ai_gateway_budget_default')),
            ('AI Gateway rules and virtual models: routing rules, and the virtual models they make',
             p(V, 'create_ai_gateway_rule update_ai_gateway_rule list_ai_gateway_rules create_ai_gateway_virtual_model update_ai_gateway_virtual_model get_ai_gateway_virtual_model list_ai_gateway_virtual_models')),
            ('Vercel CI runs: invocations, their logs and attempts, retries and checks',
             p(V, 'get_vercel_ci_invocation get_vercel_ci_invocation_logs get_vercel_ci_invocation_tree list_vercel_ci_invocation_attempts list_vercel_ci_invocations retry_vercel_ci_invocation rerequest_check')),
            ('Vercel CI jobs and tasks: job and task definitions, their runs, and their logs',
             p(V, 'get_vercel_ci_job_definition get_vercel_ci_job_run get_vercel_ci_job_run_logs get_vercel_ci_task_logs get_vercel_ci_task_run_logs list_vercel_ci_job_definitions list_vercel_ci_job_runs list_vercel_ci_task_definitions list_vercel_ci_task_runs')),
            ("Toolbar comments: threads left on a deployment's pages, replies, reactions and resolving",
             p(V, 'add_toolbar_reaction change_toolbar_thread_resolve_status edit_toolbar_message get_toolbar_thread list_toolbar_threads reply_to_toolbar_thread')),
            ("Board threads: channels and threads on the team's board, replies, labels and reactions",
             p(V, 'get_board_identity get_board_thread label_board_message list_board_channels list_board_threads react_to_board_message reply_to_board_thread start_board_thread wait_for_board_changes')),
            ('Imports from Claude: bring in a Claude dashboard, design or motion piece by its URL, and follow the import',
             p(V, 'import-claude-dashboard-from-url import-claude-design-from-url import-claude-motion-from-url get-dashboard-import-job-status get-design-import-job-status get-motion-import-job-status')),
            ("Billing, integrations, documentation and feedback: charges, commitments, marketplace integrations, searching Vercel's docs, sending feedback",
             p(V, 'list_billing_charges list_contract_commitments list_integration_configurations list_integration_configuration_products list_integration_billing_plans get_configuration search_vercel_documentation submit_feedback')),
            ('Connectors: connectors, and the projects they are linked to',
             p(V, 'list_connectors get_connector update_connector list_connector_project_connections get_connector_project_connection upsert_connector_project_connection list_project_connector_connections')),
        ]),
    ]),
    ('Databases and backends on Supabase: projects and organisations, SQL, tables and migrations, branches, edge functions, notebooks, logs and advice', [
        ('Projects and organisations: create, find, pause or restore a project, its URL and keys, and your organisations',
         p(S, 'create_project get_project list_projects pause_project restore_project get_project_url get_publishable_keys get_organization list_organizations')),
        ('SQL, tables and migrations: run SQL, list tables and extensions, apply and list migrations, generate types',
         p(S, 'execute_sql list_tables list_extensions apply_migration list_migrations generate_typescript_types')),
        ("Branches: a project's development branches — create, delete, list, merge, rebase or reset them",
         p(S, 'create_branch delete_branch list_branches merge_branch rebase_branch reset_branch')),
        ('Edge functions: deploy, find or list them, and set their secrets',
         p(S, 'deploy_edge_function get_edge_function list_edge_functions create_edge_function_secret')),
        ('Notebooks: create, run, find or delete SQL notebooks',
         p(S, 'create_notebook run_notebook get_notebook list_notebooks delete_notebook')),
        ("Logs, advice, documentation and feedback: query logs, security and performance advisors, search Supabase's docs, send feedback",
         p(S, 'query_logs get_advisors search_docs submit_feedback delete_feedback')),
    ]),
    ('Money with Stripe: sending and moving money and converting currency, the Stripe API, accounts and analytics, documentation and planning', [
        ('Sending and moving money: pay a recipient, move money between balances, set up a recipient, convert currency, see balances',
         p(T, 'send_money transfer_money setup_recipient convert_currency get_balance_summary')),
        ('The Stripe API: search for an operation, see its parameters, and read or write through it',
         p(T, 'stripe_api_search stripe_api_details stripe_api_read stripe_api_write')),
        ('Accounts, analytics and companies: your accounts, managing them, Sigma and metrics analysis, forming a company',
         p(T, 'list_available_accounts_or_orgs manage_stripe_accounts stripe_analytics atlas_company_formation')),
        ("Documentation, planning and feedback: search Stripe's docs, plan an integration, send feedback",
         p(T, 'search_stripe_documentation stripe_implementation_planner send_stripe_feedback')),
    ]),
    ('Email in Gmail: find and read mail, send and reply, drafts, labels, spam and trash', [
        ('Finding and reading mail: search threads, read a thread or a message, download an attachment',
         p(M, 'search_threads get_thread get_message download_gmail_attachment')),
        ('Sending: send a new message, reply, or forward', p(M, 'send_message reply forward')),
        ('Drafts: create, read, list, change or delete drafts', p(M, 'create_draft get_draft list_drafts update_draft delete_draft')),
        ('Labels themselves: create, change, delete or list labels', p(M, 'create_label update_label delete_label list_labels')),
        ('Labelling mail: add or remove labels on messages and threads, including sensitive labels',
         p(M, 'label_message label_thread unlabel_message unlabel_thread update_message_labels apply_sensitive_message_label apply_sensitive_thread_label')),
        ('Spam and trash: mark or unmark spam, trash or restore messages and threads',
         p(M, 'mark_message_spam mark_thread_spam unmark_message_spam unmark_thread_spam trash_message trash_thread untrash_message untrash_thread')),
    ]),
    ('Google Calendar: events and meetings — find them, make them, change them, answer invitations, and find a free time',
     p(C, 'list_events search_events get_event create_event update_event delete_event respond_to_event suggest_time list_calendars')),
    ('Documents and files: Google Drive files and shared drives, Google Docs, and Claude Docs', [
        ('Finding and reading Drive files: search, recent files, read or download a file, its details and its revisions',
         p(D, 'search_files list_recent_files read_file_content download_file_content get_file_metadata list_file_revisions')),
        ('Making and changing Drive files: create, copy, change or trash a file', p(D, 'create_file copy_file update_file trash_file')),
        ('Sharing on Drive: share a file, see who can open it, ask for access', p(D, 'share_file get_file_permissions request_access')),
        ('Shared drives: create, find, list or change shared drives',
         p(D, 'create_shared_drive get_shared_drive_metadata list_shared_drives update_shared_drive')),
        ('Google Docs: read a Doc, or change it', p(GD, 'read_doc update_doc')),
        ("Claude Docs: create things in a doc, delete them, export a doc, read it, or query its comments",
         p(CD, 'create delete export read query')),
    ]),
    ('The beach: pscale blocks on federated beaches through bsp-mcp, under one of five identities, and two biomes', [
        identity('bsp_as_weft', "As weft: every write signed as weft, Claude's own shell"),
        identity('bsp_me', 'As happyseaurchin (David): every write signed as David'),
        identity('janus', 'As janus: every write signed as janus'),
        identity('SALT_davidmpinto', "As davidmpinto, on SALT's own beach (beach.bringingtheflavour.com)"),
        identity('bsp-mcp', 'The open connector, with no identity: reads anything, writes only with a key in hand'),
        ('The biome commons: a small public text world and noticeboard', p('mcp__biome-mcp__', 'spark play meet')),
        ('The realworld biome: another small public text world and noticeboard', p('mcp__realworld-biome__', 'spark play meet')),
    ]),
    ("This session's own helpers: task lists and background tasks, schedules and monitors, messages and notifications, skills, plugins and connectors, MCP resources, artifacts and designs, notebooks and worktrees, and the web", [
        ("Task lists and background tasks: make, read, list and update the session's task list, or stop a background task",
         'TaskCreate TaskGet TaskList TaskUpdate TaskStop'.split()),
        ('Time and watching: schedule a prompt to run later, list or delete those, and watch a long-running script',
         'CronCreate CronList CronDelete Monitor'.split()),
        ('Messages and notifications: message another agent, or notify the person on their desktop', 'SendMessage PushNotification'.split()),
        ('Skills, plugins and connectors: list and search skills and plugins, suggest installing one, list or suggest connectors, search the MCP registry',
         'ListSkills SearchSkills ListPlugins SearchPlugins SuggestPluginInstall ListConnectors SuggestConnectors SearchMcpRegistry'.split()),
        ('MCP resources: list the resources a server offers, and read them', 'ListMcpResourcesTool ReadMcpResourceTool ReadMcpResourceDirTool'.split()),
        ("Artifacts and designs: comments on an artifact, its shared database, and syncing a design", 'ArtifactComments ArtifactData DesignSync'.split()),
        ('Notebooks and worktrees: edit a Jupyter notebook, enter or leave a git worktree', 'NotebookEdit EnterWorktree ExitWorktree'.split()),
        ('The web: search it', ['WebSearch']),
    ]),
])

# 45 tasks, five a family, each needing one tool; a task names no tool, and accepts every tool that does what it asks
TASKS = [
    ('Open a pull request on happyseaurchin/happyseaurchin-home from the branch lab-tables into main.', [G + 'create_pull_request']),
    ('Show me the open issues labelled bug in pscale-commons/bsp-mcp-server.', [G + 'list_issues']),
    ('The last workflow run failed: get the logs of the job that failed.', [G + 'get_job_logs']),
    ('Read the README file at the top of the repository pscale-commons/pscale-beach.', [G + 'get_file_contents']),
    ('Fork the repository anthropics/claude-code into my own account.', [G + 'fork_repository']),
    ('My site is failing in production: show me its most frequent runtime errors.', [V + 'get_runtime_errors', V + 'get_runtime_logs']),
    ('Roll production back to the previous deployment.', [V + 'request_rollback']),
    ('Add the domain lab.happyseaurchin.com to my Vercel project.', [V + 'add_project_domain']),
    ('Set an environment variable API_URL on the project, for production.', [V + 'create_project_env', V + 'edit_project_env']),
    ("Block traffic from one IP address with the project's firewall.", [V + 'update_firewall_config', V + 'put_firewall_config']),
    ('Run this SQL on my database: select count(*) from pscale_blocks.', [S + 'execute_sql']),
    ('Which tables are in the public schema of my Supabase project?', [S + 'list_tables']),
    ('Deploy the edge function in ./functions/hello to my Supabase project.', [S + 'deploy_edge_function']),
    ('Check my Supabase database for security and performance problems.', [S + 'get_advisors']),
    ('Make a development branch of my Supabase project.', [S + 'create_branch']),
    ('How much money is in my Stripe balances right now?', [T + 'get_balance_summary']),
    ('Pay £50 from our Stripe financial account to our supplier, who is already set up as a recipient.', [T + 'send_money']),
    ('How many new subscriptions did we get last month, by plan?', [T + 'stripe_analytics']),
    ('Which Stripe API operation refunds a charge, and what parameters does it take?', [T + 'stripe_api_search', T + 'stripe_api_details']),
    ('Convert 1,000 US dollars into euros.', [T + 'convert_currency']),
    ("Find the email from James about Thursday's meeting.", [M + 'search_threads']),
    ("Reply to that email saying I'll be there.", [M + 'reply']),
    ('Save the PDF attached to that message.', [M + 'download_gmail_attachment']),
    ("Start an email to Matthew about the beach venture, but don't send it yet.", [M + 'create_draft']),
    ('This newsletter is spam: mark the whole conversation as spam.', [M + 'mark_thread_spam']),
    ("What's on my calendar tomorrow?", [C + 'list_events', C + 'search_events']),
    ('Book a meeting with Sam on Monday at 10am for an hour.', [C + 'create_event']),
    ('Find a time next week when David and Matthew are both free.', [C + 'suggest_time']),
    ("Accept the invitation to Friday's board meeting.", [C + 'respond_to_event']),
    ("Move Thursday's call to 3pm.", [C + 'update_event']),
    ('Find the spreadsheet called Beach budget in my Google Drive.', [D + 'search_files']),
    ('Share the proposal document on Drive with matthew@example.com so he can edit it.', [D + 'share_file']),
    ('Read the Google Doc with the ID 1AbC and tell me what it says.', [GD + 'read_doc', D + 'read_file_content']),
    ('Export my Claude Doc about the venture as a Word file.', [CD + 'export']),
    ('Show me the earlier versions of the budget file on Drive.', [D + 'list_file_revisions']),
    ('As weft, read the block strata on the beach.', ['mcp__bsp_as_weft__bsp']),
    ("Say in David's own mirror on the beach what he is doing today.", ['mcp__bsp_me__pscale_stream_engage']),
    ("Post a note in SALT's pool on SALT's own beach, as davidmpinto.", ['mcp__SALT_davidmpinto__pscale_pool_engage']),
    ("As janus, wake an agent's mind from its shell.", ['mcp__janus__pscale_genus']),
    ("Leave a note on the realworld biome's noticeboard.", ['mcp__realworld-biome__spark']),
    ('Search the web for the latest Qwen model release.', ['WebSearch']),
    ('Every weekday at 9am, run a prompt that checks the build.', ['CronCreate']),
    ('Change cell 3 of the notebook analysis.ipynb.', ['NotebookEdit']),
    ('Which of my skills could help with spreadsheets?', ['SearchSkills', 'ListSkills']),
    ('Tell the other agent, the one working on the eye, that the tests pass.', ['SendMessage']),
]


def block(spec):
    line, kids = spec
    node = {'_': line}
    assert len(kids) <= 9, (line, len(kids))
    for i, k in enumerate(kids):
        node[str(i + 1)] = k if isinstance(k, str) else block(k)
    return node


def tree_of(spec):
    line, kids = spec
    if kids and isinstance(kids[0], str):
        return {'_': line, **{str(i + 1): k for i, k in enumerate(kids)}}
    return block(spec)


def build(spec):
    line, kids = spec
    node = {'_': line}
    assert len(kids) <= 9, (line[:40], len(kids))
    for i, k in enumerate(kids):
        node[str(i + 1)] = k if isinstance(k, str) else build(k)
    return node


def names_in(node):
    if isinstance(node, str):
        return [node]
    return [n for d in '123456789' if d in node for n in names_in(node[d])]


def main():
    tools = {t['name']: t for t in json.load(open('session_tools.json'))}
    tree = build(SPEC)
    names = names_in(tree)
    assert len(names) == len(set(names)), 'a tool stands twice'
    missing = sorted(set(tools) - set(names))
    unknown = sorted(set(names) - set(tools))
    assert not unknown, unknown
    assert not missing, missing
    tasks = [{'id': i + 1, 'task': t, 'accept': a} for i, (t, a) in enumerate(TASKS)]
    for t in tasks:
        assert all(a in tools for a in t['accept']), t
    json.dump(tree, open('tree.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(tasks, open('tasks.json', 'w'), ensure_ascii=False, indent=1)
    # nine of each family: its five tasks' tools, and four more drawn from the family by a fixed seed
    rnd = random.Random(20261120)
    small = {'_': "THIS SESSION'S TOOLS, NINE OF EACH FAMILY — 81 of the 534, the tasks' own tools among them"}
    for f in '123456789':
        fam = tree[f]
        pool = names_in(fam)
        want = [t['accept'][0] for t in tasks if t['accept'][0] in pool]
        rest = [n for n in pool if n not in want]
        pick = set(want) | set(rnd.sample(rest, 9 - len(want)))
        small[f] = {'_': fam['_'], **{str(i + 1): n for i, n in enumerate([n for n in pool if n in pick])}}
    json.dump(small, open('tree81.json', 'w'), ensure_ascii=False, indent=1)
    # the largest flat list a 1.5B model's window holds whole: three of each family, the tools of each family's first
    # three tasks (29,227 tokens of definitions against a window of 32,768), with those 27 tasks
    tasks27 = [t for i, t in enumerate(tasks) if i % 5 < 3]
    tiny = {'_': "THIS SESSION'S TOOLS, THREE OF EACH FAMILY — 27 of the 534, each one a task's tool"}
    for f in '123456789':
        pool = names_in(tree[f])
        want = [t['accept'][0] for t in tasks27 if t['accept'][0] in pool]
        tiny[f] = {'_': tree[f]['_'], **{str(i + 1): n for i, n in enumerate([n for n in pool if n in want])}}
    json.dump(tiny, open('tree27.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(tasks27, open('tasks27.json', 'w'), ensure_ascii=False, indent=1)
    depth = {}
    def walk(node, d):
        for k in '123456789':
            if k in node:
                if isinstance(node[k], str):
                    depth[d + 1] = depth.get(d + 1, 0) + 1
                else:
                    walk(node[k], d + 1)
    walk(tree, 0)
    print(f'tree.json: {len(names)} tools; steps to a tool: {dict(sorted(depth.items()))}')
    print(f'tree81.json: {len(names_in(small))} tools; tasks.json: {len(tasks)} tasks')


if __name__ == '__main__':
    main()
