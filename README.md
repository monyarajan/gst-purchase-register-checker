# GST Purchase Register Checker

A browser-only MVP for checking common data-quality problems in GST purchase-register CSV/XLSX files. It does not upload or store the spreadsheet. This is not GST filing software or tax advice.

## It currently checks

- GSTIN format and checksum;
- missing GSTIN or invoice number;
- duplicate `supplier GSTIN + invoice number` pairs;
- missing invoice date, when mapped;
- CGST versus SGST mismatch;
- entries containing both IGST and CGST/SGST;
- tax totals that do not resemble common GST rates; and
- invalid/negative taxable values.

The tax-rate check is deliberately a **warning**. It cannot infer exemptions, reverse charge, credit notes, state-specific treatment, or the full context of an invoice.

## Run locally

No build step is needed. Open `index.html` in a current browser for CSV checks. XLS/XLSX parsing requires internet once to load the pinned, open-source SheetJS browser library from jsDelivr.

For a more production-like local server, from this directory run:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

Use `sample_purchase_register.csv` or the **Load demo data** button to test the application.

## Deploy free on Cloudflare Pages

1. Create a GitHub repository and push this entire folder.
2. In Cloudflare Dashboard, select **Workers & Pages → Create application → Pages → Import an existing Git repository**.
3. Select the repository.
4. Framework preset: **None**. Build command: leave blank. Build output directory: `/`.
5. Deploy. Cloudflare gives you a free `pages.dev` URL.
6. Test an upload and the report download using `sample_purchase_register.csv` before sharing the URL.

Once connected to GitHub, each push to the selected production branch triggers a Cloudflare Pages deployment automatically. That reduces deployment work, but you must still review changes and the live site after important updates.

You can also deploy by dragging this folder into Cloudflare Pages' Direct Upload interface. Do not host this as a commercial SaaS on GitHub Pages.

## First sales workflow — deliberately simple

1. Keep this free as a small-file checker to validate demand.
2. Sell a paid **bulk/offline accountant edition** through a Razorpay Payment Page (India) or Gumroad/Lemon Squeezy (global, subject to account eligibility).
3. Initially send paid buyers the download or licence manually after payment. Do not claim automatic fulfilment.
4. Add payment-webhook licence delivery only after real customers demonstrate demand.

## Manual work that remains

- Confirm GST validation/rate rules with a qualified accountant before making claims about compliance.
- Test exports from Tally and the accounting packages your target customers actually use.
- Update column aliases and checks as export formats or GST rules change.
- Handle customer support, refunds, payment disputes, and data-quality questions.
- Review the SheetJS CDN version periodically; pinning limits surprise changes but does not remove supply-chain responsibility.

## MVP limitations

- Uses the first Excel worksheet only.
- Does not authenticate users, accept payments, or issue licences.
- Does not replace GSTR-2B reconciliation or validate a taxpayer's legal treatment.
- Browser-only processing improves privacy but does not protect users from using a compromised device/browser.
