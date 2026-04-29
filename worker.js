const HSTS_PRELOAD_DOMAINS = [
    "google.com", "www.google.com",
    "youtube.com", "www.youtube.com",
    "facebook.com", "twitter.com",
    "github.com", "mozilla.org",
    "cloudflare.com", "stripe.com",
    "apple.com", "microsoft.com",
    "instagram.com", "linkedin.com",
    "dropbox.com", "wikipedia.org"
];

function analyzeSecurityHeaders(headers, targetUrl, finalUrl) {
    let score = 0;
    const findings = [];
    const overview = {};
    let confidences = [];
    
    let hstsState = 'MISSING';
    let cspState = 'MISSING';

    const addFinding = (header, status, meaning, impact, reco, priority, confidence, code) => {
        overview[header] = status;
        findings.push({ header, status, meaning, impact, reco, priority, confidence, code });
        confidences.push(confidence);
    };

    const hsts = headers['strict-transport-security'];
    const isHttps = finalUrl.startsWith('https');
    let domain = "";
    try {
        const parsedUrl = new URL(finalUrl);
        domain = parsedUrl.hostname.toLowerCase();
    } catch (e) {
        // Ignored
    }
    
    if (isHttps) {
        if (hsts) {
            hstsState = 'ENFORCED';
            let hstsScore = 0;
            const hstsStr = hsts.toLowerCase();
            
            const maxAgeMatch = hstsStr.match(/max-age=(\d+)/);
            const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
            const hasSubdomains = hstsStr.includes('includesubdomains');
            const hasPreload = hstsStr.includes('preload');

            if (maxAge >= 31536000 && hasSubdomains && hasPreload) {
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
            }
        } else if (domain && HSTS_PRELOAD_DOMAINS.includes(domain)) {
            hstsState = 'PRELOAD';
            score += 22;
            addFinding('Strict-Transport-Security', 'PRELOAD',
                'Domain is on HSTS preload list.',
                'Transport enforcement is browser-native. Header not sent via HTTP response.',
                'No action required.',
                'Pass', 85, ''
            );
        } else {
            addFinding('Strict-Transport-Security', 'MISSING',
                'HSTS header was not observed in the response.',
                'Lacks explicit transport enforcement. If the domain is not on the HSTS preload list, initial connections may lack strict TLS enforcement.',
                'Implement HSTS header at the server or edge level.',
                'High', 95,
                'Strict-Transport-Security: max-age=31536000; includeSubDomains'
            );
        }
    } else {
        addFinding('Strict-Transport-Security', 'MISSING',
            'Final URL resolved over insecure HTTP.',
            'Transport is unencrypted, presenting a broad exposure area for manipulation or interception.',
            'Deploy TLS certificate and implement HTTPS redirection.',
            'High', 100, ''
        );
    }

    const csp = headers['content-security-policy'];
    const cspRO = headers['content-security-policy-report-only'];
    
    if (csp) {
        cspState = 'ENFORCED';
        score += 25;
        let cspIssues = [];

        if (csp.includes('unsafe-inline')) cspIssues.push("'unsafe-inline'");
        if (csp.includes('unsafe-eval')) cspIssues.push("'unsafe-eval'");
        if (/(?:\s|^)\*(?:\s|;|$)/.test(csp)) cspIssues.push("Wildcard sources");

        if (cspIssues.length > 0) {
            addFinding('Content-Security-Policy', 'ENFORCED',
                'CSP is enforced but contains permissive directives.',
                `Use of ${cspIssues.join(', ')} reduces the effectiveness of the policy against content injection.`,
                'Replace permissive directives with strict origins, nonces, or hashes.',
                'Low', 100,
                "Content-Security-Policy: default-src 'self';"
            );
        } else {
            addFinding('Content-Security-Policy', 'ENFORCED',
                'CSP is present and restricts external resource loading.',
                'Reduces exposure to Cross-Site Scripting (XSS) and other content-based injections.',
                'No action required.',
                'Pass', 100, ''
            );
        }
    } else if (cspRO) {
        cspState = 'OBSERVED';
        score += 12;
        addFinding('Content-Security-Policy-Report-Only', 'OBSERVED',
            'CSP is monitored in report-only mode.',
            'Monitors violations without enforcing blocking behavior. Standard practice during policy development.',
            'Analyze generated violation reports and eventually deploy an enforced CSP.',
            'Info', 100,
            "Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-endpoint" 
        );
    } else {
        cspState = 'MISSING';
        addFinding('Content-Security-Policy', 'MISSING',
            'No Content-Security-Policy observed.',
            'Missing hardening controls for resource execution, relying entirely on application-level logic to prevent XSS.',
            'Deploy a strict CSP to restrict resource origins.',
            'High', 95,
            "Content-Security-Policy: default-src 'self';"
        );
    }

    const xfo = headers['x-frame-options'];
    if (xfo) {
        score += 15;
        if (xfo.toLowerCase() === 'deny' || xfo.toLowerCase() === 'sameorigin') {
            addFinding('X-Frame-Options', 'ENFORCED',
                'X-Frame-Options restricts cross-origin framing.',
                'Prevents UI redressing (Clickjacking) techniques.',
                'No action required.',
                'Pass', 100, ''
            );
        } else {
            addFinding('X-Frame-Options', 'ENFORCED',
                `X-Frame-Options is present but uses an unrecognized value (${xfo}).`,
                'Browsers may ignore invalid directives, falling back to permissive framing.',
                'Use DENY or SAMEORIGIN.',
                'Low', 100, 'X-Frame-Options: SAMEORIGIN'
            );
        }
    } else if (csp && csp.includes('frame-ancestors')) {
        score += 15;
        addFinding('X-Frame-Options', 'OBSERVED',
            'X-Frame-Options is omitted, but CSP frame-ancestors is present.',
            'Modern replacement for X-Frame-Options is actively managed via CSP.',
            'No action required.',
            'Pass', 100, ''
        );
    } else {
        addFinding('X-Frame-Options', 'MISSING',
            'No explicit framing protection observed.',
            'Potential exposure to Clickjacking as external origins can overlay the application within an iframe.',
            'Add X-Frame-Options or CSP frame-ancestors.',
            'Medium', 90, 'X-Frame-Options: DENY'
        );
    }

    const xcto = headers['x-content-type-options'];
    if (xcto && xcto.toLowerCase() === 'nosniff') {
        score += 15;
        addFinding('X-Content-Type-Options', 'ENFORCED',
            'MIME sniffing is explicitly disabled.',
            'Forces browsers to respect the declared Content-Type header.',
            'No action required.',
            'Pass', 100, ''
        );
    } else {
        addFinding('X-Content-Type-Options', 'MISSING',
            'X-Content-Type-Options is missing.',
            'Browsers may perform MIME sniffing, potentially executing unexpected content types.',
            'Add nosniff directive.',
            'Medium', 95, 'X-Content-Type-Options: nosniff'
        );
    }

    const rp = headers['referrer-policy'];
    if (rp) {
        score += 10;
        addFinding('Referrer-Policy', 'ENFORCED',
            'Origin referrer behavior is securely controlled.',
            'Limits accidental sensitive variable leakage to third parties via Referer.',
            'No action required.',
            'Pass', 100, ''
        );
    } else {
        addFinding('Referrer-Policy', 'MISSING',
            'Referrer-Policy is missing.',
            'Relying on target browser default referrer behaviors, which can result in cross-origin data leakage.',
            'Implement strict-origin-when-cross-origin.',
            'Medium', 90, 'Referrer-Policy: strict-origin-when-cross-origin'
        );
    }

    const pp = headers['permissions-policy'];
    if (pp) {
        score += 10;
        addFinding('Permissions-Policy', 'ENFORCED',
            'Powerful browser features are explicitly managed.',
            'Reduces attack surface against browser API abuse (geolocation, camera, etc.)',
            'No action required.',
            'Pass', 100, ''
        );
    } else {
        addFinding('Permissions-Policy', 'MISSING',
            'Permissions-Policy is missing.',
            'Lacks explicit capability lockdown for advanced browser features.',
            'Define feature allowances proactively.',
            'Medium', 90, 'Permissions-Policy: geolocation=(), microphone=(), camera=()'
        );
    }

    if (headers['x-xss-protection']) {
        addFinding('X-XSS-Protection', 'LEGACY',
            'Deprecated X-XSS-Protection header observed.',
            'Ignored by modern browsers and offers no tangible protection.',
            'Remove this header to reduce payload size.',
            'Info', 100, ''
        );
    }
    if (headers['p3p']) {
        addFinding('P3P', 'LEGACY',
            'Obsolete P3P header observed.',
            'Privacy mechanism completely ignored by modern user agents.',
            'Remove this header.',
            'Info', 100, ''
        );       
    }

    const extraHeaders = ['server', 'x-powered-by', 'via', 'x-aspnet-version'];
    for(const eh of extraHeaders) {
        if(headers[eh]) {
             addFinding(eh, 'OBSERVED',
                'Technology stack indicator observed.',
                'Provides a fingerprinting signal for infrastructure components. No direct exploitation, but aids reconnaissance.',
                'Mask or remove explicit technology signatures.',
                'Info', 60, ''
             );
        }
    }

    score = Math.max(0, Math.min(100, score));
    let grade = 'F';
    let risk_level = 'Critical';
    if (score >= 85) { grade = 'A'; risk_level = 'Secure'; }
    else if (score >= 70) { grade = 'B'; risk_level = 'Good'; }
    else if (score >= 50) { grade = 'C'; risk_level = 'Moderate'; }
    else if (score >= 30) { grade = 'D'; risk_level = 'Weak'; }
    else { grade = 'F'; risk_level = 'Critical'; }

    let missing_headers = [];
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
        summary = `Strong baseline posture. One gap detected: ${gaps[0]} is absent. All other controls enforced.`;
    } else if (gaps.length <= 2) {
        summary = `Core security controls enforced. Minor gaps: ${gaps.join(' and ')} are absent, leaving limited exposure in those areas.`;
    } else if (cspState === 'ENFORCED' && hstsState === 'ENFORCED') {
        summary = `Critical headers enforced. Secondary controls (${gaps.join(', ')}) are missing, partially reducing hardening depth.`;
    } else if (hstsState === 'ENFORCED' && cspState === 'OBSERVED') {
        summary = "Transport layer secured. CSP in monitoring mode only — not enforced. XSS exposure gap remains.";
    } else if (hstsState === 'PRELOAD' && cspState === 'OBSERVED') {
        summary = "Transport security enforced via HSTS preload list membership. CSP active in monitoring mode only — not yet enforcing. Content execution controls partially in place.";
    } else if (hstsState === 'PRELOAD' && cspState === 'MISSING') {
        summary = "Transport layer protected via HSTS preload membership. No content security policy detected. XSS and injection exposure gap present.";
    } else if (hstsState === 'PRELOAD' && cspState === 'ENFORCED') {
        summary = "Strong transport and content controls in place. HSTS enforced via preload list. CSP actively blocking unauthorized script execution.";
    } else if (hstsState === 'MISSING' && cspState === 'MISSING') {
        summary = "No transport or content execution controls detected. Significant hardening gaps present.";
    } else {
        summary = `Partial controls enforced. Missing: ${gaps.join(', ')}.`;
    }

    const confidence_overall = confidences.length ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 100;

    return { score, grade, risk_level, findings, overview, summary, confidence_overall };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      let finalUrl = targetUrl;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s

      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'HeaderWatchPro Security Analyzer/2.0 (Mozilla/5.0 compatible)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const analysis = analyzeSecurityHeaders(headers, targetUrl, response.url);

      return new Response(JSON.stringify({
        url: targetUrl,
        final_url: response.url,
        score: analysis.score,
        grade: analysis.grade,
        risk_level: analysis.risk_level,
        overview: analysis.overview,
        headers: headers,
        findings: analysis.findings,
        summary: analysis.summary,
        confidence_overall: analysis.confidence_overall
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to fetch target URL: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
