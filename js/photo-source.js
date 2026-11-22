/* Display original JPEGs, or the JPEG already embedded in a camera RAW file. */
(function () {
  "use strict";

  const sources = new Map();
  const states = new WeakMap();
  let observer;

  function jpegParts(bytes, orientation) {
    if (!Number.isInteger(orientation) || orientation < 2 || orientation > 8) return [bytes];

    // Update an existing EXIF orientation without decoding or changing image pixels.
    let position = 2;
    while (position + 4 <= bytes.length && bytes[position] === 0xff) {
      const marker = bytes[position + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = (bytes[position + 2] << 8) | bytes[position + 3];
      const end = position + 2 + length;
      if (length < 2 || end > bytes.length) break;
      const payload = position + 4;
      if (marker === 0xe1 && length >= 16 &&
          bytes[payload] === 0x45 && bytes[payload + 1] === 0x78 &&
          bytes[payload + 2] === 0x69 && bytes[payload + 3] === 0x66 &&
          bytes[payload + 4] === 0 && bytes[payload + 5] === 0) {
        const start = payload + 6;
        const littleEndian = bytes[start] === 0x49 && bytes[start + 1] === 0x49;
        const bigEndian = bytes[start] === 0x4d && bytes[start + 1] === 0x4d;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if ((littleEndian || bigEndian) && view.getUint16(start + 2, littleEndian) === 42) {
          const directory = start + view.getUint32(start + 4, littleEndian);
          if (directory >= start && directory + 2 <= end) {
            const count = view.getUint16(directory, littleEndian);
            for (let index = 0; index < count; index += 1) {
              const entry = directory + 2 + index * 12;
              if (entry + 12 > end) break;
              if (view.getUint16(entry, littleEndian) === 0x0112 &&
                  view.getUint16(entry + 2, littleEndian) === 3 &&
                  view.getUint32(entry + 4, littleEndian) === 1) {
                const adjusted = bytes.slice();
                new DataView(adjusted.buffer).setUint16(entry + 8, orientation, littleEndian);
                return [adjusted];
              }
            }
          }
        }
      }
      position = end;
    }

    // A minimal EXIF header instructs the browser to orient the existing JPEG.
    const exif = new Uint8Array([
      0xff, 0xe1, 0, 34, 0x45, 0x78, 0x69, 0x66, 0, 0,
      0x49, 0x49, 42, 0, 8, 0, 0, 0, 1, 0,
      0x12, 1, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0
    ]);
    return [bytes.subarray(0, 2), exif, bytes.subarray(2)];
  }

  function previewSource(photo) {
    const preview = photo.preview;
    const source = new URL(photo.src, document.baseURI).href;
    const { offset, length } = preview;
    if (!Number.isSafeInteger(offset) || offset < 0 ||
        !Number.isSafeInteger(length) || length < 2 ||
        !Number.isSafeInteger(offset + length)) {
      return Promise.reject(new Error("The embedded JPEG location is invalid."));
    }
    const key = `${source}|${offset}|${length}|${preview.orientation || 1}`;
    if (!sources.has(key)) {
      const pending = (async () => {
        const response = await fetch(source, {
          headers: { Range: `bytes=${offset}-${offset + length - 1}` },
          credentials: "omit"
        });
        if (response.status !== 200 && response.status !== 206) {
          throw new Error(`The photograph request failed (${response.status}).`);
        }
        const body = new Uint8Array(await response.arrayBuffer());
        let jpeg;
        if (response.status === 206) {
          if (body.length !== length) throw new Error("The embedded JPEG response is incomplete.");
          jpeg = body;
        } else {
          if (body.length < offset + length) throw new Error("The original photograph response is incomplete.");
          jpeg = body.subarray(offset, offset + length);
        }
        if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
          throw new Error("The embedded photograph is not a JPEG.");
        }
        const url = URL.createObjectURL(new Blob(jpegParts(jpeg, preview.orientation), { type: "image/jpeg" }));
        return { url, key };
      })();
      sources.set(key, pending);
      pending.catch(() => {
        if (sources.get(key) === pending) sources.delete(key);
      });
    }
    return sources.get(key);
  }

  function clear(image) {
    const state = states.get(image);
    if (state) {
      states.delete(image);
      if (observer) observer.unobserve(image);
      state.cleanup();
      state.status.textContent = "";
      state.status.hidden = true;
      if (state.ownsStatus) state.status.remove();
      state.resolve(false);
    }
    image.removeAttribute("src");
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.removeAttribute("aria-busy");
    delete image.dataset.loadState;
  }

  function load(image, photo, options = {}) {
    clear(image);
    const status = options.statusElement || document.createElement("span");
    status.classList.add("photo-load-status");
    status.setAttribute("role", "status");
    status.hidden = true;
    if (!options.statusElement) image.after(status);
    if (Number.isFinite(photo.width) && photo.width > 0 &&
        Number.isFinite(photo.height) && photo.height > 0) {
      image.width = photo.width;
      image.height = photo.height;
      image.style.aspectRatio = `${photo.width} / ${photo.height}`;
    }
    image.alt = photo.alt || photo.title || "Personal photograph";
    image.decoding = "async";
    image.loading = options.lazy ? "lazy" : "eager";

    return new Promise((resolve) => {
      const state = { status, ownsStatus: !options.statusElement, resolve, cleanup: () => {} };
      states.set(image, state);
      const current = () => states.get(image) === state;
      const finish = (success) => {
        if (!current()) return;
        state.cleanup();
        image.removeAttribute("aria-busy");
        image.dataset.loadState = success ? "loaded" : "error";
        if (!success) {
          if (state.rawSource) {
            sources.delete(state.rawSource.key);
            URL.revokeObjectURL(state.rawSource.url);
          }
          image.removeAttribute("src");
          status.textContent = "This photograph could not be loaded. Please try opening it again.";
          status.hidden = false;
        }
        resolve(success);
      };
      state.begin = async () => {
        if (!current() || state.started) return;
        state.started = true;
        if (observer) observer.unobserve(image);
        image.setAttribute("aria-busy", "true");
        image.dataset.loadState = "loading";
        const loaded = () => finish(true);
        const failed = () => finish(false);
        image.addEventListener("load", loaded);
        image.addEventListener("error", failed);
        state.cleanup = () => {
          image.removeEventListener("load", loaded);
          image.removeEventListener("error", failed);
        };
        try {
          const source = photo.preview ? await previewSource(photo) : { url: photo.src };
          if (current()) {
            if (photo.preview) state.rawSource = source;
            image.src = source.url;
          }
        } catch {
          finish(false);
        }
      };
      if (photo.preview && options.lazy && "IntersectionObserver" in window) {
        if (!observer) observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) states.get(entry.target)?.begin();
          });
        }, { rootMargin: "600px" });
        image.dataset.loadState = "waiting";
        observer.observe(image);
      } else {
        state.begin();
      }
    });
  }

  window.PhotoSource = Object.freeze({ load, clear });
}());
