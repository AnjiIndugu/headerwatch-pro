import fs from 'fs';

let appJs = fs.readFileSync('app.js', 'utf8');

// Fix app.js sorting and rendering
appJs = appJs.replace(`            data.findings.sort((a,b) => {
                const ranks = {'High': 0, 'Medium': 1, 'Low': 2, 'Info': 3};
                return (ranks[a.priority] !== undefined ? ranks[a.priority] : 4) - (ranks[b.priority] !== undefined ? ranks[b.priority] : 4);
            }).forEach((f) => {`, `            data.findings.sort((a,b) => {
                const ranks = {'High': 0, 'Medium': 1, 'Low': 2, 'Info': 3, 'Pass': 4};
                return (ranks[a.priority] !== undefined ? ranks[a.priority] : 5) - (ranks[b.priority] !== undefined ? ranks[b.priority] : 5);
            }).forEach((f) => {`);

appJs = appJs.replace(`                card.innerHTML = \`
                    <summary class="finding-header" style="cursor: pointer; outline: none; display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
                        <div>
                            <span class="finding-title" style="margin-right: 10px;">\${f.header}</span>
                            <span class="status-badge status-\${statusClass}">\${f.status}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span class="confidence-badge" title="Confidence Score">🎯 \${f.confidence}%</span>
                            <span class="finding-risk priority-label-\${priorityClass}">\${f.priority} priority</span>
                        </div>
                    </summary>\`;`, `                const isPass = f.priority === 'Pass';
                const priorityHtml = isPass 
                    ? \`<span class="finding-risk" style="color:var(--success-green); font-weight: 600;">✅ ENFORCED</span>\`
                    : \`<span class="finding-risk priority-label-\${priorityClass}">\${f.priority} priority</span>\`;
                
                const isOpen = (f.status === 'MISSING' || f.status === 'OBSERVED' || f.priority === 'Low' || f.priority === 'Medium' || f.priority === 'High') ? 'open' : '';
                
                card.innerHTML = \`
                    <summary class="finding-header" style="cursor: pointer; outline: none; display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
                        <div>
                            <span class="finding-title" style="margin-right: 10px;">\${f.header}</span>
                            <span class="status-badge status-\${statusClass}">\${f.status}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span class="confidence-badge" title="Confidence Score">🎯 \${f.confidence}%</span>
                            \${priorityHtml}
                        </div>
                    </summary>\`;
                if (isOpen) card.setAttribute('open', '');`);

fs.writeFileSync('app.js', appJs);

const files = ['server.js', 'worker.js'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace priority and logic for HSTS
  content = content.replace(`            if (maxAge >= 31536000 && hasSubdomains && hasPreload) {
                hstsScore = 25;
                score += 25;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is strongly configured and enforced (STRONG).',
                    'Forces browsers to use secure connections, mitigating downgrade attacks.',
                    'No action required.',
                    'Low', 100, ''
                );
            } else if (maxAge >= 31536000 && hasSubdomains) {
                hstsScore = 20;
                score += 20;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is well configured (GOOD).',
                    'Forces secure connections, though lacks preload for initial connection security.',
                    'Consider adding the preload directive.',
                    'Low', 100, ''
                );
            } else if (maxAge >= 86400) {
                hstsScore = 10;
                score += 10;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is present but sub-optimally configured (WEAK_CONFIG).',
                    'Configuration gaps (e.g. max-age too short or missing includeSubDomains). Potential reduced protection scope.',
                    'Ensure max-age is at least 31536000 and includeSubDomains is set.',
                    'Medium', 100,
                    'Strict-Transport-Security: max-age=31536000; includeSubDomains'
                );
            } else {
                hstsScore = 5;
                score += 5;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is present but sub-optimally configured (WEAK_CONFIG).',
                    'Configuration gaps (e.g. max-age extremely short). Potential reduced protection scope.',
                    'Ensure max-age is at least 31536000 and includeSubDomains is set.',
                    'Medium', 100,
                    'Strict-Transport-Security: max-age=31536000; includeSubDomains'
                );
            }`, `            if (maxAge >= 31536000 && hasSubdomains && hasPreload) {
                hstsScore = 25;
                score += 25;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is strongly configured and enforced (STRONG).',
                    'Forces browsers to use secure connections, mitigating downgrade attacks.',
                    'No action required.',
                    'Pass', 100, ''
                );
            } else if (maxAge >= 31536000 && hasSubdomains) {
                hstsScore = 20;
                score += 20;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is well configured (GOOD).',
                    'Forces secure connections, though lacks preload for initial connection security.',
                    'Consider adding the preload directive.',
                    'Pass', 100, ''
                );
            } else if (maxAge >= 31536000) {
                hstsScore = 15;
                score += 15;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is enforced (MODERATE).',
                    'max-age set to >= 1 year. includeSubDomains absent — subdomain protection not guaranteed.',
                    'Consider adding the includeSubDomains directive.',
                    'Low', 100, 'Strict-Transport-Security: max-age=31536000; includeSubDomains'
                );
            } else if (maxAge >= 86400) {
                hstsScore = 10;
                score += 10;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is present but sub-optimally configured (WEAK).',
                    'max-age is short. Potential reduced protection scope.',
                    'Ensure max-age is at least 31536000 and includeSubDomains is set.',
                    'Low', 100,
                    'Strict-Transport-Security: max-age=31536000; includeSubDomains'
                );
            } else {
                hstsScore = 5;
                score += 5;
                addFinding('Strict-Transport-Security', 'ENFORCED',
                    'HSTS is present but sub-optimally configured (MINIMAL).',
                    'max-age extremely short. Potential reduced protection scope.',
                    'Ensure max-age is at least 31536000 and includeSubDomains is set.',
                    'Low', 100,
                    'Strict-Transport-Security: max-age=31536000; includeSubDomains'
                );
            }`);

  // HSTS MISSING Priority
  content = content.replace(`'Medium', 80,
                'Strict-Transport-Security: max-age=31536000; includeSubDomains'`, `'High', 80,
                'Strict-Transport-Security: max-age=31536000; includeSubDomains'`);

  // CSP Enforced - permissive
  content = content.replace(`'CSP is enforced but contains permissive directives.',
                \`Use of \${cspIssues.join(', ')} reduces the effectiveness of the policy against content injection.\`,
                'Replace permissive directives with strict origins, nonces, or hashes.',
                'Medium', 100,`, `'CSP is enforced but contains permissive directives.',
                \`Use of \${cspIssues.join(', ')} reduces the effectiveness of the policy against content injection.\`,
                'Replace permissive directives with strict origins, nonces, or hashes.',
                'Low', 100,`);

  // CSP Enforced - good
  content = content.replace(`'CSP is present and restricts external resource loading.',
                'Reduces exposure to Cross-Site Scripting (XSS) and other content-based injections.',
                'No action required.',
                'Low', 100, ''`, `'CSP is present and restricts external resource loading.',
                'Reduces exposure to Cross-Site Scripting (XSS) and other content-based injections.',
                'No action required.',
                'Pass', 100, ''`);

  // X-Frame-Options - good
  content = content.replace(`'X-Frame-Options restricts cross-origin framing.',
                'Prevents UI redressing (Clickjacking) techniques.',
                'No action required.',
                'Low', 100, ''`, `'X-Frame-Options restricts cross-origin framing.',
                'Prevents UI redressing (Clickjacking) techniques.',
                'No action required.',
                'Pass', 100, ''`);

  // XFO - unrecognized
  content = content.replace(`'Browsers may ignore invalid directives, falling back to permissive framing.',
                'Use DENY or SAMEORIGIN.',
                'Medium', 100, 'X-Frame-Options: SAMEORIGIN'`, `'Browsers may ignore invalid directives, falling back to permissive framing.',
                'Use DENY or SAMEORIGIN.',
                'Low', 100, 'X-Frame-Options: SAMEORIGIN'`);

  // XFO - observed
  content = content.replace(`'X-Frame-Options is omitted, but CSP frame-ancestors is present.',
                'Modern replacement for X-Frame-Options is actively managed via CSP.',
                'No action required.',
                'Low', 100, ''`, `'X-Frame-Options is omitted, but CSP frame-ancestors is present.',
                'Modern replacement for X-Frame-Options is actively managed via CSP.',
                'No action required.',
                'Pass', 100, ''`);

  // XFO - missing -> Medium
  content = content.replace(`'Add X-Frame-Options or CSP frame-ancestors.',
            'High', 90, 'X-Frame-Options: DENY'`, `'Add X-Frame-Options or CSP frame-ancestors.',
            'Medium', 90, 'X-Frame-Options: DENY'`);

  // XCTO - good
  content = content.replace(`'MIME sniffing is explicitly disabled.',
            'Forces browsers to respect the declared Content-Type header.',
            'No action required.',
            'Low', 100, ''`, `'MIME sniffing is explicitly disabled.',
            'Forces browsers to respect the declared Content-Type header.',
            'No action required.',
            'Pass', 100, ''`);

  // RP - good
  content = content.replace(`'Origin referrer behavior is securely controlled.',
            'Limits accidental sensitive variable leakage to third parties via Referer.',
            'No action required.',
            'Low', 100, ''`, `'Origin referrer behavior is securely controlled.',
            'Limits accidental sensitive variable leakage to third parties via Referer.',
            'No action required.',
            'Pass', 100, ''`);

  // PP - good
  content = content.replace(`'Powerful browser features are explicitly managed.',
            'Reduces attack surface against browser API abuse (geolocation, camera, etc.)',
            'No action required.',
            'Low', 100, ''`, `'Powerful browser features are explicitly managed.',
            'Reduces attack surface against browser API abuse (geolocation, camera, etc.)',
            'No action required.',
            'Pass', 100, ''`);

// Dynamic summary replacements
  content = content.replace(`    let summary = '';
    if (hstsState === 'MISSING' && cspState === 'MISSING') {
        summary = "No transport or content execution controls detected. Site is broadly exposed to MitM and XSS vectors.";
    } else if (hstsState === 'ENFORCED' && cspState === 'OBSERVED') {
        summary = "Transport layer is secured via HSTS. CSP is in report-only mode — violations are logged but not blocked. Upgrade to enforced CSP to close XSS exposure gap.";
    } else if (hstsState === 'ENFORCED' && cspState === 'ENFORCED') {
        if (score >= 85) {
            summary = "Strong security posture. All critical headers enforced. Minor hardening opportunities remain in feature permission controls.";
        } else {
            summary = "Core transport and content policies are enforced. Referrer and permissions controls are absent, leaving partial hardening gaps.";
        }
    } else if (hstsState === 'MISSING' && cspState === 'OBSERVED') {
        summary = "Content policy monitoring is active but unenforced. No transport security header detected — HTTPS enforcement relies solely on server/CDN config.";
    } else if (score >= 70) {
        summary = "Solid baseline security posture. Site enforces primary security controls with minor gaps in secondary hardening headers.";
    } else {
        summary = "Partial security controls detected. Multiple baseline headers absent. Recommend systematic hardening review.";
    }`, `    let missing_headers = [];
    Object.keys(overview).forEach(k => {
        if (overview[k] === 'MISSING') {
            missing_headers.push(k);
        }
    });

    let summary = '';
    const gaps = missing_headers;

    if (gaps.length === 0) {
        summary = "Strong security posture. All analyzed headers are enforced with no critical gaps detected.";
    } else if (gaps.length === 1) {
        summary = \`Strong baseline posture. One gap detected: \${gaps[0]} is absent. All other controls enforced.\`;
    } else if (gaps.length <= 2) {
        summary = \`Core security controls enforced. Minor gaps: \${gaps.join(' and ')} are absent, leaving limited exposure in those areas.\`;
    } else if (cspState === 'ENFORCED' && hstsState === 'ENFORCED') {
        summary = \`Critical headers enforced. Secondary controls (\${gaps.join(', ')}) are missing, partially reducing hardening depth.\`;
    } else if (hstsState === 'ENFORCED' && cspState === 'OBSERVED') {
        summary = "Transport layer secured. CSP in monitoring mode only — not enforced. XSS exposure gap remains.";
    } else if (hstsState === 'MISSING' && cspState === 'MISSING') {
        summary = "No transport or content execution controls detected. Significant hardening gaps present.";
    } else {
        summary = \`Partial controls enforced. Missing: \${gaps.join(', ')}.\`;
    }`);

  fs.writeFileSync(file, content);
}
console.log('Fixed server.js, worker.js, and app.js');
