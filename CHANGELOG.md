# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Added separate administrator guides for Rev.io payment and provisioning, contact-form operation, state sales-tax setup, daily Shopify operation, and domain, hosting, and ownership transfer.
- Added a repository-maintenance decision that defines `main` as the client-operational Shopify source.

### Changed

- Updated the repository's canonical Shopify theme snapshot to match the currently published theme and documented the live-theme pull and verification workflow.
- Updated the store and Rev.io documentation for the current requested-area-code and discount/referral/customer-ID collection behavior.
- Reduced local verification to maintained Shopify setup helpers and Theme Check.
- Clarified that Rev.io, payment, CRM, telecom-tax, and provisioning backends are future separately hosted integrations, not deployed components of this repository.

### Removed

- Removed the duplicate Refresh overlay theme source and its obsolete application workflow; `independence-phone-theme/` is now the only canonical theme directory.
- Removed build-era specs, dated QA captures, creative and brief source material, simulated visual previews, internal agent logs, stale handoff documents, and unapproved backend prototypes from maintained `main`.
- Preserved the complete pre-cleanup repository at `archive/pre-cleanup-2026-08-27` and in Git history.
