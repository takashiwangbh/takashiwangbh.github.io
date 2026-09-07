(function () {
  "use strict";

  const photographs = [
    {
      src: "../image/news8.png",
      width: 1319,
      height: 650,
      alt: "A travel collage from Kyoto, Osaka, and Nara",
      title: "Kansai, in fragments",
      place: "Kyoto · Osaka · Nara, Japan",
      date: "2025-05-06",
      iso: null,
      shutter: null,
      aperture: null
    },
    {
      src: "../image/news7.png",
      width: 1279,
      height: 1968,
      alt: "A visit to Kasukabe Station in Saitama",
      title: "A stop in Kasukabe",
      place: "Kasukabe, Saitama, Japan",
      date: "2025-02-22",
      iso: null,
      shutter: null,
      aperture: null
    },
    {
      src: "../image/new4.png",
      width: 1279,
      height: 1867,
      alt: "A New Year's fortune drawn at Sensoji Temple",
      title: "New Year's fortune",
      place: "Sensō-ji, Tokyo, Japan",
      date: "2025-01-01",
      iso: null,
      shutter: null,
      aperture: null
    },
    {
      src: "../image/news2.jpg",
      width: 2275,
      height: 1279,
      alt: "The waterfront and Rainbow Bridge seen from Odaiba",
      title: "Odaiba after light",
      place: "Odaiba, Tokyo, Japan",
      date: "2024-12-07",
      iso: null,
      shutter: null,
      aperture: null
    }
  ];

  const grid = document.getElementById("photo-grid");
  const count = document.getElementById("photo-count");
  const dialog = document.getElementById("photo-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogMetadata = document.getElementById("dialog-metadata");
  const dialogClose = dialog.querySelector(".dialog-close");
  let lastFocusedCard = null;
  let layoutFrame = null;

  function displayValue(value) {
    return value || "—";
  }

  function metadataFields(photo) {
    return [
      ["ISO", photo.iso],
      ["Shutter", photo.shutter],
      ["Aperture", photo.aperture],
      ["Date", photo.date],
      ["Place", photo.place, "photo-meta--place"]
    ];
  }

  function metadataMarkup(photo) {
    return metadataFields(photo).map(([label, value, modifier]) => `
      <span class="photo-meta${modifier ? ` ${modifier}` : ""}">
        <span class="photo-meta-label">${label}</span>
        <span class="photo-meta-value">${displayValue(value)}</span>
      </span>
    `).join("");
  }

  function openDialog(photo) {
    lastFocusedCard = document.activeElement;
    dialogImage.src = photo.src;
    dialogImage.alt = photo.alt;
    dialogTitle.textContent = photo.title;
    dialogMetadata.innerHTML = metadataMarkup(photo);
    dialog.showModal();
  }

  function createPhotoCard(photo, index) {
    const item = document.createElement("article");
    const button = document.createElement("button");

    item.className = "photo-item";
    item.dataset.date = photo.date;
    button.className = "photo-card";
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Open photograph ${index + 1}: ${photo.title}, photographed ${photo.date} in ${photo.place}`
    );
    button.innerHTML = `
      <img
        src="${photo.src}"
        width="${photo.width}"
        height="${photo.height}"
        alt="${photo.alt}"
        ${index < 3 ? "fetchpriority=\"high\"" : "loading=\"lazy\""}
        decoding="async"
      >
      <span class="photo-info" aria-hidden="true">
        <span class="photo-info-grid">${metadataMarkup(photo)}</span>
      </span>
    `;
    button.addEventListener("click", () => openDialog(photo));
    button.querySelector("img").addEventListener("load", scheduleLayout);
    item.appendChild(button);

    return item;
  }

  function columnCountFor(width) {
    if (width < 640) {
      return 1;
    }

    if (width < 1040) {
      return 2;
    }

    return 3;
  }

  function layoutMasonry() {
    const gridWidth = grid.clientWidth;

    if (!gridWidth) {
      return;
    }

    const gap = gridWidth < 640 ? 3 : 6;
    const columns = columnCountFor(gridWidth);
    const columnWidth = (gridWidth - gap * (columns - 1)) / columns;
    const columnHeights = new Array(columns).fill(0);
    const items = Array.from(grid.children);

    items.forEach((item) => {
      item.style.width = `${columnWidth}px`;

      const shortestHeight = Math.min(...columnHeights);
      const column = columnHeights.indexOf(shortestHeight);
      const x = column * (columnWidth + gap);
      const y = shortestHeight;

      item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      columnHeights[column] = y + item.offsetHeight + gap;
    });

    grid.style.height = `${Math.max(...columnHeights, 0) - (items.length ? gap : 0)}px`;
    grid.classList.add("is-ready");
  }

  function scheduleLayout() {
    window.cancelAnimationFrame(layoutFrame);
    layoutFrame = window.requestAnimationFrame(layoutMasonry);
  }

  function renderPhotos() {
    const arranged = photographs
      .slice()
      .sort((first, second) => second.date.localeCompare(first.date));
    const fragment = document.createDocumentFragment();

    arranged.forEach((photo, index) => {
      fragment.appendChild(createPhotoCard(photo, index));
    });

    grid.replaceChildren(fragment);
    count.textContent = `${String(arranged.length).padStart(2, "0")} photographs`;
    scheduleLayout();
  }

  dialogClose.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    dialogImage.src = "";

    if (lastFocusedCard) {
      lastFocusedCard.focus();
    }
  });

  window.addEventListener("resize", scheduleLayout, { passive: true });
  renderPhotos();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleLayout);
  }
}());
