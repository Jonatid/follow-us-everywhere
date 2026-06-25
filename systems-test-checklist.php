<?php
// Follow Us Everywhere — Full Systems Test Checklist
// Drop this file on any PHP server and open it in a browser.
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Follow Us Everywhere — Full Systems Test</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; font-size: 15px; line-height: 1.6; }
  .page { max-width: 860px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { color: #64748b; margin-bottom: 32px; font-size: 14px; }
  h2 { font-size: 18px; font-weight: 700; margin-bottom: 12px; padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; gap: 10px; }
  .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; overflow: hidden; }
  .section-header { padding: 0; }
  .section-body { padding: 0 0 8px; }
  .s1 h2 { background: #eff6ff; color: #1d4ed8; }
  .s2 h2 { background: #f0fdf4; color: #15803d; }
  .s3 h2 { background: #fff7ed; color: #c2410c; }
  .s4 h2 { background: #fdf4ff; color: #7e22ce; }
  .s5 h2 { background: #fff1f2; color: #be123c; }
  .s6 h2 { background: #ecfdf5; color: #065f46; }
  .s7 h2 { background: #f0f9ff; color: #0369a1; }
  .s8 h2 { background: #fefce8; color: #854d0e; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #f1f5f9; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; padding: 8px 16px; text-align: left; }
  tbody tr { border-top: 1px solid #f1f5f9; }
  tbody tr:hover { background: #fafafa; }
  td { padding: 10px 16px; vertical-align: top; }
  td:first-child { width: 32px; text-align: center; }
  td.step { font-weight: 600; color: #334155; white-space: nowrap; width: 1%; }
  td.action { color: #1e293b; }
  td.expected { color: #475569; font-size: 13px; }
  .check { width: 18px; height: 18px; border: 2px solid #cbd5e1; border-radius: 4px; display: inline-block; cursor: pointer; transition: all .15s; }
  .check:hover { border-color: #6366f1; }
  input[type=checkbox] { display: none; }
  input[type=checkbox]:checked + .check { background: #6366f1; border-color: #6366f1; position: relative; }
  input[type=checkbox]:checked + .check::after { content: '✓'; color: #fff; font-size: 12px; position: absolute; top: -1px; left: 2px; font-weight: 700; }
  input[type=checkbox]:checked ~ td { opacity: .5; text-decoration: line-through; }
  .label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  code { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: 'SF Mono', 'Fira Code', monospace; color: #0f172a; white-space: nowrap; }
  .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; vertical-align: middle; }
  .get { background: #dbeafe; color: #1e40af; }
  .post { background: #dcfce7; color: #166534; }
  .put { background: #fef9c3; color: #854d0e; }
  .del { background: #fee2e2; color: #991b1b; }
  .note { background: #f8fafc; border-left: 3px solid #cbd5e1; margin: 0 16px 8px; padding: 8px 12px; font-size: 13px; color: #64748b; border-radius: 0 4px 4px 0; }
  .note strong { color: #334155; }
  .summary { background: #fff; border: 2px solid #6366f1; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
  .summary h3 { font-size: 16px; margin-bottom: 8px; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { display: flex; flex-direction: column; gap: 2px; }
  .field label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  .field input { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 13px; background: #f8fafc; }
  .progress-bar { height: 6px; background: #e2e8f0; border-radius: 999px; margin-bottom: 16px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 999px; transition: width .3s; }
  .progress-label { font-size: 13px; color: #64748b; margin-bottom: 6px; }
  @media print {
    body { background: #fff; }
    .field input { border: 1px solid #ccc; }
  }
</style>
</head>
<body>
<div class="page">

  <h1>Follow Us Everywhere</h1>
  <p class="subtitle">Full Systems Test Checklist &nbsp;&middot;&nbsp; fuse101.com &nbsp;&middot;&nbsp; Print or use in browser</p>

  <!-- Progress -->
  <div class="progress-label" id="progress-label">0 of 0 checks complete</div>
  <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>

  <!-- Quick-ref credentials -->
  <div class="summary">
    <h3>Your Test Info (fill in before starting)</h3>
    <div class="fields">
      <div class="field"><label>Site URL</label><input type="text" value="https://fuse101.com" /></div>
      <div class="field"><label>API URL</label><input type="text" value="https://followuseverywhere-api.onrender.com/api" /></div>
      <div class="field"><label>Business email</label><input type="text" placeholder="yourbiz@email.com" /></div>
      <div class="field"><label>Business password</label><input type="text" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" /></div>
      <div class="field"><label>Public slug to test</label><input type="text" placeholder="your-business-slug" /></div>
      <div class="field"><label>Admin email</label><input type="text" placeholder="admin@email.com" /></div>
      <div class="field"><label>Customer email</label><input type="text" placeholder="customer@email.com" /></div>
      <div class="field"><label>Admin TOTP app</label><input type="text" placeholder="Google Authenticator / Authy" /></div>
    </div>
  </div>

  <!-- ══ SECTION 1 ══ -->
  <div class="section s1">
    <div class="section-header"><h2>1 &mdash; Health &amp; Public Pages</h2></div>
    <div class="note"><strong>No login needed.</strong> Open these URLs directly in your browser.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.1</td>
              <td class="action"><span class="badge get">GET</span> <code>/api/health</code><br>Open in browser or paste URL</td>
              <td class="expected">JSON with <code>"ok":true</code> and <code>"db":"ok"</code></td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.2</td>
              <td class="action">Visit <code>fuse101.com/</code> &mdash; home / landing page</td>
              <td class="expected">Landing page loads, no blank screen or errors</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.3</td>
              <td class="action">Visit <code>fuse101.com/about</code></td>
              <td class="expected">&ldquo;The Platform&rdquo; page loads</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.4</td>
              <td class="action">Visit <code>fuse101.com/faq</code></td>
              <td class="expected">FAQ page loads with question/answer sections</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.5</td>
              <td class="action">Visit <code>fuse101.com/privacy</code></td>
              <td class="expected">Privacy Policy page loads (not &ldquo;coming soon&rdquo;)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.6</td>
              <td class="action">Visit <code>fuse101.com/terms</code></td>
              <td class="expected">Terms of Service page loads (not &ldquo;coming soon&rdquo;)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.7</td>
              <td class="action">Click &ldquo;Privacy Policy&rdquo; and &ldquo;Terms of Service&rdquo; links in the site footer</td>
              <td class="expected">Both links navigate to the correct pages</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">1.8</td>
              <td class="action">Visit <code>fuse101.com/discover</code></td>
              <td class="expected">Business discovery / explore page loads</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SECTION 2 ══ -->
  <div class="section s2">
    <div class="section-header"><h2>2 &mdash; Public Business Profile</h2></div>
    <div class="note"><strong>Replace <code>YOUR-SLUG</code></strong> with a real business slug from your database.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">2.1</td>
              <td class="action">Visit <code>fuse101.com/b/YOUR-SLUG</code></td>
              <td class="expected">Public follow page loads with business name, socials, QR code</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">2.2</td>
              <td class="action">Check below the QR code for the shareable link bar</td>
              <td class="expected">&ldquo;Share this link&rdquo; bar shows <code>fuse101.com/b/YOUR-SLUG</code> with a Copy button</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">2.3</td>
              <td class="action">Click the Copy button on the shareable link bar</td>
              <td class="expected">Button shows &ldquo;&#10003; Copied&rdquo; briefly; paste confirms correct URL</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">2.4</td>
              <td class="action">Look for a &ldquo;Save Contact&rdquo; button below the link bar</td>
              <td class="expected">Button exists; clicking it downloads a <code>.vcf</code> file</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">2.5</td>
              <td class="action">Open the downloaded <code>.vcf</code> file</td>
              <td class="expected">Contact card shows business name and profile URL</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">2.6</td>
              <td class="action"><span class="badge get">GET</span> <code>/api/public/businesses/by-slug/YOUR-SLUG</code></td>
              <td class="expected">JSON includes <code>"show_qr": true</code> field</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SECTION 3 ══ -->
  <div class="section s3">
    <div class="section-header"><h2>3 &mdash; QR Code &amp; NFC Redirects</h2></div>
    <div class="note"><strong>Replace <code>YOUR-SLUG</code></strong> with a real slug. These test the redirect and source tracking.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">3.1</td>
              <td class="action">Visit <code>fuse101.com/qr/YOUR-SLUG</code></td>
              <td class="expected">Redirects to <code>fuse101.com/b/YOUR-SLUG</code></td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">3.2</td>
              <td class="action">Visit <code>fuse101.com/qr/YOUR-SLUG?src=nfc</code></td>
              <td class="expected">Redirects to <code>fuse101.com/b/YOUR-SLUG</code> (NFC tap logged)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">3.3</td>
              <td class="action">Visit <code>fuse101.com/qr/YOUR-SLUG?src=link</code></td>
              <td class="expected">Redirects to <code>fuse101.com/b/YOUR-SLUG</code> (link click logged)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">3.4</td>
              <td class="action">Visit <code>fuse101.com/qr/YOUR-SLUG?src=INVALID</code></td>
              <td class="expected">Still redirects correctly (invalid src falls back to &ldquo;qr&rdquo;)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">3.5</td>
              <td class="action"><span class="badge get">GET</span> <code>/qr/analytics/YOUR-SLUG</code> (full URL: <code>fuse101.com/qr/analytics/YOUR-SLUG</code>)</td>
              <td class="expected">JSON with scan totals and a <code>bySource</code> breakdown (qr / nfc / link counts)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">3.6</td>
              <td class="action">Go to your business QR page at <code>fuse101.com/business/qr</code> (while logged in)</td>
              <td class="expected">QR code displayed + &ldquo;Can&rsquo;t scan? Share this link&rdquo; section with your URL</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SECTION 4 ══ -->
  <div class="section s4">
    <div class="section-header"><h2>4 &mdash; Business Login &amp; Dashboard</h2></div>
    <div class="note">Log in at <code>fuse101.com</code> using your business account credentials.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.1</td>
              <td class="action">Click Log in &rarr; Business &rarr; enter correct credentials</td>
              <td class="expected">Dashboard loads successfully</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.2</td>
              <td class="action">Try logging in with a wrong password</td>
              <td class="expected">Error message &ldquo;Invalid credentials&rdquo; (not a server crash)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.3</td>
              <td class="action">In dashboard: update your tagline and save</td>
              <td class="expected">Success message; tagline visible on public profile</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.4</td>
              <td class="action">Go to Widget Customization &rarr; find &ldquo;Show QR code on public profile&rdquo; checkbox</td>
              <td class="expected">Checkbox is visible and toggleable</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.5</td>
              <td class="action">Uncheck &ldquo;Show QR code&rdquo; &rarr; Save &rarr; visit your public profile</td>
              <td class="expected">QR code section hidden on public profile</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.6</td>
              <td class="action">Re-check &ldquo;Show QR code&rdquo; &rarr; Save &rarr; visit public profile again</td>
              <td class="expected">QR code section visible again</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.7</td>
              <td class="action">Click &ldquo;Preview Public Follow Page&rdquo; button</td>
              <td class="expected">Opens your public profile at <code>/b/YOUR-SLUG</code></td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.8</td>
              <td class="action">Click Copy Link button in the dashboard</td>
              <td class="expected">Correct <code>fuse101.com/b/YOUR-SLUG</code> URL copies to clipboard</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.9</td>
              <td class="action">Log out</td>
              <td class="expected">Session ends; redirected to home or login</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">4.10</td>
              <td class="action">Try accessing the dashboard directly after logout</td>
              <td class="expected">Redirected to login (token invalidated)</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SECTION 5 ══ -->
  <div class="section s5">
    <div class="section-header"><h2>5 &mdash; NFC Devices</h2></div>
    <div class="note">Log in as a business. Navigate to <strong>NFC Devices</strong> in the account menu.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.1</td>
              <td class="action">Open account menu &rarr; click &ldquo;NFC Devices&rdquo;</td>
              <td class="expected">NFC Devices page loads</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.2</td>
              <td class="action">Register a new device: enter a label (e.g. &ldquo;Gold Business Card&rdquo;) and chip type NTAG213</td>
              <td class="expected">Device appears in the list with a copyable URL</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.3</td>
              <td class="action">Check the URL shown for the new device</td>
              <td class="expected">URL format: <code>https://fuse101.com/qr/YOUR-SLUG?src=nfc</code></td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.4</td>
              <td class="action">Click the Copy URL button next to the device</td>
              <td class="expected">URL copies to clipboard correctly</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.5</td>
              <td class="action">Deactivate the device using the toggle or button</td>
              <td class="expected">Device shows as inactive</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.6</td>
              <td class="action">Reactivate the device</td>
              <td class="expected">Device shows as active again</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.7</td>
              <td class="action">Delete the test device</td>
              <td class="expected">Device removed from list</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">5.8</td>
              <td class="action">Check the &ldquo;How to program your NFC chip&rdquo; instructions section</td>
              <td class="expected">NFC Tools app steps visible on page</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SECTION 6 ══ -->
  <div class="section s6">
    <div class="section-header"><h2>6 &mdash; Support Form</h2></div>
    <div class="note">Can be tested while logged in or logged out.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">6.1</td>
              <td class="action">Navigate to Contact / Support (link in dashboard or footer)</td>
              <td class="expected">Support form loads (no 404)</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">6.2</td>
              <td class="action">Submit the form with your name, email, and a test message</td>
              <td class="expected">Success confirmation shown; no server error</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">6.3</td>
              <td class="action">Submit the form with missing required fields</td>
              <td class="expected">Validation error shown; form not submitted</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SECTION 7 ══ -->
  <div class="section s7">
    <div class="section-header"><h2>7 &mdash; Admin Panel</h2></div>
    <div class="note">Visit <code>fuse101.com/admin</code>. Admin login requires email + password + <strong>TOTP code from your authenticator app</strong>.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.1</td>
              <td class="action">Visit <code>fuse101.com/admin</code> &mdash; enter email + password</td>
              <td class="expected">Prompted for 6-digit TOTP code</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.2</td>
              <td class="action">Enter TOTP code from authenticator app</td>
              <td class="expected">Admin dashboard loads showing business/document counts</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.3</td>
              <td class="action">On Admin Dashboard &rarr; scroll to Security section &rarr; click &ldquo;Regenerate Backup Codes&rdquo;</td>
              <td class="expected">Confirmation prompt appears</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.4</td>
              <td class="action">Confirm the regeneration</td>
              <td class="expected">New backup codes displayed &mdash; save them now</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.5</td>
              <td class="action">Navigate to Businesses list</td>
              <td class="expected">Paginated list of businesses loads</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.6</td>
              <td class="action">Click a business to view detail</td>
              <td class="expected">Business detail page loads with name, status, documents</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.7</td>
              <td class="action">Navigate to Documents</td>
              <td class="expected">Paginated document list loads; can approve/reject</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.8</td>
              <td class="action">Navigate to Badges &rarr; create a test badge</td>
              <td class="expected">Badge created; appears in list</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.9</td>
              <td class="action">Navigate to Admin Users</td>
              <td class="expected">Admin list loads; your account visible</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.10</td>
              <td class="action">Try visiting <code>fuse101.com/admin/dashboard</code> in an incognito/private window (not logged in)</td>
              <td class="expected">Redirected to admin login &mdash; not accessible</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">7.11</td>
              <td class="action">Log out of admin panel</td>
              <td class="expected">Session ended; redirected to admin login</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SECTION 8 ══ -->
  <div class="section s8">
    <div class="section-header"><h2>8 &mdash; Edge Cases &amp; Security</h2></div>
    <div class="note">Quick checks to confirm the app handles bad input gracefully.</div>
    <div class="section-body">
      <table>
        <thead><tr><th></th><th>Step</th><th>What to do</th><th>Expected result</th></tr></thead>
        <tbody>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">8.1</td>
              <td class="action">Visit <code>fuse101.com/b/this-slug-does-not-exist</code></td>
              <td class="expected">&ldquo;Business not found&rdquo; or 404 message &mdash; not a server crash</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">8.2</td>
              <td class="action">Visit <code>fuse101.com/qr/this-slug-does-not-exist</code></td>
              <td class="expected">Graceful error &mdash; not a redirect loop or crash</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">8.3</td>
              <td class="action">Try logging into the business dashboard with the wrong password 5 times</td>
              <td class="expected">Account temporarily locked; lockout message shown</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">8.4</td>
              <td class="action">Visit a non-existent admin page: <code>fuse101.com/admin/nonexistent</code></td>
              <td class="expected">&ldquo;Page not found&rdquo; message shown</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">8.5</td>
              <td class="action">Open browser dev tools &rarr; Network tab &rarr; visit any page and check for JS errors in Console</td>
              <td class="expected">No uncaught errors in console on normal pages</td></tr>
          <tr><td><label class="label"><input type="checkbox"><span class="check"></span></label></td>
              <td class="step">8.6</td>
              <td class="action">Visit the site on mobile screen size (or resize browser to ~390px wide)</td>
              <td class="expected">Layout is usable; no broken overflow or hidden buttons</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div style="text-align:center; color:#64748b; font-size:13px; margin-top:32px;">
    Follow Us Everywhere &nbsp;&middot;&nbsp; Systems Test &nbsp;&middot;&nbsp; Branch: claude/ecstatic-keller-nmvq1i
  </div>

</div>

<script>
  const checkboxes = document.querySelectorAll('input[type=checkbox]');
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');

  function update() {
    const total = checkboxes.length;
    const done = [...checkboxes].filter(c => c.checked).length;
    fill.style.width = (done / total * 100) + '%';
    label.textContent = done + ' of ' + total + ' checks complete';
  }

  checkboxes.forEach(cb => cb.addEventListener('change', update));
  update();
</script>
</body>
</html>
