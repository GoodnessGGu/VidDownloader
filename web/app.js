document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navBtns = document.querySelectorAll('.nav-item');
  const viewTabs = document.querySelectorAll('.view-tab');

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

  // Active Download Pop-Out Card Elements
  const activeDownloadCard = document.getElementById('activeDownloadCard');
  const activeDlThumbnail = document.getElementById('activeDlThumbnail');
  const activeDlTitle = document.getElementById('activeDlTitle');
  const activeDlStatusText = document.getElementById('activeDlStatusText');
  const activeDlPercent = document.getElementById('activeDlPercent');
  const activeDlSpeed = document.getElementById('activeDlSpeed');
  const activeDlProgressBar = document.getElementById('activeDlProgressBar');

  // Library / Queue Elements
  const queueList = document.getElementById('queueList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const filterPills = document.querySelectorAll('.filter-pills .filter-pill');

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
  let currentMetadata = null;

  // Tab Navigation Handling
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchToTab(btn.dataset.tab);
    });
  });

  function switchToTab(tabId) {
    navBtns.forEach(b => b.classList.remove('active'));
    viewTabs.forEach(v => v.classList.add('hidden'));

    const targetBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    const targetView = document.getElementById(tabId);
    if (targetView) targetView.classList.remove('hidden');
  }

  // Active Download Card Click Handler ➔ Navigates to Library Tab
  if (activeDownloadCard) {
    activeDownloadCard.addEventListener('click', () => {
      switchToTab('tab-history');
    });
  }

  // Segmented Control Helper
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
    const segments = group.querySelectorAll('.seg-btn');
    segments.forEach(segment => {
      segment.addEventListener('click', () => {
        segments.forEach(s => s.classList.remove('active'));
        segment.classList.add('active');
        callback(segment.dataset.value, segment.innerText);
      });
    });
  }

  // Auto Platform Detection & Auto Preview Pop-Out
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
      platformDetector.innerText = 'Universal Saver';
      platformDetector.style.color = 'var(--accent-cyan)';
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
        currentMetadata = data.metadata;
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

        showToast('Video preview popped out!', '✨');
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
    showToast('Sample link loaded!', '✨');
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
          showToast('Pasted from clipboard!', '📋');
        }
      } else {
        showToast('Clipboard access unavailable', '⚠️');
      }
    } catch (e) {
      showToast('Clipboard access denied', '⚠️');
    }
  });

  // Clear Input Action
  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    previewCard.classList.add('hidden');
    detectPlatform('');
  });

  // Clipboard Smart Prompt Simulator
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
    showToast('Link pasted!', '⚡');
  });

  // Manual Preview Button
  previewBtn.addEventListener('click', () => {
    const raw = urlInput.value.trim();
    if (!raw) {
      showToast('Please paste a video URL first', '⚠️');
      return;
    }
    triggerAutoPreview(raw);
  });

  // Download Button Action with AdMob Interstitial Trigger
  downloadBtn.addEventListener('click', () => {
    const raw = urlInput.value.trim();
    if (!raw) {
      showToast('Please paste a video URL first', '⚠️');
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

  // Execute Download Logic with Live Speed, Progress % and Thumbnail Pop-Out
  async function executeDownload(rawUrls) {
    downloadCount++;
    const id = 'media_' + Date.now();
    
    // Thumbnail & Title from extracted metadata
    const thumbUrl = currentMetadata ? currentMetadata.thumbnail : null;
    const itemTitle = currentMetadata ? currentMetadata.title : `Media Download #${downloadCount}`;

    const itemObj = {
      id: id,
      title: itemTitle,
      thumbnail: thumbUrl,
      format: selectedFormat,
      quality: selectedQuality,
      status: 'Downloading',
      progress: 15,
      speed: '2.4 MB/s',
      fileUrl: null,
      filename: null
    };

    historyItems.push(itemObj);

    // Pop out Active Download Card on Main Saver Screen
    if (activeDownloadCard) {
      activeDlTitle.innerText = itemObj.title;
      activeDlStatusText.innerText = 'Downloading...';
      activeDlPercent.innerText = '15%';
      activeDlSpeed.innerText = '⚡ 2.4 MB/s';
      activeDlProgressBar.style.width = '15%';

      if (thumbUrl) {
        activeDlThumbnail.src = thumbUrl;
        activeDlThumbnail.classList.remove('hidden');
      } else {
        activeDlThumbnail.classList.add('hidden');
      }

      activeDownloadCard.classList.remove('hidden');
    }

    renderQueue();
    showToast('Download started!', '⚡');

    // Simulate Live Progress Animation while request resolves
    let fakeProgress = 15;
    const progressInterval = setInterval(() => {
      if (fakeProgress < 85) {
        fakeProgress += Math.floor(Math.random() * 15) + 5;
        const fakeSpeed = (Math.random() * 2.5 + 2.1).toFixed(1) + ' MB/s';
        
        itemObj.progress = fakeProgress;
        itemObj.speed = fakeSpeed;

        if (activeDownloadCard) {
          activeDlPercent.innerText = `${fakeProgress}%`;
          activeDlSpeed.innerText = `⚡ ${fakeSpeed}`;
          activeDlProgressBar.style.width = `${fakeProgress}%`;
        }

        renderQueue();
      }
    }, 400);

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
      clearInterval(progressInterval);

      if (data.success && data.successful && data.successful.length > 0) {
        const first = data.successful[0];
        const files = first.files || [];
        const meta = first.metadata || {};

        itemObj.title = meta.title || itemObj.title;
        itemObj.thumbnail = meta.thumbnail || itemObj.thumbnail;
        itemObj.status = 'Completed';
        itemObj.progress = 100;
        itemObj.speed = 'Done';

        if (files.length > 0) {
          itemObj.fileUrl = files[0].download_url;
          itemObj.filename = files[0].filename;
        }

        // Update Active Download Card on Main Screen
        if (activeDownloadCard) {
          activeDlStatusText.innerText = 'Completed!';
          activeDlPercent.innerText = '100%';
          activeDlSpeed.innerText = '⚡ Finished';
          activeDlProgressBar.style.width = '100%';
        }

        renderQueue();
        showToast('Download completed!', '🎉');
      } else {
        itemObj.status = 'Failed';
        itemObj.progress = 0;
        if (activeDownloadCard) {
          activeDlStatusText.innerText = 'Failed';
        }
        renderQueue();
        showToast(data.detail || 'Download failed', '❌');
      }
    } catch (err) {
      clearInterval(progressInterval);
      itemObj.status = 'Failed';
      itemObj.progress = 0;
      if (activeDownloadCard) {
        activeDlStatusText.innerText = 'Failed';
      }
      renderQueue();
      showToast('Server connection error.', '❌');
    }
  }

  // Render Queue & History Items in Media Library
  function renderQueue(filter = 'all') {
    queueList.innerHTML = '';

    if (historyItems.length === 0) {
      queueList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>Your library is empty</h3>
          <p>Paste a video link on the Saver tab to start downloading media.</p>
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
      card.className = 'queue-item-card';
      
      let actionButtons = '';
      if (item.status === 'Completed' && item.fileUrl) {
        actionButtons = `
          <button class="btn btn-secondary btn-sm" onclick="playMedia('${encodeURIComponent(item.title)}', '${item.fileUrl}')">▶ Play</button>
          <a href="${item.fileUrl}" download="${item.filename || 'video.mp4'}" class="btn btn-primary btn-sm" style="text-decoration:none;">💾 Save</a>
        `;
      }

      const thumbHtml = item.thumbnail
        ? `<img class="preview-thumb" src="${item.thumbnail}" alt="Thumb" style="width:64px;height:46px;">`
        : `<div class="preview-thumb" style="width:64px;height:46px;display:flex;align-items:center;justify-content:center;">🎬</div>`;

      card.innerHTML = `
        <div class="queue-row" style="gap:10px;">
          ${thumbHtml}
          <div style="flex:1;overflow:hidden;">
            <div class="queue-row">
              <span class="queue-item-title">${item.title}</span>
              <span class="status-tag">${item.status}</span>
            </div>
            <div class="progress-track" style="margin-top:4px;">
              <div class="progress-fill" style="width: ${item.progress}%"></div>
            </div>
          </div>
        </div>
        <div class="queue-row" style="margin-top:4px;">
          <span class="sub-text">Format: ${item.format.toUpperCase()} • ${item.speed || ''}</span>
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
    if (activeDownloadCard) activeDownloadCard.classList.add('hidden');
    renderQueue();
    showToast('Library cleared', '🧹');
  });

  // Settings & Utilities
  clearCacheBtn.addEventListener('click', () => {
    historyItems = [];
    urlInput.value = '';
    previewCard.classList.add('hidden');
    if (activeDownloadCard) activeDownloadCard.classList.add('hidden');
    renderQueue();
    showToast('App cache & history cleared!', '🧹');
  });

  goProBtn.addEventListener('click', () => {
    showToast('VidDownloader Pro Unlimited unlocked!', '👑');
  });

  // Toast Notification System
  function showToast(message, icon = '✨') {
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
