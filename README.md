# Vardhman A&E Threads · Dealer Portal

A B2B sales pilot for requesting Vardhman A&E thread articles and progressing them through quote, confirmation, dispatch and delivery.

## Workflows

- Browse 63 product families imported from the public catalog, with links to official specifications, shade cards and technical resources.
- Create multi-line requests with a product, article or size, shade, quantity, packaging unit and delivery destination.
- Estimate lead time and freight using illustrative rules. Company staff supply the actual quote and lead time.
- Invite dealer accounts and review incoming requests as sales staff. Issue a quote, record the shipment and mark delivery after the dealer accepts.
- Model resale price, markup, gross margin and GST. Record private resale proceeds and actual profit on delivered orders. Export requests, quotes and pricing scenarios as CSV.
- Preview the experience in demo mode. Demo records live in the current browser tab session.

## Run locally

Use Node.js 24 or later. Configure DATABASE_URL in an ignored .env.local file with a dedicated PostgreSQL database accessible through Neon.

    npm ci
    npm run db:setup
    npm run dev:api
    npm run dev

Run the final two commands in separate terminals. Open the address Vite prints.

## Deployment and account setup

Deploy the Vite project on Vercel and set DATABASE_URL in the production environment. Initialize the database against that environment before onboarding staff. Use a separate database for any preview deployment that should accept sign-ins.

Create the first staff invitation from a trusted terminal with access to the intended database:

    npm run invite -- staff work-email@example.com

Share the code privately. The recipient chooses **Sign in**, then **Activate an invitation**, and enters their details. Invitations are single-use and expire after seven days. Staff can create email-bound dealer invitations from the web interface.

Catalog names, photography and application groupings come from the public Vardhman A&E site. This pilot stores its own accounts, quotes and requests. Company SSO, live inventory, price lists, carrier tracking, payments and ERP integration require company access and configuration.
