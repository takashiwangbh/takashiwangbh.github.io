(function () {
  "use strict";

  const photographs = window.PHOTOGRAPHS;

  const grid = document.getElementById("photo-grid");
  const dialog = document.getElementById("photo-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogMetadata = document.getElementById("dialog-metadata");
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
    dialogImage.alt = photo.alt;
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
    image.src = index < 3 ? photo.fullSrc || photo.src : photo.src;
    if (photo.fullSrc && Number.isFinite(photo.fullWidth) && photo.fullWidth > photo.width) {
      image.srcset = `${photo.src} ${photo.width}w, ${photo.fullSrc} ${photo.fullWidth}w`;
      const desktopWidth = [83, 60, 45, 30, 75, 60, 37, 90, 37, 37, 67, 67][index % 12];
      image.sizes = `(max-width: 700px) 90vw, (min-width: 2200px) ${Math.round(desktopWidth / 90 * 2000)}px, ${desktopWidth}vw`;
    }
    image.width = photo.width;
    image.height = photo.height;
    image.alt = photo.alt;
    image.decoding = "async";
    if (index < 3) {
      image.fetchPriority = "high";
    } else {
      image.loading = "lazy";
    }
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
