document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const convertButton = document.getElementById('convert-button');
    const audioPlayer = document.getElementById('audio-player');
    const statusMessage = document.getElementById('status-message');
    const progressContainer = document.querySelector('.progress-container');
    const progressText = document.querySelector('.progress-text');

    const outputsList = document.getElementById('outputs-list');
    const refreshOutputsButton = document.getElementById('refresh-outputs-button');
    const deleteSelectedButton = document.getElementById('delete-selected-button');
    //const deleteAllOutputsButton = document.getElementById('delete-all-outputs-button');
    const selectAllOutputsCheckbox = document.getElementById('select-all-outputs');
    const downloadButton = document.getElementById('download-button');

    // Firebase dynamic config and auth logic
    let firebaseApp = null;
    let firebaseAuth = null;
    let firebaseUser = null;

    function formatDateTime(ts) {
        if (!ts) return '';
        const d = new Date(ts * 1000);
        return d.toLocaleString();
    }

    function truncateText(txt, n) {
        if (!txt) return '';
        return txt.length > n ? txt.slice(0, n) + '…' : txt;
    }

    function formatBytes(bytes) {
        if (bytes == null) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setMainPlayer(url, downloadName = 'audio.mp3') {
        if (!audioPlayer || !url) return;

        audioPlayer.src = url;
        audioPlayer.style.display = 'block';
        audioPlayer.load();
        audioPlayer.play().catch(() => {});

        if (downloadButton) {
            downloadButton.href = url;
            downloadButton.setAttribute('download', downloadName);
            downloadButton.style.display = 'inline-block';
        }
    }

    // Load available voices from the server
    async function loadVoices() {
        try {
            if (statusMessage) statusMessage.textContent = 'Loading voices...';

            const response = await fetch('/voices');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const voices = await response.json();

            if (!voices || voices.length === 0) {
                if (statusMessage) statusMessage.textContent = 'No voices found. Please check server logs.';
                return;
            }

            if (voiceSelect) {
                voiceSelect.innerHTML = '';
                voices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.name;

                    const displayName = voice.name
                        .replace(/_/g, ' ')
                        .replace(/-/g, ' - ')
                        .replace(/\b\w/g, l => l.toUpperCase());

                    const languageCode = (voice.language || '').replace('_', '-').toUpperCase();
                    option.textContent = `${displayName} (${languageCode})`;
                    voiceSelect.appendChild(option);
                });
            }

            if (convertButton) convertButton.disabled = false;
            if (statusMessage) statusMessage.textContent = '';
        } catch (error) {
            console.error('Error loading voices:', error);
            if (statusMessage) statusMessage.textContent = 'Error loading voices. Please check server logs.';
        }
    }

    async function loadOutputs() {
        if (!outputsList) return;

        try {
            outputsList.innerHTML = '<div class="outputs-empty">Loading outputs...</div>';

            const response = await fetch('/outputs-list');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            renderOutputs((data && data.files) ? data.files : []);
        } catch (error) {
            console.error('Error loading outputs:', error);
            outputsList.innerHTML = '<div class="outputs-empty">Failed to load outputs.</div>';
        }
    }

    function renderOutputs(files) {
        if (!outputsList) return;

        if (!files || files.length === 0) {
            outputsList.innerHTML = '<div class="outputs-empty">No generated audio yet.</div>';
            return;
        }

        outputsList.innerHTML = files.map(item => {
            const rawName = item.name || '';
            const escapedName = escapeHtml(rawName);
            const modified = item.modified ? formatDateTime(item.modified) : '';
            const mp3Url = item.mp3_url || '';
            const wavUrl = item.wav_url || '';
            const playUrl = mp3Url || wavUrl || '';
            const preferredDownloadUrl = mp3Url || wavUrl || '';
            const preferredDownloadName = mp3Url ? `${rawName}.mp3` : `${rawName}.wav`;
            const hasMp3 = !!mp3Url;
            const hasWav = !!wavUrl;

            const metaParts = [];
            if (modified) metaParts.push(modified);
            if (hasMp3 && item.mp3_size != null) metaParts.push(`MP3 ${formatBytes(item.mp3_size)}`);
            if (hasWav && item.wav_size != null) metaParts.push(`WAV ${formatBytes(item.wav_size)}`);

            return `
                <div class="output-row">
                    <div class="output-select">
                        <input
                            type="checkbox"
                            class="output-checkbox"
                            value="${escapedName}"
                            aria-label="Select ${escapedName}"
                        >
                    </div>

                    <div class="output-content">
                        <div class="output-name">${escapedName}</div>
                        <div class="output-meta">${escapeHtml(metaParts.join(' • '))}</div>

                        <div class="output-actions">
                            ${hasMp3 ? `<button type="button" class="btn btn-secondary load-mp3-button" data-url="${mp3Url}" data-download-name="${escapeHtml(rawName + '.mp3')}">Load MP3 in Player</button>` : ''}
                            ${hasWav ? `<button type="button" class="btn btn-secondary load-wav-button" data-url="${wavUrl}" data-download-name="${escapeHtml(rawName + '.wav')}">Load WAV in Player</button>` : ''}

                            ${hasMp3 ? `<a href="${mp3Url}" download="${escapedName}.mp3" class="output-link">Download MP3</a>` : ''}
                            ${hasWav ? `<a href="${wavUrl}" download="${escapedName}.wav" class="output-link">Download WAV</a>` : ''}

                            <button type="button" class="delete-output-button" data-name="${escapedName}">Delete</button>
                        </div>
                    </div>
                </div>
            `;
                    }).join('');
    }

    async function deleteOutputByName(name) {
        const response = await fetch(`/outputs/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch (e) {
            payload = null;
        }

        if (!response.ok) {
            const detail = payload && payload.detail
                ? (typeof payload.detail === 'string'
                    ? payload.detail
                    : payload.detail.message || JSON.stringify(payload.detail))
                : 'Delete failed';
            throw new Error(detail);
        }

        return payload;
    }

    function getSelectedOutputNames() {
        if (!outputsList) return [];
        return Array.from(outputsList.querySelectorAll('.output-checkbox:checked'))
            .map(cb => cb.value)
            .filter(Boolean);
    }

    async function deleteSelectedOutputs() {
        const filenames = getSelectedOutputNames();

        if (!filenames.length) {
            alert('Select at least one output.');
            return;
        }

        if (!window.confirm(`Delete ${filenames.length} selected output(s)?`)) {
            return;
        }

        const response = await fetch('/outputs-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames })
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch (e) {
            payload = null;
        }

        if (!response.ok) {
            const detail = payload && payload.detail
                ? (typeof payload.detail === 'string'
                    ? payload.detail
                    : payload.detail.message || JSON.stringify(payload.detail))
                : 'Bulk delete failed';
            throw new Error(detail);
        }

        await loadOutputs();
    }

    async function deleteAllOutputs() {
        if (!window.confirm('Delete all generated outputs?')) {
            return;
        }

        const response = await fetch('/outputs-delete-all', {
            method: 'DELETE'
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch (e) {
            payload = null;
        }

        if (!response.ok) {
            const detail = payload && payload.detail
                ? (typeof payload.detail === 'string'
                    ? payload.detail
                    : payload.detail.message || JSON.stringify(payload.detail))
                : 'Delete all failed';
            throw new Error(detail);
        }

        await loadOutputs();
    }

    // Convert text to speech using the selected voice
    async function convertToSpeech() {
        let progressInterval = null;

        try {
            if (!convertButton || !voiceSelect || !textInput) return;

            convertButton.disabled = true;
            if (statusMessage) statusMessage.textContent = '';

            const progressFill = document.querySelector('.progress-fill');
            if (progressContainer) progressContainer.style.display = 'block';

            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = '0%';

            let progress = 0;
            progressInterval = setInterval(() => {
                progress = Math.min(progress + Math.random() * 10, 95);
                if (progressFill) progressFill.style.width = progress + '%';
                if (progressText) progressText.textContent = Math.floor(progress) + '%';
            }, 200);

            const voice = voiceSelect.value;
            const text = textInput.value.trim();

            if (!voice) {
                if (statusMessage) statusMessage.textContent = 'Please select a voice.';
                clearInterval(progressInterval);
                if (progressContainer) progressContainer.style.display = 'none';
                convertButton.disabled = false;
                return;
            }

            if (!text) {
                if (statusMessage) statusMessage.textContent = 'Please enter some text.';
                clearInterval(progressInterval);
                if (progressContainer) progressContainer.style.display = 'none';
                convertButton.disabled = false;
                return;
            }

            let headers = { 'Content-Type': 'application/json' };

            if (firebaseAuth && firebaseAuth.currentUser) {
                const token = await firebaseAuth.currentUser.getIdToken();
                headers['Authorization'] = 'Bearer ' + token;
            }

            const response = await fetch('/synthesize', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    text: text,
                    voice: voice
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const audioUrl = data.audioUrl;

            if (!audioUrl) {
                throw new Error('No audio URL returned from server.');
            }

            clearInterval(progressInterval);
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '100%';

            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
            }, 1000);

            const safeVoice = voice.replace(/[^\w.-]+/g, '_');
            setMainPlayer(audioUrl, `${safeVoice}.mp3`);

            if (statusMessage) statusMessage.textContent = '';
            await loadOutputs();
        } catch (error) {
            console.error('Error converting text to speech:', error);
            if (statusMessage) statusMessage.textContent = 'Error converting text to speech. Please try again.';
            if (progressContainer) progressContainer.style.display = 'none';
            if (progressInterval) clearInterval(progressInterval);
        } finally {
            if (convertButton) convertButton.disabled = false;
        }
    }

    async function loadFirebase() {
        if (!window.firebase) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const res = await fetch('/firebase-config');
        const config = await res.json();
        firebaseApp = firebase.initializeApp(config);
        firebaseAuth = firebase.auth();
        window.firebaseApp = firebaseApp;
        window.firebaseAuth = firebaseAuth;
    }

    // UI Elements
    let signupModal, signupLink, loginLink, closeSignupModal, signupEmail, signupCTA, signupError, signupConfirmation, authLinks, userInfo, recordingsSection, recordingsList;

    function setupAuthUI() {
        signupModal = document.getElementById('signup-modal');
        signupLink = document.getElementById('signup-link');
        loginLink = document.getElementById('login-link');
        closeSignupModal = document.getElementById('close-signup-modal');
        signupEmail = document.getElementById('signup-email');
        signupCTA = document.getElementById('signup-cta');
        signupError = document.getElementById('signup-error');
        signupConfirmation = document.getElementById('signup-confirmation');
        authLinks = document.getElementById('auth-links');
        userInfo = document.getElementById('user-info');
        recordingsSection = document.getElementById('recordings-section');
        recordingsList = document.getElementById('recordings-list');

        if (signupLink) signupLink.onclick = (e) => { e.preventDefault(); showSignupModal(); };
        if (loginLink) loginLink.onclick = (e) => { e.preventDefault(); showSignupModal(true); };
        if (closeSignupModal) closeSignupModal.onclick = () => {
            if (signupModal) signupModal.style.display = 'none';
            resetSignupModal();
        };

        window.onclick = (e) => {
            if (e.target === signupModal) {
                signupModal.style.display = 'none';
                resetSignupModal();
            }
        };

        if (signupCTA) signupCTA.onclick = handleSignup;

        if (signupEmail && signupCTA) {
            signupEmail.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    signupCTA.click();
                }
            });
        }

        if (signupModal && signupEmail) {
            signupModal.addEventListener('transitionend', function() {
                if (signupModal.style.display === 'flex') {
                    signupEmail.focus();
                }
            });
        }
    }

    function showSignupModal(isLogin) {
        if (!signupModal || !signupEmail || !signupCTA) return;

        signupModal.style.display = 'flex';
        signupModal.setAttribute('aria-modal', 'true');
        signupModal.setAttribute('role', 'dialog');
        signupModal.setAttribute('aria-labelledby', 'signup-modal-title');
        signupEmail.setAttribute('aria-label', 'Email Address');
        signupCTA.setAttribute('aria-label', isLogin ? 'Send Magic Link' : 'Create Account');
        signupEmail.value = '';

        if (signupError) signupError.style.display = 'none';
        if (signupConfirmation) signupConfirmation.style.display = 'none';

        signupCTA.textContent = isLogin ? 'Send Magic Link' : 'Create Account';
        signupCTA.style.display = '';
        signupEmail.style.display = '';

        const title = signupModal.querySelector('h2');
        if (title) {
            title.id = 'signup-modal-title';
            title.textContent = isLogin ? 'Log In' : 'Sign Up';
        }

        const label = signupModal.querySelector('label[for="signup-email"]');
        if (label) label.style.display = '';

        setTimeout(() => signupEmail.focus(), 100);
    }

    function resetSignupModal() {
        if (signupEmail) signupEmail.value = '';
        if (signupError) signupError.style.display = 'none';
        if (signupConfirmation) signupConfirmation.style.display = 'none';
        if (signupCTA) signupCTA.style.display = '';
        if (signupEmail) signupEmail.style.display = '';

        const label = signupModal ? signupModal.querySelector('label[for="signup-email"]') : null;
        if (label) label.style.display = '';
    }

    function validateEmail(email) {
        return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    }

    async function handleSignup() {
        if (!signupEmail || !signupCTA || !signupError || !signupConfirmation || !firebaseAuth) return;

        const email = signupEmail.value.trim();

        if (!validateEmail(email)) {
            signupError.textContent = 'Please enter a valid email address.';
            signupError.style.display = 'block';
            return;
        }

        signupError.style.display = 'none';
        signupCTA.disabled = true;

        try {
            let actionUrl;
            if (window.location.hostname === 'basictts.com') {
                actionUrl = 'https://basictts.com';
            } else if (window.location.hostname === 'staging.basictts.com') {
                actionUrl = 'https://staging.basictts.com';
            } else {
                actionUrl = window.location.origin;
            }

            await firebaseAuth.sendSignInLinkToEmail(email, {
                url: actionUrl,
                handleCodeInApp: true
            });

            window.localStorage.setItem('emailForSignIn', email);
            signupConfirmation.style.display = 'block';
            signupCTA.style.display = 'none';
            signupEmail.style.display = 'none';

            const label = signupModal ? signupModal.querySelector('label[for="signup-email"]') : null;
            if (label) label.style.display = 'none';
        } catch (err) {
            signupError.textContent = err.message || 'Failed to send magic link.';
            signupError.style.display = 'block';
        } finally {
            signupCTA.disabled = false;
        }
    }

    async function checkMagicLink() {
        if (!firebaseAuth) return null;

        if (firebaseAuth.isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                email = window.prompt('Please provide your email for confirmation');
            }

            try {
                const result = await firebaseAuth.signInWithEmailLink(email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                window.history.replaceState({}, document.title, window.location.pathname);
                return result.user;
            } catch (err) {
                alert('Sign-in failed: ' + (err.message || 'Unknown error'));
            }
        }

        return null;
    }

    function updateAuthUI(user) {
        console.log('[updateAuthUI] Called with user:', user);

        if (user) {
            if (authLinks) authLinks.style.display = 'none';

            if (userInfo) {
                userInfo.style.display = 'inline';
                userInfo.innerHTML = '<a href="#" id="account-link" style="font-weight:bold;">Account</a>';
                attachAccountDropdownHandler();
            }

            setupAccountUI();

            const libraryPage = document.getElementById('library-page');
            if (libraryPage) libraryPage.style.display = 'none';

            if (recordingsSection) recordingsSection.style.display = 'none';
        } else {
            if (userInfo) userInfo.style.display = 'none';
            if (authLinks) authLinks.style.display = 'inline';

            const libraryPage = document.getElementById('library-page');
            if (libraryPage) libraryPage.style.display = 'none';

            if (recordingsSection) recordingsSection.style.display = 'none';
        }
    }

    let accountModal, accountOptions, logoutButton;

    function createAccountDropdown() {
        const oldModal = document.getElementById('account-modal');
        if (oldModal) oldModal.remove();

        const accountLinkEl = document.getElementById('account-link');
        if (!accountLinkEl) return;

        const rect = accountLinkEl.getBoundingClientRect();

        const dropdown = document.createElement('div');
        dropdown.id = 'account-modal';
        dropdown.className = 'modal';
        dropdown.style.display = 'none';
        dropdown.style.position = 'absolute';
        dropdown.style.top = (window.scrollY + rect.bottom + 8) + 'px';
        dropdown.style.left = (window.scrollX + rect.right - 240) + 'px';
        dropdown.style.width = '240px';
        dropdown.style.background = '#fff';
        dropdown.style.borderRadius = '10px';
        dropdown.style.boxShadow = '0 4px 24px rgba(0,0,0,0.13)';
        dropdown.style.zIndex = '1000';
        dropdown.style.padding = '1.2em 0 0.5em 0';
        dropdown.innerHTML = `
          <ul id="account-options" style="list-style:none; padding:0 0 0.5em 0; margin:0;">
            <li><a href="/library" id="my-library-link" class="account-link" style="display:block; padding:0.7em 1.5em;">My Library</a></li>
            <li><a href="/terms" class="account-link" style="display:block; padding:0.7em 1.5em;">Terms of Service</a></li>
            <li><a href="/privacy" class="account-link" style="display:block; padding:0.7em 1.5em;">Privacy Policy</a></li>
          </ul>
          <button id="logout-button" type="button" class="btn btn-secondary" style="margin:0.5em 1.5em 0.5em 1.5em; width:calc(100% - 3em);">Log Out</button>
        `;
        document.body.appendChild(dropdown);

        accountModal = dropdown;
        accountOptions = dropdown.querySelector('#account-options');
        logoutButton = dropdown.querySelector('#logout-button');

        const myLibraryLink = dropdown.querySelector('#my-library-link');
        if (myLibraryLink) {
            myLibraryLink.setAttribute('href', '/library');
            myLibraryLink.onclick = null;
        }

        function closeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== accountLinkEl) {
                dropdown.style.display = 'none';
                document.removeEventListener('mousedown', closeDropdown);
            }
        }

        setTimeout(() => {
            document.addEventListener('mousedown', closeDropdown);
        }, 0);
    }

    let libraryModal;

    function createLibraryModal() {
        if (document.getElementById('library-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'library-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.4)';
        modal.style.zIndex = '1001';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.innerHTML = `
          <div class="modal-content" style="background:#fff; padding:2em; border-radius:10px; max-width:500px; margin:auto; position:relative; min-height:300px;">
            <span id="close-library-modal" style="position:absolute; top:10px; right:16px; font-size:1.5em; cursor:pointer;" tabindex="0" aria-label="Close dialog">&times;</span>
            <h2 style="margin-bottom:1.5em;">My Library</h2>
            <ul id="library-list" style="list-style:none; padding:0; margin:0;"></ul>
          </div>
        `;
        document.body.appendChild(modal);
        libraryModal = modal;

        modal.querySelector('#close-library-modal').onclick = () => { modal.style.display = 'none'; };
        window.onclick = (e) => { if (e.target === modal) { modal.style.display = 'none'; } };
    }

    async function showLibraryModal() {
        createLibraryModal();
        libraryModal.style.display = 'flex';

        const list = libraryModal.querySelector('#library-list');
        list.innerHTML = '<li>Loading...</li>';

        try {
            const token = await firebaseAuth.currentUser.getIdToken();
            const res = await fetch('/recordings', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) {
                list.innerHTML = '<li>Failed to load recordings.</li>';
                return;
            }

            const recordings = await res.json();

            if (!recordings.length) {
                list.innerHTML = '<li>No recordings yet.</li>';
                return;
            }

            list.innerHTML = '';

            recordings.forEach(rec => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.justifyContent = 'space-between';
                li.style.padding = '0.7em 0';
                li.style.borderBottom = '1px solid #eee';

                const infoDiv = document.createElement('div');
                infoDiv.style.flex = '1';
                infoDiv.innerHTML = `
                  <div style="font-size:0.98em; color:#333;">${formatDateTime(rec.created)}</div>
                  <div style="font-size:0.97em; color:#666;">${escapeHtml(rec.voice || '')}</div>
                  <div style="font-size:1.05em; color:#222; margin-top:0.2em;">${escapeHtml(truncateText(rec.text, 20))}</div>
                `;
                li.appendChild(infoDiv);

                const iconsDiv = document.createElement('div');
                iconsDiv.style.display = 'flex';
                iconsDiv.style.alignItems = 'center';

                const playBtn = document.createElement('button');
                playBtn.type = 'button';
                playBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
                playBtn.style.background = 'none';
                playBtn.style.border = 'none';
                playBtn.style.cursor = 'pointer';
                playBtn.style.marginRight = '0.7em';

                if (rec.audioUrl) {
                    playBtn.onclick = () => setMainPlayer(rec.audioUrl, `${rec.id || 'recording'}.mp3`);
                } else {
                    playBtn.disabled = true;
                    playBtn.style.opacity = '0.5';
                    playBtn.style.cursor = 'default';
                }

                const kebabBtn = document.createElement('button');
                kebabBtn.type = 'button';
                kebabBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;
                kebabBtn.style.background = 'none';
                kebabBtn.style.border = 'none';
                kebabBtn.style.cursor = 'pointer';

                iconsDiv.appendChild(playBtn);
                iconsDiv.appendChild(kebabBtn);
                li.appendChild(iconsDiv);
                list.appendChild(li);
            });
        } catch (err) {
            console.error('Failed to load recordings:', err);
            list.innerHTML = '<li>Failed to load recordings.</li>';
        }
    }

    function setupAccountUI() {
        createAccountDropdown();

        if (logoutButton) {
            logoutButton.onclick = async () => {
                await firebaseAuth.signOut();
                if (accountModal) accountModal.style.display = 'none';
                if (userInfo) userInfo.style.display = 'none';
                if (authLinks) authLinks.style.display = 'inline';
                if (recordingsSection) recordingsSection.style.display = 'none';
                window.location.href = '/';
            };
        }
    }

    let accountDropdownOpen = false;
    let accountDropdownCloseHandler = null;

    function createOrToggleAccountDropdown() {
        const accountLinkEl = document.getElementById('account-link');
        if (!accountLinkEl) return;

        let dropdown = document.getElementById('account-modal');

        if (dropdown && accountDropdownOpen) {
            dropdown.style.display = 'none';
            accountDropdownOpen = false;
            if (accountDropdownCloseHandler) {
                document.removeEventListener('mousedown', accountDropdownCloseHandler);
                accountDropdownCloseHandler = null;
            }
            return;
        }

        if (dropdown) dropdown.remove();

        const rect = accountLinkEl.getBoundingClientRect();
        dropdown = document.createElement('div');
        dropdown.id = 'account-modal';
        dropdown.className = 'modal';
        dropdown.style.display = 'block';
        dropdown.style.position = 'absolute';
        dropdown.style.top = (window.scrollY + rect.bottom + 8) + 'px';
        dropdown.style.left = (window.scrollX + rect.right - 240) + 'px';
        dropdown.style.width = '240px';
        dropdown.style.background = '#fff';
        dropdown.style.borderRadius = '10px';
        dropdown.style.boxShadow = '0 4px 24px rgba(0,0,0,0.13)';
        dropdown.style.zIndex = '1000';
        dropdown.style.padding = '1.2em 0 0.5em 0';
        dropdown.innerHTML = `
          <ul id="account-options" style="list-style:none; padding:0 0 0.5em 0; margin:0;">
            <li><a href="/library" id="my-library-link" class="account-link" style="display:block; padding:0.7em 1.5em;">My Library</a></li>
            <li><a href="/terms" class="account-link" style="display:block; padding:0.7em 1.5em;">Terms of Service</a></li>
            <li><a href="/privacy" class="account-link" style="display:block; padding:0.7em 1.5em;">Privacy Policy</a></li>
          </ul>
          <button id="logout-button" type="button" class="btn btn-secondary" style="margin:0.5em 1.5em 0.5em 1.5em; width:calc(100% - 3em);">Log Out</button>
        `;
        document.body.appendChild(dropdown);

        accountDropdownOpen = true;

        accountDropdownCloseHandler = function(e) {
            if (!dropdown.contains(e.target) && e.target !== accountLinkEl) {
                dropdown.style.display = 'none';
                accountDropdownOpen = false;
                document.removeEventListener('mousedown', accountDropdownCloseHandler);
                accountDropdownCloseHandler = null;
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', accountDropdownCloseHandler);
        }, 0);

        dropdown.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                dropdown.style.display = 'none';
                accountDropdownOpen = false;
                if (accountDropdownCloseHandler) {
                    document.removeEventListener('mousedown', accountDropdownCloseHandler);
                    accountDropdownCloseHandler = null;
                }
            });
        });

        const localLogoutButton = dropdown.querySelector('#logout-button');
        if (localLogoutButton) {
            localLogoutButton.onclick = async () => {
                if (window.firebase && window.firebase.auth) {
                    await firebaseAuth.signOut();
                }

                dropdown.style.display = 'none';
                accountDropdownOpen = false;

                if (accountDropdownCloseHandler) {
                    document.removeEventListener('mousedown', accountDropdownCloseHandler);
                    accountDropdownCloseHandler = null;
                }

                if (userInfo) userInfo.style.display = 'none';
                if (authLinks) authLinks.style.display = 'inline';

                window.location.href = '/';
            };
        }
    }

    function attachAccountDropdownHandler() {
        const accountLink = document.getElementById('account-link');
        if (accountLink) {
            accountLink.onclick = (e) => {
                e.preventDefault();
                createOrToggleAccountDropdown();
            };
        }
    }

    window.addEventListener('popstate', function() {
        const dropdown = document.getElementById('account-modal');
        if (dropdown) {
            dropdown.style.display = 'none';
            accountDropdownOpen = false;
            if (accountDropdownCloseHandler) {
                document.removeEventListener('mousedown', accountDropdownCloseHandler);
                accountDropdownCloseHandler = null;
            }
        }
    });

    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.onclick = (e) => {
            e.preventDefault();
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                window.location.reload();
            } else {
                window.location.href = '/';
            }
        };
    }

    if (recordingsSection) {
        recordingsSection.style.display = 'none';
    }

    if (audioPlayer) {
        audioPlayer.style.display = 'none';
    }

    if (downloadButton) {
        downloadButton.style.display = 'none';
    }

    if (convertButton) {
        convertButton.addEventListener('click', convertToSpeech);
    }

    if (outputsList) {
        outputsList.addEventListener('click', async function(e) {
            const loadMp3Button = e.target.closest('.load-mp3-button');
            if (loadMp3Button) {
                const url = loadMp3Button.getAttribute('data-url');
                const downloadName = loadMp3Button.getAttribute('data-download-name') || 'audio.mp3';
                if (url) {
                    setMainPlayer(url, downloadName);
                }
                return;
            }

            const loadWavButton = e.target.closest('.load-wav-button');
            if (loadWavButton) {
                const url = loadWavButton.getAttribute('data-url');
                const downloadName = loadWavButton.getAttribute('data-download-name') || 'audio.wav';
                if (url) {
                    setMainPlayer(url, downloadName);
                }
                return;
            }

            const deleteButton = e.target.closest('.delete-output-button');
            if (!deleteButton) return;

            const name = deleteButton.getAttribute('data-name');
            if (!name) return;

            if (!window.confirm(`Delete "${name}"?`)) {
                return;
            }

            try {
                await deleteOutputByName(name);
                await loadOutputs();
            } catch (error) {
                console.error('Error deleting output:', error);
                alert(error.message || 'Failed to delete output.');
            }
        });
    }

    if (refreshOutputsButton) {
        refreshOutputsButton.addEventListener('click', function() {
            loadOutputs();
        });
    }

    if (deleteSelectedButton) {
        deleteSelectedButton.addEventListener('click', async function() {
            try {
                await deleteSelectedOutputs();
            } catch (error) {
                console.error('Error deleting selected outputs:', error);
                alert(error.message || 'Failed to delete selected outputs.');
            }
        });
    }

    if (selectAllOutputsCheckbox && outputsList) {
        selectAllOutputsCheckbox.addEventListener('change', function() {
            const checked = selectAllOutputsCheckbox.checked;
            const checkboxes = outputsList.querySelectorAll('.output-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = checked;
            });
        });
    }


    // if (deleteAllOutputsButton) {
    //     deleteAllOutputsButton.addEventListener('click', async function() {
    //         try {
    //             await deleteAllOutputs();
    //         } catch (error) {
    //             console.error('Error deleting all outputs:', error);
    //             alert(error.message || 'Failed to delete all outputs.');
    //         }
    //     });
    // }

    if (voiceSelect) {
        loadVoices();
    }

    if (outputsList) {
        loadOutputs();
    }

    (async function() {
        await loadFirebase();
        setupAuthUI();

        firebaseAuth.onAuthStateChanged(user => {
            firebaseUser = user;
            updateAuthUI(user);
            setTimeout(() => checkSuperuserAndShowDashboardLink(user), 0);

            if (window.location.pathname === '/library') {
                // handled by library page JS
            }
        });

        await checkMagicLink();
        attachAccountDropdownHandler();
    })();

    const aboutLink = document.getElementById('about-link');
    if (aboutLink) {
        aboutLink.href = '/about';
    }
});

async function checkSuperuserAndShowDashboardLink(user) {
    console.log('[checkSuperuserAndShowDashboardLink] Called with user:', user);

    if (!user) {
        console.log('[checkSuperuserAndShowDashboardLink] No user, returning');
        return;
    }

    if (!window.firebaseAuth) {
        console.log('[checkSuperuserAndShowDashboardLink] No firebaseAuth, returning');
        return;
    }

    try {
        const firebaseIdToken = await window.firebaseAuth.currentUser.getIdToken();
        const res = await fetch('/user-info', {
            headers: { 'Authorization': 'Bearer ' + firebaseIdToken }
        });

        if (!res.ok) {
            console.log('[checkSuperuserAndShowDashboardLink] /user-info not ok:', res.status);
            return;
        }

        const userInfoData = await res.json();
        console.log('[checkSuperuserAndShowDashboardLink] userInfoData:', userInfoData);

        if (userInfoData.superuser) {
            let aboutLink = document.getElementById('about-link');
            if (aboutLink && !document.getElementById('dashboard-link')) {
                const dashLink = document.createElement('a');
                dashLink.href = '/dashboard';
                dashLink.id = 'dashboard-link';
                dashLink.textContent = 'Dashboard';
                dashLink.style.textDecoration = 'none';
                dashLink.style.fontWeight = '500';
                dashLink.style.fontSize = '1.1em';
                dashLink.style.color = '#222';
                dashLink.style.marginLeft = '1.5em';

                if (aboutLink.nextSibling) {
                    aboutLink.parentNode.insertBefore(dashLink, aboutLink.nextSibling);
                } else {
                    aboutLink.parentNode.appendChild(dashLink);
                }

                console.log('[checkSuperuserAndShowDashboardLink] Dashboard link injected');
            } else {
                console.log('[checkSuperuserAndShowDashboardLink] Dashboard link already present or About link missing');
            }
        } else {
            console.log('[checkSuperuserAndShowDashboardLink] Not a superuser');
        }
    } catch (err) {
        console.error('[checkSuperuserAndShowDashboardLink] Error:', err);
    }
}
