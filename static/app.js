document.addEventListener('DOMContentLoaded', () => {
    // State management
    let allUpdates = [];
    let selectedUpdateId = null;
    let currentFilter = 'all';
    let currentSearch = '';
    let currentSort = 'desc'; // desc = newest first, asc = oldest first
    let currentTweetStyle = 'bullet'; // bullet, highlight, promo
    let selectedHashtags = new Set(['GoogleCloud', 'BigQuery']);

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const categoryFilters = document.getElementById('category-filters');
    const releasesContainer = document.getElementById('releases-container');
    const lastUpdatedSpan = document.getElementById('last-updated');
    
    // Tweet Panel DOM Elements
    const tweetPanel = document.getElementById('tweet-panel');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountSpan = document.getElementById('char-count');
    const progressBar = document.getElementById('char-progress-bar');
    const styleButtons = document.querySelectorAll('.btn-style');
    const hashtagPills = document.querySelectorAll('.hashtag-pill');
    const launchTweetBtn = document.getElementById('launch-tweet-btn');

    // Categories config
    const categories = ['all', 'feature', 'change', 'deprecation', 'fix', 'announcement'];

    // Initialize the app
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderUpdates();
    });
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderUpdates();
    });

    // Close panel
    closePanelBtn.addEventListener('click', closeTweetPanel);

    // Style button clicks
    styleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            styleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTweetStyle = btn.dataset.style;
            generateTweetContent();
        });
    });

    // Hashtag clicks
    hashtagPills.forEach(pill => {
        const tag = pill.dataset.tag;
        // Set initial active state if in default set
        if (selectedHashtags.has(tag)) {
            pill.classList.add('active');
        }
        
        pill.addEventListener('click', () => {
            if (selectedHashtags.has(tag)) {
                selectedHashtags.delete(tag);
                pill.classList.remove('active');
            } else {
                selectedHashtags.add(tag);
                pill.classList.add('active');
            }
            generateTweetContent();
        });
    });

    // Textarea changes
    tweetTextarea.addEventListener('input', updateCharCount);

    // Launch tweet
    launchTweetBtn.addEventListener('click', () => {
        if (launchTweetBtn.classList.contains('disabled')) return;
        
        const tweetText = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
    });

    // Fetch releases from Python API
    async function fetchReleases(force = false) {
        setLoadingState(true);
        releasesContainer.innerHTML = generateSkeletons();
        
        try {
            const url = `/api/releases${force ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            allUpdates = data.updates;
            
            // Format last fetched date
            if (data.last_fetched) {
                const date = new Date(data.last_fetched);
                lastUpdatedSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
            }
            
            renderFilters();
            renderUpdates();
        } catch (error) {
            showError('Failed to connect to the server. Please ensure the Flask app is running.');
            console.error(error);
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(loading) {
        if (loading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    // Show error state inside container
    function showError(msg) {
        releasesContainer.innerHTML = `
            <div class="no-results" style="border-color: rgba(239, 68, 68, 0.3);">
                <svg viewBox="0 0 24 24" style="fill: var(--cat-deprecation);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <h3>Error Loading Release Notes</h3>
                <p style="margin-top: 0.5rem; font-size: 0.9rem;">${msg}</p>
                <button onclick="window.location.reload()" class="btn-refresh" style="margin: 1.5rem auto 0; background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid var(--border-color);">Try Again</button>
            </div>
        `;
    }

    function generateSkeletons() {
        let html = '';
        for (let i = 0; i < 4; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="skeleton-checkbox"></div>
                    <div class="skeleton-body">
                        <div class="skeleton-line title"></div>
                        <div class="skeleton-line text-1"></div>
                        <div class="skeleton-line text-2"></div>
                        <div class="skeleton-line text-3"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    // Dynamic Filter buttons mapping from actual categories
    function renderFilters() {
        // Collect actual categories in dataset
        const uniqueCategories = new Set(allUpdates.map(u => u.category.toLowerCase()));
        
        let html = `<span class="filter-label">Filter:</span>`;
        
        // Always show 'All'
        html += `
            <button class="filter-badge ${currentFilter === 'all' ? 'active' : ''}" data-category="all">
                <span class="category-dot dot-all"></span> All
            </button>
        `;
        
        // Show other standard categories if they exist, or dynamically create badges
        categories.filter(c => c !== 'all').forEach(cat => {
            if (uniqueCategories.has(cat) || (cat === 'announcement' && uniqueCategories.has('update'))) {
                const isActive = currentFilter === cat;
                const dotClass = `dot-${cat}`;
                html += `
                    <button class="filter-badge ${isActive ? 'active' : ''}" data-category="${cat}">
                        <span class="category-dot ${dotClass}"></span> ${capitalize(cat)}
                    </button>
                `;
            }
        });
        
        // Add dynamic categories not in our static categories list
        uniqueCategories.forEach(cat => {
            if (!categories.includes(cat) && cat !== 'update') {
                const isActive = currentFilter === cat;
                html += `
                    <button class="filter-badge ${isActive ? 'active' : ''}" data-category="${cat}">
                        <span class="category-dot dot-all" style="background-color: var(--cat-default);"></span> ${capitalize(cat)}
                    </button>
                `;
            }
        });

        categoryFilters.innerHTML = html;

        // Re-attach filter listeners
        document.querySelectorAll('.filter-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                document.querySelectorAll('.filter-badge').forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
                currentFilter = badge.dataset.category;
                renderUpdates();
            });
        });
    }

    // Render cards with filtering/sorting applied
    function renderUpdates() {
        let filtered = allUpdates.filter(update => {
            // Category filter logic
            const catMatch = currentFilter === 'all' || 
                             update.category.toLowerCase() === currentFilter ||
                             (currentFilter === 'announcement' && update.category.toLowerCase() === 'update');
                             
            // Search filter logic (title/date, description content, category)
            const searchText = `${update.date} ${update.category} ${update.text}`.toLowerCase();
            const searchMatch = searchText.includes(currentSearch);
            
            return catMatch && searchMatch;
        });

        // Sorting
        filtered.sort((a, b) => {
            // Extract dates to compare. Google Cloud feed dates are e.g. "June 17, 2026"
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (currentSort === 'desc') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });

        if (filtered.length === 0) {
            releasesContainer.innerHTML = `
                <div class="no-results">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <h3>No release notes match your criteria</h3>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem;">Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        releasesContainer.innerHTML = filtered.map(update => {
            const isSelected = update.id === selectedUpdateId;
            const categoryClass = getCategoryClass(update.category);
            
            return `
                <div class="release-card ${isSelected ? 'selected' : ''}" data-id="${update.id}">
                    <div class="card-select-column">
                        <div class="custom-checkbox">
                            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        </div>
                    </div>
                    <div class="card-content-column">
                        <div class="card-meta">
                            <div class="card-meta-left">
                                <span class="category-badge badge-${categoryClass}">${update.category}</span>
                                <span class="release-date">${update.date}</span>
                            </div>
                            <div class="card-actions">
                                <button class="btn-card-action tweet-action" title="Tweet this update" data-id="${update.id}">
                                    <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </button>
                                <a href="${update.link}" target="_blank" class="btn-card-action" title="View official release notes">
                                    <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41 9.83-9.83V10h2V3h-7z"/></svg>
                                </a>
                            </div>
                        </div>
                        <div class="release-description">
                            ${update.content}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach Card Click Handlers
        document.querySelectorAll('.release-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // If a button inside the card is clicked, don't trigger selection
                if (e.target.closest('.btn-card-action')) return;
                if (e.target.closest('a')) return; // let links work normally
                
                const updateId = card.dataset.id;
                toggleCardSelection(updateId);
            });
        });

        // Quick Tweet button handler
        document.querySelectorAll('.tweet-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card selection trigger
                const updateId = btn.dataset.id;
                selectCardForTweet(updateId);
            });
        });
    }

    function toggleCardSelection(updateId) {
        if (selectedUpdateId === updateId) {
            closeTweetPanel();
        } else {
            selectCardForTweet(updateId);
        }
    }

    function selectCardForTweet(updateId) {
        selectedUpdateId = updateId;
        
        // Update visually in cards list
        document.querySelectorAll('.release-card').forEach(c => {
            if (c.dataset.id === updateId) {
                c.classList.add('selected');
            } else {
                c.classList.remove('selected');
            }
        });

        // Open Tweet Panel
        document.body.classList.add('tweet-panel-open');
        tweetPanel.classList.add('open');
        
        generateTweetContent();
    }

    function closeTweetPanel() {
        selectedUpdateId = null;
        document.body.classList.remove('tweet-panel-open');
        tweetPanel.classList.remove('open');
        
        // Unselect cards visually
        document.querySelectorAll('.release-card').forEach(c => c.classList.remove('selected'));
    }

    // Generate Tweet text depending on chosen format
    function generateTweetContent() {
        if (!selectedUpdateId) return;

        const update = allUpdates.find(u => u.id === selectedUpdateId);
        if (!update) return;

        const category = update.category;
        const date = update.date;
        const text = update.text;

        // Process summary text: truncate appropriately
        let cleanedText = cleanTextForTweet(text);
        
        let tweetTemplate = '';
        const hashtagsStr = Array.from(selectedHashtags).map(tag => `#${tag}`).join(' ');

        switch (currentTweetStyle) {
            case 'bullet':
                // Emoji styled bullet format (Default / AI style)
                const emoji = getCategoryEmoji(category);
                tweetTemplate = `🚀 Google Cloud #BigQuery Update! (${date})\n\n${emoji} [${category}] ${cleanedText}\n\n👉 Details: ${update.link}\n\n${hashtagsStr}`;
                break;
            case 'highlight':
                // Punchy short update style
                tweetTemplate = `🔥 New in #BigQuery (${date}):\n\n"${cleanedText}"\n\nRead more below 👇\n${update.link}\n\n${hashtagsStr}`;
                break;
            case 'promo':
                // Professional corporate developer announcement
                tweetTemplate = `BigQuery has rolled out a new update:\n\n🛠️ Category: ${category}\n📅 Date: ${date}\n\n📝 Details: ${cleanedText}\n\nCheck out the release notes:\n🔗 ${update.link}\n\n${hashtagsStr}`;
                break;
        }

        // Put in Textarea
        tweetTextarea.value = tweetTemplate;
        updateCharCount();
    }

    function cleanTextForTweet(text) {
        // Remove extra spaces, clean up citations, etc.
        let cleaned = text
            .replace(/\s+/g, ' ')
            .trim();
        
        // If it's too long, truncate it so the final tweet doesn't exceed 280
        // We'll leave roughly 150 chars for link/hashtags
        const maxLength = 160;
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength - 3) + '...';
        }
        return cleaned;
    }

    function updateCharCount() {
        const count = tweetTextarea.value.length;
        charCountSpan.textContent = `${count} / 280`;

        const pct = Math.min((count / 280) * 100, 100);
        progressBar.style.width = `${pct}%`;

        // Update colors based on length
        progressBar.classList.remove('warning', 'danger');
        charCountSpan.classList.remove('danger');
        launchTweetBtn.classList.remove('disabled');

        if (count > 280) {
            progressBar.classList.add('danger');
            charCountSpan.classList.add('danger');
            launchTweetBtn.classList.add('disabled');
        } else if (count > 250) {
            progressBar.classList.add('warning');
        }
    }

    // Helper functions
    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function getCategoryClass(category) {
        const cat = category.toLowerCase();
        if (cat.includes('feature')) return 'feature';
        if (cat.includes('change')) return 'change';
        if (cat.includes('deprecation')) return 'deprecation';
        if (cat.includes('fix')) return 'fix';
        if (cat.includes('announcement') || cat.includes('update')) return 'announcement';
        return 'update';
    }

    function getCategoryEmoji(category) {
        const cat = category.toLowerCase();
        if (cat.includes('feature')) return '🌟';
        if (cat.includes('change')) return '🔄';
        if (cat.includes('deprecation')) return '⚠️';
        if (cat.includes('fix')) return '🛠️';
        if (cat.includes('announcement') || cat.includes('update')) return '📢';
        return '⚡';
    }
});
