# Legal and privacy launch checklist

This checklist is intentionally tracked in the repository so the temporary blank
legal fields cannot be mistaken for launch-ready content.

## Required business details

Fill every value in
`by-iara-web/apps/website/src/app/legal/business-details.ts`:

- [ ] Legal name and legal form
- [ ] NIF/NIPC
- [ ] Full registered business address
- [ ] Public email, privacy email, and telephone number
- [ ] Commercial registry, registration number, and share capital when applicable
- [x] Accepted in-person payment methods: cash, MB WAY, and bank transfer
- [x] Cancellation notice period: 24 hours
- [x] Cancellation policy: first late cancellation has no penalty; repeated late cancellations may require a €15 deposit deducted from the session price
- [ ] Operational booking-data retention period
- [ ] ADR/RAL body and URL if the business is legally bound or has joined one

## Registrations and professional review

- [ ] Register for the Electronic Complaints Book and verify the website link
- [ ] Confirm whether the activity is wellness massage or regulated healthcare
- [ ] If the service is healthcare, confirm ERS registration/licensing and update the legal copy
- [ ] Have Portuguese counsel or a qualified compliance professional review the final Portuguese text
- [ ] Confirm that every displayed consumer price includes applicable taxes

## Privacy operations

- [ ] Record the actual hosting, database, email, calendar, backup, and accounting providers
- [ ] Sign GDPR processor agreements with providers that process customer data
- [ ] Verify whether any provider transfers data outside the EEA and document safeguards
- [ ] Implement scheduled deletion or anonymisation matching the published retention period
- [ ] Document a process for access, correction, deletion, objection, and portability requests
- [ ] Document personal-data breach assessment and CNPD notification procedures
- [ ] Keep booking notes restricted to logistics; design a separate compliant health-data process before collecting health information
- [ ] Set `BUSINESS_PHONE` for confirmation emails and publish the same telephone number in the website legal details

## Before each production release

- [ ] Confirm that no analytics, advertising pixel, embedded third-party media, or optional cookie was added
- [ ] If optional tracking was added, implement prior consent with equivalent accept and reject choices
- [ ] Recheck the privacy policy whenever providers, purposes, fields, retention, or cookie usage changes
- [ ] Send the price, confirmed time, payment method, cancellation rules, business identity, and legal links in the confirmation email
