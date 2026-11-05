(function () {
  "use strict";

  const photographs = window.PHOTOGRAPHS;

  const grid = document.getElementById("photo-grid");
  const dialog = document.getElementById("photo-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogMetadata = document.getElementById("dialog-metadata");
  if (!grid || !dialog || !dialogImage || !dialogTitle || !dialogMetadata) return;

  const dialogClose = dialog.querySelector(".dialog-close");
  const dialogShell = dialog.querySelector(".dialog-shell");
  let lastFocusedCard = null;

  function displayValue(value) {
    return value || "—";
  }

  function metadataFields(photo) {
    return [
      ["ISO", photo.iso],
      ["Shutter", photo.shutter],
      ["Aperture", photo.aperture],
      ["Date", photo.date]
    ];
  }

  function metadataContent(photo) {
    const fragment = document.createDocumentFragment();

    metadataFields(photo).forEach(([label, value]) => {
      const field = document.createElement("span");
      const fieldLabel = document.createElement("span");
      const fieldValue = document.createElement("span");
      field.className = "photo-meta";
      fieldLabel.className = "photo-meta-label";
      fieldLabel.textContent = label;
      fieldValue.className = "photo-meta-value";
      fieldValue.textContent = displayValue(value);
      field.append(fieldLabel, fieldValue);
      fragment.appendChild(field);
    });

    return fragment;
  }

  function openDialog(photo) {
    lastFocusedCard = document.activeElement;
    dialogImage.src = photo.fullSrc || photo.src;
    dialogImage.alt = photo.alt || photo.title || "Personal photograph";
    dialogTitle.textContent = photo.title;
    dialogMetadata.replaceChildren(metadataContent(photo));
    dialog.showModal();
  }

  function createPhotoCard(photo, index) {
    const item = document.createElement("article");
    const button = document.createElement("button");
    const image = document.createElement("img");
    const caption = document.createElement("div");

    item.className = "photo-item";
    item.dataset.date = photo.date || "";
    item.dataset.orientation = photo.height > photo.width ? "portrait" : "landscape";
    button.className = "photo-card";
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Open photograph ${index + 1}: ${photo.title}${photo.date ? `, photographed ${photo.date}` : ""}`
    );
    image.src = index === 0 ? photo.fullSrc || photo.src : photo.src;
    if (photo.fullSrc && Number.isFinite(photo.fullWidth) && photo.fullWidth > photo.width) {
      image.srcset = `${photo.src} ${photo.width}w, ${photo.fullSrc} ${photo.fullWidth}w`;
      image.sizes = index === 0
        ? "(min-width: 1440px) 1280px, (max-width: 700px) calc(100vw - 48px), 89vw"
        : "(min-width: 1440px) 624px, (max-width: 700px) calc(100vw - 48px), calc(44.5vw - 16px)";
    }
    image.width = photo.width;
    image.height = photo.height;
    image.alt = photo.alt || photo.title || "Personal photograph";
    image.dataset.source = "client";
    image.dataset.subject = "personal photography";
    image.decoding = "async";
    if (index === 0) {
      image.fetchPriority = "high";
    } else {
      image.loading = "lazy";
    }
    button.setAttribute("aria-haspopup", "dialog");
    caption.className = "photo-caption";
    metadataFields(photo).forEach(([label, value]) => {
      const field = document.createElement(label === "Date" && value ? "time" : "span");
      field.className = "photo-caption-field";
      field.setAttribute("aria-label", `${label}: ${displayValue(value)}`);
      if (label === "Date" && value) {
        field.dateTime = value;
        field.textContent = value.replaceAll("-", ".");
      } else {
        field.textContent = `${label === "ISO" ? "ISO " : ""}${displayValue(value)}`;
      }
      caption.appendChild(field);
    });
    button.appendChild(image);
    button.addEventListener("click", () => openDialog(photo));
    item.append(button, caption);

    return item;
  }

  function renderPhotos() {
    if (!Array.isArray(photographs) || !photographs.length) {
      const message = document.createElement("p");
      message.className = "empty-archive";
      message.textContent = Array.isArray(photographs)
        ? "No photographs in the collection yet."
        : "The photography collection could not be loaded. Please try again later.";
      grid.replaceChildren(message);
      return;
    }

    const arranged = photographs
      .slice()
      .sort((first, second) => (second.date || "").localeCompare(first.date || ""));
    const fragment = document.createDocumentFragment();

    arranged.forEach((photo, index) => {
      fragment.appendChild(createPhotoCard(photo, index));
    });

    grid.replaceChildren(fragment);
  }

  dialogClose.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target === dialogShell) {
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    dialogImage.removeAttribute("src");

    if (lastFocusedCard) {
      lastFocusedCard.focus({ preventScroll: true });
    }
  });

  renderPhotos();
}());
