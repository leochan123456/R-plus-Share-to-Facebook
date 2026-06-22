const templateSelect = document.getElementById('template-select');
const assetInput = document.getElementById('asset-input');
const assetPreview = document.getElementById('asset-preview');
const captionInput = document.getElementById('caption-input');
const shareButton = document.getElementById('share-button');
const statusText = document.getElementById('status-text');

let uploadedAssetUrl = null;

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.className = `status-text ${isError ? 'error' : 'success'}`;
}

function showAssetPreview(file, serverUrl) {
  assetPreview.innerHTML = '';
  if (!file && !serverUrl) {
    assetPreview.textContent = 'No media selected yet.';
    return;
  }

  if (file && file.type.startsWith('image/')) {
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    image.onload = () => URL.revokeObjectURL(image.src);
    image.alt = 'Selected asset preview';
    assetPreview.appendChild(image);
  } else if (file && file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.controls = true;
    video.muted = true;
    assetPreview.appendChild(video);
  } else if (serverUrl) {
    const preview = document.createElement('div');
    preview.textContent = `Uploaded asset ready: ${serverUrl}`;
    assetPreview.appendChild(preview);
  }
}

function getFacebookPopupOptions() {
  const width = 960;
  const height = 650;
  const left = window.screenX + (window.innerWidth - width) / 2;
  const top = window.screenY + (window.innerHeight - height) / 2;
  return `width=${width},height=${height},left=${left},top=${top}`;
}

function openFacebookShare(postId, popupWindow) {
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    `${window.location.origin}/post/${postId}`
  )}`;

  if (popupWindow && !popupWindow.closed) {
    popupWindow.location.href = shareUrl;
  } else {
    window.open(shareUrl, 'fbShare', getFacebookPopupOptions());
  }
}

async function copyCaptionToClipboard(caption) {
  if (!navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(caption);
    return true;
  } catch (error) {
    return false;
  }
}

async function uploadAsset(file) {
  const formData = new FormData();
  formData.append('asset', file);
  formData.append('theme', templateSelect.value);

  const response = await fetch('/api/upload-asset', {
    method: 'POST',
    body: formData
  });

  return response.json();
}

assetInput.addEventListener('change', async () => {
  const file = assetInput.files && assetInput.files[0];
  if (!file) {
    setStatus('Select a photo or video to begin.', true);
    assetPreview.innerHTML = '';
    uploadedAssetUrl = null;
    return;
  }

  showAssetPreview(file);
  setStatus('Uploading media and generating draft caption...');
  shareButton.disabled = true;

  try {
    const result = await uploadAsset(file);
    if (result.error) {
      throw new Error(result.error);
    }

    uploadedAssetUrl = result.assetUrl;
    captionInput.value = result.draftCaption;
    setStatus('Media uploaded and draft caption generated. Review the text before sharing.');
  } catch (error) {
    uploadedAssetUrl = null;
    setStatus(error.message || 'Upload failed. Please try again.', true);
  } finally {
    shareButton.disabled = false;
  }
});

shareButton.addEventListener('click', async () => {
  const theme = templateSelect.value;
  let caption = captionInput.value.trim();

  if (!uploadedAssetUrl) {
    const file = assetInput.files && assetInput.files[0];
    if (!file) {
      setStatus('Please upload a photo or video asset before sharing.', true);
      return;
    }

    setStatus('Uploading selected asset before sharing...');
    shareButton.disabled = true;

    try {
      const result = await uploadAsset(file);
      if (result.error) {
        throw new Error(result.error);
      }
      uploadedAssetUrl = result.assetUrl;
      captionInput.value = result.draftCaption;
      caption = result.draftCaption.trim();
      setStatus('Asset uploaded successfully, continuing to share...');
    } catch (error) {
      setStatus(error.message || 'Asset upload failed before sharing.', true);
      shareButton.disabled = false;
      return;
    }
  }

  if (!caption) {
    setStatus('Please review or enter a marketing caption before sharing.', true);
    captionInput.focus();
    shareButton.disabled = false;
    return;
  }

  setStatus('Saving post and preparing Facebook share...');
  const popup = window.open('about:blank', 'fbShare', getFacebookPopupOptions());

  try {
    const response = await fetch('/api/create-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, caption, assetUrl: uploadedAssetUrl })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Unable to create post.');
    }

    const copied = await copyCaptionToClipboard(caption);
    if (copied) {
      setStatus('Caption copied to clipboard. Opening Facebook share popup...');
    } else {
      setStatus('Post created. Please paste caption manually in Facebook if clipboard access is blocked.');
    }

    openFacebookShare(result.postId, popup);
  } catch (error) {
    setStatus(error.message || 'An unexpected error occurred.', true);
    if (popup && !popup.closed) {
      popup.close();
    }
  } finally {
    shareButton.disabled = false;
  }
});
