document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navBtns = document.querySelectorAll('.m3-nav-item');
  const viewTabs = document.querySelectorAll('.m3-view-tab');

  // Input Controls
  const urlInput = document.getElementById('urlInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const sampleLinkBtn = document.getElementById('sampleLinkBtn');
  const clearBtn = document.getElementById('clearBtn');
  const previewBtn = document.getElementById('previewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const platformDetector = document.getElementById('platformDetector');

  // Options State
  let selectedFormat = 'video';
  let selectedQuality = 'best';
  let selectedAudio = 'm4a';

  // Preview Card Elements
  const previewCard = document.getElementById('previewCard');
  const previewTitle = document.getElementById('previewTitle');
  const previewUploader = document.getElementById('previewUploader');
  const previewDuration = document.getElementById('previewDuration');
  const previewViews = document.getElementById('previewViews');
  const previewPlatformTag = document.getElementById('previewPlatformTag');
  const previewThumbnail = document.getElementById('previewThumbnail');

  // Library / Queue Elements
  const queueList = document.getElementById('queueList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const filterPills = document.querySelectorAll('.m3-filter-chips .m3-filter-chip');

  // Ad & Modals Elements
  const interstitialModal = document.getElementById('interstitialModal');
  const adTimerBar = document.getElementById('adTimerBar');
  const closeAdBtn = document.getElementById('closeAdBtn');
  const adCountdownText = document.getElementById('adCountdownText');

  const playerModal = document.getElementById('playerModal');
  const videoPlayer = document.getElementById('videoPlayer');
  const closePlayerBtn = document.getElementById('closePlayerBtn');
  const playerTitle = document.getElementById('playerTitle');

  const clipboardBanner = document.getElementById('clipboardBanner');
  const quickPasteBtn = document.getElementById('quickPasteBtn');
  const closeClipboardBtn = document.getElementById('closeClipboardBtn');

  const adSimToggle = document.getElementById('adSimToggle');
  const autoClipboardToggle = document.getElementById('autoClipboardToggle');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  const goProBtn = document.getElementById('goProBtn');

  let historyItems = [];
  let downloadCount = 0;
  let autoPreviewTimeout = null;

  // M3 Tab Navigation
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      navBtns.forEach(b => b.classList.remove('active'));
      viewTabs.forEach(v => v.classList.add('hidden'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.remove('hidden');
    });
  });

  // M3 Segmented Buttons Selection Helper
  setupSegmentGroup('formatGroup', (val, labelText) => {
    selectedFormat = val;
    document.getElementById('selectedFormatLabel').innerText = labelText;
  });

  setupSegmentGroup('qualityGroup', (val, labelText) => {
    selectedQuality = val;
    document.getElementById('selectedQualityLabel').innerText = labelText;
  });

  setupSegmentGroup('audioGroup', (val, labelText) => {
    selectedAudio = val;
    document.getElementById('selectedAudioLabel').innerText = labelText;
  });

  function setupSegmentGroup(groupId, callback) {
    const group = document.getElementById(groupId);
    if (!group) return;
    const segments = group.querySelectorAll('.m3-segment');
    segments.forEach(segment => {
      segment.addEventListener('click', () => {
        segments.forEach(s => s.classList.remove('active'));
        segment.classList.add('active');
        callback(segment.dataset.value, segment.innerText);
      });
    });
  }

  // Auto Platform Detection & Auto Preview
  urlInput.addEventListener('paste', () => {
    setTimeout(() => {
      const pasted = urlInput.value.trim();
      detectPlatform(pasted);
      triggerAutoPreview(pasted);
    }, 100);
  });

  urlInput.addEventListener('input', () => {
    const text = urlInput.value.trim();
    detectPlatform(text);

    if (autoPreviewTimeout) clearTimeout(autoPreviewTimeout);
    if (text.startsWith('http://') || text.startsWith('https://')) {
      autoPreviewTimeout = setTimeout(() => {
        triggerAutoPreview(text);
      }, 700);
    }
  });

  function detectPlatform(text) {
    const lower = text.toLowerCase();
    if (lower.includes('twitter.com') || lower.includes('x.com')) {
      platformDetector.innerText = '𝕏 X/Twitter Link';
      platformDetector.style.color = '#1d9bf0';
    } else if (lower.includes('instagram.com')) {
      platformDetector.innerText = '📸 Instagram Link';
      platformDetector.style.color = '#e1306c';
    } else if (lower.includes('tiktok.com')) {
      platformDetector.innerText = '🎵 TikTok Link';
      platformDetector.style.color = '#00f2fe';
    } else if (lower.includes('reddit.com')) {
      platformDetector.innerText = '🤖 Reddit Link';
      platformDetector.style.color = '#ff4500';
    } else {
      platformDetector.innerText = 'Auto-detect social link';
      platformDetector.style.color = 'var(--m3-text-tertiary)';
    }
  }

  // Auto Video Preview Extractor
  async function triggerAutoPreview(url) {
    const raw = (url || '').trim();
    if (!raw || raw.length < 8) return;

    previewCard.classList.remove('hidden');
    previewTitle.innerText = 'Extracting media preview...';
    previewUploader.innerText = 'Loading...';
    previewDuration.innerText = 'Loading...';
    previewViews.innerText = 'Loading...';
    previewPlatformTag.innerText = platformDetector.innerText;

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw })
      });
      const data = await res.json();

      if (data.success && data.metadata) {
        const meta = data.metadata;
        previewTitle.innerText = meta.title || 'Social Video Media';
        previewUploader.innerText = meta.uploader || 'Social Author';
        previewDuration.innerText = meta.duration ? `${meta.duration}s` : 'Unknown';
        previewViews.innerText = meta.view_count || 'N/A';
        previewPlatformTag.innerText = platformDetector.innerText;

        if (meta.thumbnail && previewThumbnail) {
          previewThumbnail.src = meta.thumbnail;
          previewThumbnail.classList.remove('hidden');
        } else if (previewThumbnail) {
          previewThumbnail.classList.add('hidden');
        }

        showSnackbar('Video preview popped out!', 'check_circle');
      } else {
        previewTitle.innerText = 'Ready to download';
      }
    } catch (err) {
      previewTitle.innerText = 'Ready to download';
    }
  }

  // Sample Links Helper
  const sampleLinks = [
    'https://x.com/Twitter/status/1675604179374026752',
    'https://x.com/NASA/status/1785341201948293120'
  ];

  sampleLinkBtn.addEventListener('click', () => {
    const link = sampleLinks[Math.floor(Math.random() * sampleLinks.length)];
    urlInput.value = link;
    detectPlatform(link);
    triggerAutoPreview(link);
    showSnackbar('Sample link loaded!', 'auto_fix_high');
  });

  // Paste Clipboard Action
  pasteBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          urlInput.value = text.trim();
          detectPlatform(urlInput.value);
          triggerAutoPreview(urlInput.value);
          showSnackbar('Pasted from clipboard!', 'content_paste');
        }
      } else {
        showSnackbar('Clipboard access unavailable', 'warning');
      }
    } catch (e) {
      showSnackbar('Clipboard access denied', 'warning');
    }
  });

  // Clear Input Action
  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    previewCard.classList.add('hidden');
    detectPlatform('');
  });

  // Smart Clipboard Prompt Simulator
  setTimeout(() => {
    if (autoClipboardToggle && autoClipboardToggle.checked) {
      clipboardBanner.classList.remove('hidden');
    }
  }, 1200);

  closeClipboardBtn.addEventListener('click', () => {
    clipboardBanner.classList.add('hidden');
  });

  quickPasteBtn.addEventListener('click', () => {
    urlInput.value = 'https://x.com/Twitter/status/1675604179374026752';
    detectPlatform(urlInput.value);
    triggerAutoPreview(urlInput.value);
    clipboardBanner.classList.add('hidden');
    showSnackbar('Link pasted!', 'download');
  });

  // Manual Preview Metadata Button
  previewBtn.addEventListener('click', () => {
    const raw = urlInput.value.trim();
    if (!raw) {
      showSnackbar('Please paste a video URL first', 'warning');
      return;
    }
    triggerAutoPreview(raw);
  });

  // Download Button Action with AdMob Interstitial Trigger
  downloadBtn.addEventListener('click', () => {
    const raw = urlInput.value.trim();
    if (!raw) {
      showSnackbar('Please paste a video URL first', 'warning');
      return;
    }

    if (adSimToggle && adSimToggle.checked) {
      triggerInterstitialAd(() => {
        executeDownload(raw);
      });
    } else {
      executeDownload(raw);
    }
  });

  // Interstitial Ad Simulator
  function triggerInterstitialAd(onComplete) {
    interstitialModal.classList.remove('hidden');
    adTimerBar.style.width = '0%';
    closeAdBtn.disabled = true;
    closeAdBtn.innerText = 'Please wait (5s)...';

    let seconds = 5;
    const interval = setInterval(() => {
      seconds--;
      adCountdownText.innerText = `${seconds}s`;
      adTimerBar.style.width = `${((5 - seconds) / 5) * 100}%`;

      if (seconds > 0) {
        closeAdBtn.innerText = `Please wait (${seconds}s)...`;
      } else {
        clearInterval(interval);
        closeAdBtn.disabled = false;
        closeAdBtn.innerText = 'Continue to Download ➔';
      }
    }, 1000);

    closeAdBtn.onclick = () => {
      interstitialModal.classList.add('hidden');
      if (onComplete) onComplete();
    };
  }

  // Execute Download Logic
  async function executeDownload(rawUrls) {
    downloadCount++;
    const id = 'media_' + Date.now();
    const itemObj = {
      id: id,
      title: `Media Download #${downloadCount}`,
      format: selectedFormat,
      quality: selectedQuality,
      status: 'Downloading',
      progress: 25,
      fileUrl: null,
      filename: null
    };

    historyItems.push(itemObj);
    renderQueue();
    showSnackbar('Download started!', 'downloading');

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: rawUrls,
          quality: selectedQuality,
          format_choice: selectedFormat,
          audio_format: selectedAudio
        })
      });

      const data = await res.json();

      if (data.success && data.successful && data.successful.length > 0) {
        const first = data.successful[0];
        const files = first.files || [];
        const meta = first.metadata || {};

        itemObj.title = meta.title || itemObj.title;
        itemObj.status = 'Completed';
        itemObj.progress = 100;
        if (files.length > 0) {
          itemObj.fileUrl = files[0].download_url;
          itemObj.filename = files[0].filename;
        }

        renderQueue();
        showSnackbar('Download completed!', 'check_circle');
      } else {
        itemObj.status = 'Failed';
        itemObj.progress = 0;
        renderQueue();
        showSnackbar(data.detail || 'Download failed', 'error');
      }
    } catch (err) {
      itemObj.status = 'Failed';
      itemObj.progress = 0;
      renderQueue();
      showSnackbar('Server connection error.', 'error');
    }
  }

  // Render Queue & History Items
  function renderQueue(filter = 'all') {
    queueList.innerHTML = '';

    if (historyItems.length === 0) {
      queueList.innerHTML = `
        <div class="m3-empty-state">
          <span class="material-symbols-outlined empty-icon">folder_open</span>
          <h3 class="m3-title-medium">No media files saved yet</h3>
          <p class="m3-body-small">Paste a link on the Saver tab to start downloading.</p>
        </div>
      `;
      return;
    }

    const filtered = historyItems.filter(item => {
      if (filter === 'video') return item.format === 'video';
      if (filter === 'audio') return item.format === 'audio';
      if (filter === 'completed') return item.status === 'Completed';
      return true;
    });

    filtered.slice().reverse().forEach(item => {
      const card = document.createElement('div');
      card.className = 'm3-queue-card';
      
      let actionButtons = '';
      if (item.status === 'Completed' && item.fileUrl) {
        actionButtons = `
          <button class="m3-btn-text" onclick="playMedia('${encodeURIComponent(item.title)}', '${item.fileUrl}')">▶ Play</button>
          <a href="${item.fileUrl}" download="${item.filename || 'video.mp4'}" class="m3-btn-filled-tonal" style="text-decoration:none;">💾 Save</a>
        `;
      }

      card.innerHTML = `
        <div class="m3-queue-row">
          <span class="m3-body-medium m3-queue-title">${item.title}</span>
          <span class="m3-badge-primary">${item.status}</span>
        </div>
        <div class="m3-progress-track">
          <div class="m3-progress-fill" style="width: ${item.progress}%"></div>
        </div>
        <div class="m3-queue-row">
          <span class="m3-label-small">${item.format.toUpperCase()} • ${item.quality.toUpperCase()}</span>
          <div>${actionButtons}</div>
        </div>
      `;
      queueList.appendChild(card);
    });
  }

  // Filter Bar Handling
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderQueue(pill.dataset.filter);
    });
  });

  // Global Play Media Handler
  window.playMedia = (titleEncoded, fileUrl) => {
    playerTitle.innerText = decodeURIComponent(titleEncoded);
    videoPlayer.src = fileUrl;
    playerModal.classList.remove('hidden');
    videoPlayer.play();
  };

  closePlayerBtn.addEventListener('click', () => {
    videoPlayer.pause();
    playerModal.classList.add('hidden');
  });

  // Clear History
  clearHistoryBtn.addEventListener('click', () => {
    historyItems = [];
    renderQueue();
    showSnackbar('Library cleared', 'cleaning_services');
  });

  // Settings & Utilities
  clearCacheBtn.addEventListener('click', () => {
    historyItems = [];
    urlInput.value = '';
    previewCard.classList.add('hidden');
    renderQueue();
    showSnackbar('App cache & history cleared!', 'cleaning_services');
  });

  goProBtn.addEventListener('click', () => {
    showSnackbar('VidDownloader Pro Unlimited active!', 'workspace_premium');
  });

  // M3 Snackbar System
  function showSnackbar(message, icon = 'check_circle') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastIcon.innerText = icon;
    toastMsg.innerText = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }
});
