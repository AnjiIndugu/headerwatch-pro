document.addEventListener('DOMContentLoaded', () => {
    // Splash screen logic
    const splashScreen = document.getElementById('splash-screen');
    const mainApp = document.getElementById('main-app');
    const splashVisited = localStorage.getItem('hw_visited');
    
    if (!splashVisited && splashScreen && mainApp) {
        splashScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
        
        let currentStep = 1;
        const steps = [1.5, 1.5, 1.5, 1.5, 10]; // durations in seconds
        
        const advanceStep = () => {
            if (currentStep > 5) return;
            const el = document.getElementById(`splash-step-${currentStep}`);
            if(el) el.classList.add('hidden');
            const dot = document.getElementById(`dot-${currentStep}`);
            if(dot) dot.classList.remove('active');
            
            currentStep++;
            if (currentStep <= 5) {
                const nEl = document.getElementById(`splash-step-${currentStep}`);
                if(nEl) nEl.classList.remove('hidden');
                const nDot = document.getElementById(`dot-${currentStep}`);
                if(nDot) nDot.classList.add('active');
                setTimeout(advanceStep, steps[currentStep-1] * 1000);
            } else {
                finishSplash();
            }
        };
        
        const finishSplash = () => {
            localStorage.setItem('hw_visited', 'true');
            splashScreen.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                splashScreen.classList.add('hidden');
                mainApp.classList.remove('hidden');
                mainApp.style.animation = 'fadeIn 0.5s forwards';
            }, 500);
        };
        
        setTimeout(advanceStep, steps[0] * 1000);
        
        const splBtn = document.getElementById('splash-btn');
        if(splBtn) splBtn.addEventListener('click', finishSplash);
        const splSkip = document.getElementById('splash-skip');
        if(splSkip) splSkip.addEventListener('click', finishSplash);
    } else if (mainApp) {
        mainApp.classList.remove('hidden');
    }

    const form = document.getElementById('scan-form');
    const urlInput = document.getElementById('url-input');
    const scanBtn = document.getElementById('scan-btn');
    const btnText = document.getElementById('scan-btn-text');
    const btnLoader = document.getElementById('scan-btn-loader');
    const errorBanner = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');
    
    // UI Elements
    const elTargetUrl = document.getElementById('scan-target-url');
    const elGradeCircle = document.getElementById('grade-circle');
    const elGradeValue = document.getElementById('grade-value');
    const elScoreValue = document.getElementById('score-value');
    const elHeadersGrid = document.getElementById('headers-grid');
    const elFindingsList = document.getElementById('findings-list');
    const elPassingList = document.getElementById('passing-findings-list');
    const elRawHeaders = document.getElementById('raw-headers-content');

    let API_ENDPOINT = '/scan';

    // Onboarding card logic
    const onboardingCard = document.getElementById('onboarding-card');
    if (onboardingCard) {
        const onboarded = localStorage.getItem('hw_onboarded');
        if (!onboarded) {
            onboardingCard.style.display = 'block';
        }
        
        const dismissBtn = document.getElementById('dismiss-onboarding');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                localStorage.setItem('hw_onboarded', 'true');
                onboardingCard.style.animation = 'slideUp 0.3s ease-out forwards';
                setTimeout(() => {
                    onboardingCard.style.display = 'none';
                }, 300);
            });
        }
    }

    // Quick links
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            urlInput.value = chip.textContent.trim();
            scanBtn.click();
        });
    });

    document.getElementById('copy-all-btn').addEventListener('click', (e) => {
        const text = elRawHeaders.textContent;
        navigator.clipboard.writeText(text);
        e.target.textContent = 'Copied! ✓';
        setTimeout(() => e.target.textContent = 'Copy All 📋', 2000);
    });

    // Share Modal References
    const shareModal = document.getElementById('share-modal');
    const sharePreviewText = document.getElementById('share-preview-text');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    const shareBtn = document.getElementById('share-report-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const urlRaw = elTargetUrl.textContent || 'a site';
            const grade = elGradeValue.textContent || 'Unknown';
            const score = elScoreValue.textContent || '0';
            const risk = document.getElementById('risk-level').textContent || 'Unknown';
            const toolUrl = window.location.href.split('?')[0];

            let enforcedCount = 0;
            let totalCount = 0;
            elHeadersGrid.querySelectorAll('.grid-row').forEach(row => {
                totalCount++;
                if (row.querySelector('.badge-enforced') || row.querySelector('.badge-observed') || row.querySelector('.badge-preload')) {
                    enforcedCount++;
                }
            });
            
            const text = `I scanned ${urlRaw} with HeaderWatch Pro.\n\n🛡 Security Grade: ${grade} (${score}/100)\n✅ Risk Level: ${risk}\n📋 ${enforcedCount} of ${totalCount} protections active\n\nCheck your website's security grade:\n${toolUrl}`;
            
            sharePreviewText.textContent = text;
            shareModal.classList.remove('hidden');
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            shareModal.classList.add('hidden');
        });
    }

    if (modalCopyBtn) {
        modalCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(sharePreviewText.textContent);
            const originalText = modalCopyBtn.textContent;
            modalCopyBtn.textContent = 'Copied! ✓';
            setTimeout(() => modalCopyBtn.textContent = originalText, 2000);
        });
    }

    form.addEventListener('submit', async (e) => {
        if(e) e.preventDefault();
        let targetUrl = urlInput.value.trim();
        if (!targetUrl) return;

        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
            urlInput.value = targetUrl;
        }

        if (onboardingCard && onboardingCard.style.display !== 'none') {
            localStorage.setItem('hw_onboarded', 'true');
            onboardingCard.style.animation = 'slideUp 0.3s ease-out forwards';
            setTimeout(() => {
                onboardingCard.style.display = 'none';
            }, 300);
        }

        setLoading(true, targetUrl);
        hideError();
        resultsContainer.classList.add('hidden');
        showHowItWorks();

        try {
            const urlWithProto = targetUrl;
            
            const reqUrl = `${API_ENDPOINT}?url=${encodeURIComponent(urlWithProto)}`;
            const response = await fetch(reqUrl);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP Error ${response.status}`);
            }

            renderResults(data);

        } catch (err) {
            showError(`Scan failed: ${err.message}. Make sure the URL is valid and reachable.`);
        } finally {
            setLoading(false);
        }
    });

    function hideHowItWorks() {
        const steps = document.querySelector('.how-it-works');
        if (steps) steps.style.display = 'none';
    }

    function showHowItWorks() {
        const steps = document.querySelector('.how-it-works');
        if (steps) steps.style.display = 'flex';
    }

    function setLoading(isLoading, url) {
        const inputWrapper = document.getElementById('input-wrapper');
        const fetchingMsg = document.getElementById('fetching-msg');
        if (isLoading) {
            scanBtn.disabled = true;
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            if (inputWrapper) inputWrapper.classList.add('loading');
            if (fetchingMsg) {
                let d = url;
                try { d = new URL(url).hostname; } catch(e){}
                fetchingMsg.textContent = `Fetching headers from ${d}...`;
                fetchingMsg.classList.remove('hidden');
            }
        } else {
            scanBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            if (inputWrapper) inputWrapper.classList.remove('loading');
            if (fetchingMsg) fetchingMsg.classList.add('hidden');
        }
    }

    function showError(msg) {
        errorBanner.textContent = msg;
        errorBanner.classList.remove('hidden');
    }

    function hideError() {
        errorBanner.classList.add('hidden');
    }

    function renderResults(data) {
        document.getElementById('results-container').style.display = 'block';
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'none';

        // Filter irrelevant headers
        const allowedHeaders = [
            'strict-transport-security',
            'content-security-policy',
            'content-security-policy-report-only',
            'x-frame-options',
            'x-content-type-options',
            'referrer-policy',
            'permissions-policy',
            'x-xss-protection',
            'p3p',
            'server',
            'cross-origin-opener-policy',
            'cross-origin-embedder-policy'
        ];
        
        if (data && data.findings) {
            data.findings = data.findings.filter(f => allowedHeaders.includes(f.header.toLowerCase()));
        }
        if (data && data.overview) {
            const newOverview = {};
            Object.keys(data.overview).forEach(k => {
                if (allowedHeaders.includes(k.toLowerCase())) {
                    newOverview[k] = data.overview[k];
                }
            });
            data.overview = newOverview;
        }

        elTargetUrl.textContent = data.final_url;
        
        // Count up animation
        const obj = { val: 0 };
        const endScore = data.score;
        let startTimestamp = null;
        const duration = 1200;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            elScoreValue.textContent = Math.floor(progress * endScore);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                elScoreValue.textContent = endScore;
            }
        };
        window.requestAnimationFrame(step);

        document.getElementById('confidence-value').textContent = data.confidence_overall;
        document.getElementById('confidence-bar').style.width = `${data.confidence_overall}%`;
        
        let gradeLabel = "";
        let riskLabel = "";
        
        if (data.score >= 85) {
            data.grade = 'A';
            gradeLabel = "EXCELLENT PROTECTION";
            riskLabel = "Secure";
        } else if (data.score >= 70) {
            data.grade = 'B';
            gradeLabel = "GOOD PROTECTION";
            riskLabel = "Good";
        } else if (data.score >= 50) {
            data.grade = 'C';
            gradeLabel = "MODERATE PROTECTION";
            riskLabel = "Moderate";
        } else if (data.score >= 30) {
            data.grade = 'D';
            gradeLabel = "WEAK PROTECTION";
            riskLabel = "Weak";
        } else {
            data.grade = 'F';
            gradeLabel = "CRITICAL — ACT NOW";
            riskLabel = "Critical";
        }

        document.getElementById('risk-level').textContent = riskLabel;
        const now = new Date();
        document.getElementById('scan-time').textContent = now.toUTCString().replace('GMT', 'UTC');

        elGradeValue.textContent = data.grade;
        elGradeCircle.className = `grade-box grade-circle grade-${data.grade}`;
        
        document.getElementById('score-text-level').textContent = gradeLabel;
        document.getElementById('score-text-level').className = `score-text-label grade-${data.grade}`;
        document.getElementById('grade-human-explanation').textContent = "";

        renderHeadersGrid(data);
        renderFindings(data);
        renderWhyScore(data);
        renderRawHeaders(data);

        hideHowItWorks();

        resultsContainer.classList.remove('hidden');

        // Apply staggered animations manually to sections
        const sections = [
            document.querySelector('.score-card-wrapper'),
            document.querySelector('.analysis-grid'),
            document.querySelector('.why-score-section'),
            document.querySelector('.raw-headers')
        ];
        
        sections.forEach((sec, idx) => {
            if(sec) {
                sec.classList.remove('animate-in', `delay-${idx+1}`);
                void sec.offsetWidth; // force reflow
                sec.classList.add('animate-in', `delay-${idx+1}`);
            }
        });

        setTimeout(() => {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    function renderHeadersGrid(data) {
        elHeadersGrid.innerHTML = '';
        Object.keys(data.overview).forEach(headerName => {
            const status = data.overview[headerName]; 
            const cssClass = `badge-${status.toLowerCase()}`;
            const badgeText = status === 'PRELOAD' ? '⬡ PRELOAD' : 
                              status === 'ENFORCED' ? '✓ ENFORCED' : 
                              status === 'OBSERVED' ? '◎ OBSERVED' : 
                              status === 'MISSING' ? '✗ MISSING' : 
                              status === 'LEGACY' ? '~ LEGACY' : 
                              status === 'WEAK' ? '⚠ WEAK' : status;

            const row = document.createElement('div');
            row.className = 'grid-row animate-in';
            row.style.animationDelay = `${(elHeadersGrid.children.length * 0.1) + 0.1}s`;
            row.innerHTML = `
                <div class="grid-status"><span class="badge ${cssClass}">${badgeText}</span></div>
                <div class="grid-name">${headerName}</div>
                <div class="grid-arrow">→</div>
            `;
            elHeadersGrid.appendChild(row);
        });
    }

    function renderFindings(data) {
        elFindingsList.innerHTML = '';
        elPassingList.innerHTML = '';
        const elInfoList = document.getElementById('info-findings-list');
        const elPartialList = document.getElementById('partial-findings-list');
        const elPartialTitle = document.getElementById('partial-title');
        const elPartialSubtext = document.getElementById('partial-subtext');
        
        if (elInfoList) elInfoList.innerHTML = '';
        if (elPartialList) elPartialList.innerHTML = '';
        if (elPartialTitle) elPartialTitle.style.display = 'none';
        if (elPartialSubtext) elPartialSubtext.style.display = 'none';
        
        const dict = getHumaneDict();
        let hasActiveGaps = false;
        let hasInfoGaps = false;
        let hasPartialGaps = false;

        data.findings.forEach((f) => {
            const lowKey = f.header.toLowerCase();
            const humanInfo = dict[lowKey] || {
                name: f.header,
                desc: f.meaning || "Security control",
                analogy: "A security measure to keep your session safe.",
                scenario: "Missing this could leave edge cases vulnerable to attacks.",
                missingImpact: "This site isn't fully protecting you in this area.",
                passingImpact: "You are protected from attacks targeting this vulnerability."
            };

            const isSimplified = ['ENFORCED', 'PRELOAD', 'LEGACY', 'OBSERVED'].includes(f.status);
            const priorityClass = f.priority ? f.priority.toLowerCase() : 'info';
            const statusClass = f.status ? f.status.toLowerCase() : 'unknown';
            
            const isPreload = f.status === 'PRELOAD';
            let statusBadgeText = isPreload ? '⬡ PRELOAD' : (f.status === 'ENFORCED' ? '✓ ENFORCED' : f.status);
            if (f.status === 'OBSERVED') statusBadgeText = '◎ OBSERVED';
            if (f.status === 'LEGACY') statusBadgeText = '~ LEGACY';
            
            let card;
            if (isSimplified) {
                card = document.createElement('div');
                card.className = `finding-card priority-${priorityClass} animate-in delay-5`;
                
                let exactText = humanInfo.passingImpact;
                if (f.status === 'PRELOAD' && humanInfo.preloadImpact) exactText = humanInfo.preloadImpact;
                
                card.innerHTML = `
                    <div class="finding-header" style="cursor: default; padding-bottom: 1rem;">
                        <div class="finding-header-top">
                            <span style="font-weight:700; font-family: var(--font-sans); font-size: 1.05rem;">${humanInfo.name}</span>
                            <span class="badge badge-${statusClass}">${statusBadgeText}</span>
                        </div>
                        <div class="finding-header-bottom">
                            <div style="font-size: 0.95rem; color: ${['ENFORCED', 'PRELOAD'].includes(f.status) ? 'var(--accent-success)' : 'var(--text-secondary)'}; font-family: var(--font-sans); margin-top: 0.25rem;">${exactText}</div>
                        </div>
                    </div>
                `;
            } else {
                card = document.createElement('details');
                card.className = `finding-card priority-${priorityClass} animate-in delay-5`;
                
                if (f.status === 'MISSING' || f.status === 'WEAK_CONFIG') {
                    card.setAttribute('open', '');
                }

                let summaryText = `<div style="font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-sans); margin-top: 0.25rem;">${humanInfo.missingImpact}</div>`;

                card.innerHTML = `
                    <summary class="finding-header">
                        <div class="finding-header-top">
                            <span style="font-weight:700; font-family: var(--font-sans); font-size: 1.05rem;">${humanInfo.name}</span>
                            <span class="badge badge-${statusClass}">${statusBadgeText}</span>
                        </div>
                        <div class="finding-header-bottom">
                            ${summaryText}
                        </div>
                    </summary>
                    <div class="finding-details">
                        <div class="detail-sec" style="font-family: var(--font-sans);">
                            <div class="detail-title" style="font-weight: 700;">🤔 WHAT IS THIS?</div>
                            <div class="detail-text" style="color: var(--text-primary); font-size: 0.95rem;">${humanInfo.analogy}</div>
                        </div>
                        <div class="detail-sec" style="font-family: var(--font-sans);">
                            <div class="detail-title" style="font-weight: 700;">😰 WHY DOES IT MATTER?</div>
                            <div class="detail-text" style="color: var(--text-primary); font-size: 0.95rem;">${humanInfo.scenario}</div>
                        </div>
                        
                        <div class="detail-sec" style="font-family: var(--font-sans); margin-top: 1.5rem;">
                            <div class="detail-title" style="font-weight: 700;">✅ HOW TO FIX IT</div>
                            
                            <div style="margin-bottom: 1rem;">
                                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem;">For website owners:</div>
                                <div style="font-size: 0.95rem; color: var(--text-primary);">Add this one line to your server config:</div>
                                ${f.code ? `
                                <div class="reco-box">
                                    <span style="word-break: break-all;">${f.code}</span>
                                    <button class="copy-fix-btn" onclick="navigator.clipboard.writeText('${f.code}'); this.textContent='Copied! ✓'; setTimeout(()=>this.textContent='Copy 📋', 2000);">Copy 📋</button>
                                </div>` : `
                                <div class="reco-box" style="color: var(--text-muted); justify-content: flex-start;">
                                    <span>No code snippet available. Check documentation.</span>
                                </div>`}
                            </div>
                        </div>
                        <details style="margin-top: 1.5rem;">
                            <summary style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted); cursor: pointer; display: inline-block;">🔍 TECHNICAL NAME <span class="expand-indicator">▼</span></summary>
                            <div style="font-family: var(--font-mono); font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
                                ${f.header}: ${f.code ? f.code.split(': ')[1] || '...' : '...'}
                            </div>
                        </details>
                    </div>
                `;
            }
            
            if (f.status === 'ENFORCED' || f.status === 'PRELOAD' || f.priority === 'Pass') {
                elPassingList.appendChild(card);
            } else if (f.status === 'MISSING' || f.status === 'WEAK_CONFIG') {
                elFindingsList.appendChild(card);
                hasActiveGaps = true;
            } else if (f.status === 'OBSERVED' && lowKey === 'content-security-policy-report-only') {
                if (elPartialList) elPartialList.appendChild(card);
                hasPartialGaps = true;
                if (elPartialTitle) elPartialTitle.style.display = 'block';
                if (elPartialSubtext) elPartialSubtext.style.display = 'block';
            } else {
                if (elInfoList) elInfoList.appendChild(card);
                hasInfoGaps = true;
            }
        });

        if (!hasActiveGaps) {
            elFindingsList.innerHTML = '<div class="finding-card priority-pass" style="padding:1rem;color:var(--accent-success);font-family:var(--font-mono);">No active security gaps found.</div>';
        }
        if (!hasInfoGaps && elInfoList) {
            elInfoList.innerHTML = '<div class="finding-card priority-info" style="padding:1rem;color:var(--text-muted);font-family:var(--font-mono);">No additional info to report.</div>';
        }
    }

    function renderHeadersGrid(data) {
        elHeadersGrid.innerHTML = '';
        const dict = getHumaneDict();
        Object.keys(data.overview).forEach(headerName => {
            const status = data.overview[headerName]; 
            const cssClass = `badge-${status.toLowerCase()}`;
            const badgeText = status === 'PRELOAD' ? '⬡ PRELOAD' : 
                              status === 'ENFORCED' ? '✓ ENFORCED' : 
                              status === 'OBSERVED' ? '◎ OBSERVED' : 
                              status === 'MISSING' ? '✗ MISSING' : 
                              status === 'LEGACY' ? '~ LEGACY' : 
                              status === 'WEAK' ? '⚠ WEAK' : status;

            const lowKey = headerName.toLowerCase();
            const humanName = dict[lowKey] ? dict[lowKey].name : headerName;

            let explanationHtml = "";
            if (lowKey === 'content-security-policy-report-only') {
                explanationHtml = `
                    <div style="margin-top:0.25rem; font-size:0.8rem; display:inline-flex; align-items:center; gap:0.25rem; font-family:var(--font-sans);">
                        <span style="color:var(--text-muted);">◎ MONITORING</span>
                        <div class="tooltip-container" style="display:inline-block; cursor:help;">
                            <span style="background:rgba(255,255,255,0.1); border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px;">?</span>
                            <div class="tooltip" style="text-transform:none; font-weight:normal; bottom:150%;">This protection is switched on but in 'watch mode' — it records attempts but doesn't stop them yet. Like a security camera with no alarm.</div>
                        </div>
                    </div>`;
            }

            const row = document.createElement('div');
            row.className = 'grid-row animate-in';
            row.style.animationDelay = `${(elHeadersGrid.children.length * 0.1) + 0.1}s`;
            row.innerHTML = `
                <div class="grid-name">
                    <div style="font-family: var(--font-sans); font-weight: 600; font-size: 1.05rem; margin-bottom: 0.2rem;">${humanName}</div>
                    <div style="color: var(--text-secondary); font-size: 0.75rem;">${headerName}</div>
                    ${explanationHtml}
                </div>
                <div class="grid-status" style="text-align: right;"><span class="badge ${cssClass}">${badgeText}</span></div>
            `;
            elHeadersGrid.appendChild(row);
        });
    }

    function renderWhyScore(data) {
        const bdGrid = document.getElementById('score-breakdown-content');
        let bdGridHtml = `<div style="font-family: var(--font-mono); font-size: 0.95rem; color: var(--text-primary); line-height: 1.6;">`;
        bdGridHtml += `<div style="color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase;">Score Breakdown:</div>`;

        const maxPoints = {
            'Strict-Transport-Security': 25,
            'Content-Security-Policy': 25,
            'Content-Security-Policy-Report-Only': 12,
            'X-Frame-Options': 15,
            'X-Content-Type-Options': 15,
            'Referrer-Policy': 10,
            'Permissions-Policy': 10
        };

        const guessScore = (header, status) => {
            if (status === 'PRELOAD') return '+25';
            if (status === 'ENFORCED') return `+${maxPoints[header] || 0}`;
            if (status === 'MISSING') return `-${maxPoints[header] || 0}`;
            if (status === 'OBSERVED') {
                if (header === 'Content-Security-Policy' || header === 'Content-Security-Policy-Report-Only') return '+12';
            }
            return '+5';
        };

        Object.keys(data.overview).forEach(header => {
            const status = data.overview[header];
            if (!maxPoints[header]) return;
            const pts = guessScore(header, status);
            let color = status === 'MISSING' ? 'var(--accent-danger)' : 'var(--accent-success)';
            let sign = status === 'MISSING' ? '-' : '+';
            if (status === 'MISSING') color = 'var(--text-secondary)';
            
            let ptVal = pts.replace(/[+-]/g, '');
            
            const humanNames = {
                'Strict-Transport-Security': 'Secure Connection Lock',
                'Content-Security-Policy': 'Script Execution Shield',
                'Content-Security-Policy-Report-Only': 'Script Shield (Monitoring)',
                'X-Frame-Options': 'Clickjacking Protection',
                'X-Content-Type-Options': 'File Type Protection',
                'Referrer-Policy': 'Link Privacy Shield',
                'Permissions-Policy': 'Device Access Control'
            };
            
            let label = humanNames[header] || header;
            let checkIcon = status === 'MISSING' ? '✗' : (status === 'PRELOAD' ? '⬡' : (status === 'OBSERVED' ? '◎' : '✓'));
            
            if (status === 'MISSING') {
                bdGridHtml += `<div style="margin-bottom: 0.5rem;"><div style="color: var(--text-primary);"><span style="color: var(--accent-danger); width: 20px; display: inline-block;">✗</span> ${label} <span style="float: right;">+0 pts</span></div><div style="color: var(--text-secondary); margin-left: 20px; font-size: 0.85rem;">"Not set up — ${ptVal} pts lost"</div></div>`;
            } else if (status === 'PRELOAD') {
                bdGridHtml += `<div style="margin-bottom: 0.5rem;"><div style="color: var(--text-primary);"><span style="color: var(--accent-success); width: 20px; display: inline-block;">⬡</span> ${label} <span style="float: right;">+22 pts</span></div><div style="color: var(--text-secondary); margin-left: 20px; font-size: 0.85rem;">"Protected via preload list"</div></div>`;
            } else if (status === 'OBSERVED' && header.startsWith('Content-Security-Policy')) {
                bdGridHtml += `<div style="margin-bottom: 0.5rem;"><div style="color: var(--text-primary);"><span style="color: var(--text-secondary); width: 20px; display: inline-block;">◎</span> ${label} <span style="float: right;">+12 pts</span></div><div style="color: var(--text-secondary); margin-left: 20px; font-size: 0.85rem;">"Active but not enforcing yet"</div></div>`;
            } else {
                bdGridHtml += `<div style="margin-bottom: 0.5rem;"><div style="color: var(--text-primary);"><span style="color: var(--accent-success); width: 20px; display: inline-block;">✓</span> ${label} <span style="float: right;">+${ptVal} pts</span></div></div>`;
            }
        });
        
        bdGridHtml += `<div style="margin-top: 1rem; color: var(--text-secondary); text-transform: uppercase;">Not Counted:</div>`;
        bdGridHtml += `<div style="margin-bottom: 0.25rem;"><div style="color: var(--text-secondary);"><span style="width: 20px; display: inline-block;">📜</span> Old XSS Filter <span style="float: right;">outdated standard</span></div></div>`;
        bdGridHtml += `<div style="margin-bottom: 0.25rem;"><div style="color: var(--text-secondary);"><span style="width: 20px; display: inline-block;">🏷</span> Server Tag <span style="float: right;">informational only</span></div></div>`;
        
        bdGridHtml += `<div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); font-weight: bold; display: flex; justify-content: space-between;">`;
        bdGridHtml += `<span>Total Score:</span> <span>${data.score} / 100</span></div></div>`;

        bdGrid.innerHTML = bdGridHtml;
        bdGrid.className = ""; // Remove grid class

        // Context paragraph
        const ctxLabel = document.getElementById('context-paragraph');
        
        let ctx = "";
        if (data.grade === 'A') {
            ctx = "This site takes your protection seriously. Strong safety settings are active across the board.";
        } else if (data.grade === 'B') {
            ctx = "This site covers the important basics well. A couple of settings are missing but you're generally safe using it.";
        } else if (data.grade === 'C') {
            ctx = "Mixed results. Some protections are on, some are off. Be careful entering passwords or payment details on this site.";
        } else if (data.grade === 'D') {
            ctx = "Several safety settings are switched off. Not necessarily dangerous but user protection hasn't been prioritized here.";
        } else {
            ctx = "Almost no safety settings found. Fine for reading content but avoid entering personal or payment information on this site.";
        }
        ctxLabel.textContent = ctx;
    }

    function renderRawHeaders(data) {
        const curlHtml = `$ curl -I ${data.final_url}`;
        document.getElementById('curl-command').innerHTML = curlHtml;

        const importantHeaders = ['strict-transport-security', 'content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
        
        let importantHtml = '';
        let otherHtml = '';
        
        Object.keys(data.headers).sort().forEach(k => {
            const line = `  <span class="syntax-key">"${k}"</span>: <span class="syntax-string">"${data.headers[k]}"</span>\n`;
            if (importantHeaders.includes(k.toLowerCase())) {
                importantHtml += line;
            } else {
                otherHtml += line;
            }
        });
        
        let rawHtml = importantHtml;
        if (otherHtml) {
            rawHtml += `<div id="raw-other-headers" style="display: none;">\n${otherHtml}</div>`;
            rawHtml += `  <div style="margin-top: 1rem; text-align: center;"><button id="toggle-raw-btn" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.4rem 1rem; border-radius: 4px; font-family: var(--font-mono); font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">View Full Raw Response ▼</button></div>`;
        }

        elRawHeaders.innerHTML = rawHtml || '<span style="color:var(--text-muted);">No headers received</span>';
        
        const toggleBtn = document.getElementById('toggle-raw-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const otherDiv = document.getElementById('raw-other-headers');
                if (otherDiv.style.display === 'none') {
                    otherDiv.style.display = 'block';
                    toggleBtn.textContent = 'Hide Full Raw Response ▲';
                } else {
                    otherDiv.style.display = 'none';
                    toggleBtn.textContent = 'View Full Raw Response ▼';
                }
            });
        }
    }

    function getHumaneDict() {
        return {
            'strict-transport-security': {
                name: '🔒 Secure Connection Lock',
                desc: 'Ensures your browser always uses encrypted HTTPS — never unencrypted HTTP',
                analogy: "Enforces encrypted HTTPS connections instead of unencrypted HTTP, preventing downgrade attacks.",
                scenario: "If you're on public Wi-Fi, an attacker could force your connection down to an unencrypted HTTP connection to steal your passwords. HSTS prevents this downgrade.",
                missingImpact: "Your connection could be intercepted before reaching this site.",
                passingImpact: "Your data travels encrypted. Nobody can intercept it in transit.",
                preloadImpact: "Transport security enforced via browser preload list membership."
            },
            'content-security-policy': {
                name: '🧱 Script Execution Shield',
                desc: 'Controls which programs/scripts are allowed to run on the webpage',
                analogy: "An execution allowlist for webpage scripts.",
                scenario: "Without CSP, browsers rely more heavily on application protections and default execution behavior.",
                missingImpact: "Missing CSP may increase risk.",
                passingImpact: "Only approved scripts can run on this webpage."
            },
            'content-security-policy-report-only': {
                name: '◎ Script Shield (Testing Mode)',
                desc: 'Watches for unwanted scripts and reports them but doesn\'t block them',
                analogy: "An execution allowlist running in monitoring mode.",
                scenario: "Without full CSP enforcement, browsers rely more heavily on application protections.",
                missingImpact: "Missing enforced CSP may increase risks.",
                passingImpact: "Security policy is in monitoring mode — logging violations, not blocking them yet."
            },
            'x-frame-options': {
                name: '🖼 Clickjacking Protection',
                desc: 'Prevents attackers from hiding the site inside an invisible frame to trick you into clicking things',
                analogy: "Prevents external sites from embedding this page in an iframe to protect against clickjacking attacks.",
                scenario: "You could be on a completely different website and click a seemingly harmless button, which secretly triggers an action like transferring funds on this site.",
                missingImpact: "This site could be overlaid with a fake screen to trick your clicks.",
                passingImpact: "This site cannot be hidden inside a fake screen to trick your clicks."
            },
            'x-content-type-options': {
                name: '📄 File Type Protection',
                desc: 'Stops browsers from misidentifying files — prevents disguised malware',
                analogy: "Prevents browsers from incorrectly interpreting uploaded content types.",
                scenario: "An attacker could upload a nasty script that is disguised as a profile picture. Without this protection, your browser might execute the malicious script.",
                missingImpact: "Files from this site could be disguised as something harmful.",
                passingImpact: "Files from this site are verified before your browser opens them."
            },
            'referrer-policy': {
                name: '🔗 Link Privacy Shield',
                desc: 'Controls what info is shared when you click a link to another site',
                analogy: "Controls the amount of information shared when navigating to external links.",
                scenario: "If you are logged into your account and click an external link, that external site could see the exact private page you were just on, leaking sensitive context.",
                missingImpact: "This site may accidentally share your browsing details with others.",
                passingImpact: "Your browsing path stays private when you click links leaving this site."
            },
            'permissions-policy': {
                name: '🎤 Device Access Control',
                desc: 'Restricts whether the site can access your camera, mic, location',
                analogy: "Explicitly defines whether the site can access device features like camera, microphone, or location.",
                scenario: "If a third-party ad on this site goes rogue, it could attempt to silently activate your webcam or microphone using this site's trust.",
                missingImpact: "This site hasn't locked down camera/mic access explicitly.",
                passingImpact: "Camera, microphone and location access is explicitly locked down."
            },
            'server': {
                name: '🏷 Passive Fingerprinting Signal',
                desc: 'Reveals what software runs the website — useful for attacker research',
                analogy: "An informational disclosure of server identity.",
                scenario: "Information disclosure that may assist in passive attacker reconnaissance. Confidence: Low. Severity: Informational only.",
                missingImpact: "This site broadcasts its software version, providing clues to attackers.",
                passingImpact: "This site reveals its server software. Minor detail — not a security risk."
            },
            'x-xss-protection': {
                name: '⚠️ Old Code Injection Filter',
                desc: 'An outdated browser protection that modern browsers no longer use',
                analogy: "An outdated browser mechanism that modern browsers have deprecated.",
                scenario: "Modern browsers ignore this, but relying on it instead of modern protections (like CSP) leaves users completely vulnerable.",
                missingImpact: "This outdated setting is active but largely ignored by modern browsers.",
                passingImpact: "An outdated browser protection that modern browsers no longer use."
            },
            'p3p': {
                name: '📜 Privacy Policy Tag',
                desc: 'An old privacy standard from 2002 that no browser recognizes anymore',
                analogy: "An obsolete privacy standard that is no longer recognized by modern browsers.",
                scenario: "There is no direct harm, but it clutters the response and indicates the server's security configuration hasn't been updated in decades.",
                missingImpact: "An obsolete privacy tag is still being sent by this server.",
                passingImpact: "An obsolete web standard from 2002 that no browser recognizes anymore."
            },
            'cross-origin-opener-policy': {
                name: '🚪 Window Isolation Shield',
                desc: 'Ensures the website runs in an isolated environment away from other sites',
                analogy: "Ensures the document is isolated from cross-origin contexts.",
                scenario: "Without isolation, a malicious site you have open in another tab could potentially read sensitive data from this site.",
                missingImpact: "This site doesn't fully isolate its windows from other open tabs.",
                passingImpact: "This site isolates itself securely from other open tabs."
            },
            'cross-origin-embedder-policy': {
                name: '📦 Resource Origin Shield',
                desc: 'Prevents the site from loading resources from unknown locations',
                analogy: "Prevents the loading of cross-origin resources unless they explicitly grant permission.",
                scenario: "Without this, sophisticated attacks (like Spectre) could potentially be launched against your system by loading malicious external resources.",
                missingImpact: "This site may load resources from untrusted external sources.",
                passingImpact: "This site strictly checks the origin of all loaded resources."
            }
        };
    }
});
