# Google Sheets v2 Staging Setup

This folder is a local copy of the operating Apps Script source plus the proposed v2 storage code.
Do not run `clasp push`, create deployments, or edit deployments against the operating Apps Script project from this repository copy.

## Why a Separate Staging Project Is Required

The operating Apps Script uses `SpreadsheetApp.getActiveSpreadsheet()`.
If a new deployment is created from the same Apps Script project, it still reads and writes the operating spreadsheet.
For v2 testing, create a separate Apps Script project bound to a copied staging spreadsheet.

## Staging Procedure

1. Copy the operating Google Spreadsheet to a staging spreadsheet.
2. Create a new Apps Script project bound to the copied staging spreadsheet.
3. Copy `Code.js` and `appsscript.json` from this folder into that staging Apps Script project.
4. Deploy the staging project as a Web App.
5. Copy the staging Web App `/exec` URL.
6. Open the holdings tool on localhost from the repository holdings folder, for example:

   ```powershell
   cd "<repo>\holdings"
   python -m http.server 8787 --bind 127.0.0.1
   ```

7. In the local page, paste the staging Web App URL into the Google Sheets connection banner.
8. Confirm the banner says staging is in use.
9. Run mock or staging-only saves.
10. Do not paste a staging URL into the committed HTML.

## Localhost Override

The HTML client reads a localhost-only localStorage key:

```text
thebox_gs_staging_url
```

This key is ignored outside `localhost` and `127.0.0.1`.
Production GitHub Pages always uses the production endpoint compiled in `holdings/index.html`.

If a staging URL is set and a request fails, the client does not fall back to production.
Clear the key from the banner before testing against the production endpoint.

## v2 Storage Contract

The `기록` sheet keeps columns A-G compatible with the current operating structure:

```text
A dateKey
B slotKey
C slotLabel
D dateLabel
E dayLabel
F savedAt
G classes
```

Column H is added as:

```text
H recordJson
```

Existing A-G rows are not migrated automatically.
Reads prefer H `recordJson` when present and valid.
Rows without H are returned as legacy records with no inferred final grouping data.

For final operation records, native and non-native participant arrays are stored as objects in both top-level fields and grouping snapshots:

```json
{
  "name": "Test Native",
  "type": "native",
  "groupId": "staging-g1",
  "groupName": "STAGING 그룹 1",
  "table": "TEST-T1"
}
```

String-only legacy participant lists are normalized to this object shape without inferring data from holding lists.
Korean members and teachers inside grouping snapshots remain string arrays.

## Health Check

The v2 server must respond to:

```text
GET ?action=health
```

Expected response:

```json
{
  "ok": true,
  "apiVersion": 2,
  "storage": "recordJson",
  "sheetName": "기록",
  "supportsFinalGrouping": true
}
```

The HTML sends final grouping payloads only after this health response is confirmed.
