const container = document.getElementById('container');
const zoneViewer = document.getElementById('zoneViewer');
let zoneFrame = document.getElementById('zoneFrame');
const searchBar = document.getElementById('searchBar');
const sortOptions = document.getElementById('sortOptions');
const filterOptions = document.getElementById('filterOptions');
// https://www.jsdelivr.com/tools/purge
const zonesurls = [
    "https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/assets@main/zones.json",
    "https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/assets@latest/zones.json",
    "https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/assets@master/zones.json",
    "https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/assets/zones.json"
];
let zonesURL = zonesurls[Math.floor(Math.random() * zonesurls.length)];
const coverURL = "https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/covers@main";
const htmlURL = "https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/html@main";
let zones = [];
let popularityData = {};
const featuredContainer = document.getElementById('featuredZones');
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}
async function listZones() {
    try {
      let sharesponse;
      let shajson;
      let sha;
        try {
          sharesponse = await fetch("https://api.github.com/repos/%67%6e%2d%6d%61%74%68/assets/commits?t="+Date.now());
        } catch (error) {}
        if (sharesponse && sharesponse.status === 200) {
          try {
            shajson = await sharesponse.json();
            sha = shajson[0]['sha'];
            if (sha) {
                zonesURL = `https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/assets@${sha}/zones.json`;
            }
          } catch (error) {
            try {
                let secondarysharesponse = await fetch("https://raw.githubusercontent.com/%67%6e%2d%6d%61%74%68/xml/refs/heads/main/sha.txt?t="+Date.now());
                if (secondarysharesponse && secondarysharesponse.status === 200) {
                    sha = (await secondarysharesponse.text()).trim();
                    if (sha) {
                        zonesURL = `https://cdn.jsdelivr.net/gh/%67%6e%2d%6d%61%74%68/assets@${sha}/zones.json`;
                    }
                }
            } catch(error) {}
          }
        }
        const response = await fetch(zonesURL+"?t="+Date.now());
        const json = await response.json();
        zones = json;
        zones[0].featured = true; // always gonna be the discord
        await Promise.all([fetchPopularity("year"), fetchPopularity("month"), fetchPopularity("week"), fetchPopularity("day")]);
        sortZones();
        try {
        const search = new URLSearchParams(window.location.search);
        const id = search.get('id');
        const embed = window.location.hash.includes("embed");
        if (id) {
            const zone = zones.find(zone => zone.id + '' == id + '');
            if (zone) {
                if (embed) {
                    if (zone.url.startsWith("http")) {
                        window.open(zone.url, "_blank");
                    } else {
                        const url = zone.url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
                        fetch(url+"?t="+Date.now()).then(response => response.text()).then(html => {
                            document.documentElement.innerHTML = html;
                            const popup = document.createElement("div");
                            popup.style.position = "fixed";
                            popup.style.bottom = "20px";
                            popup.style.right = "20px";
                            popup.style.backgroundColor = "#cce5ff";
                            popup.style.color = "#004085";
                            popup.style.padding = "10px";
                            popup.style.border = "1px solid #b8daff";
                            popup.style.borderRadius = "5px";
                            popup.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.1)";
                            popup.style.fontFamily = "Arial, sans-serif";
                            
                            popup.innerHTML = `Play more games at <a href="https://gn-math.dev" target="_blank" style="color:#004085; font-weight:bold;">https://gn-math.dev</a>!`;
                            
                            const closeBtn = document.createElement("button");
                            closeBtn.innerText = "?";
                            closeBtn.style.marginLeft = "10px";
                            closeBtn.style.background = "none";
                            closeBtn.style.border = "none";
                            closeBtn.style.cursor = "pointer";
                            closeBtn.style.color = "#004085";
                            closeBtn.style.fontWeight = "bold";
                            
                            closeBtn.onclick = () => popup.remove();
                            popup.appendChild(closeBtn);
                            document.body.appendChild(popup);
                            document.documentElement.querySelectorAll('script').forEach(oldScript => {
                                const newScript = document.createElement('script');
                                if (oldScript.src) {
                                    newScript.src = oldScript.src;
                                } else {
                                    newScript.textContent = oldScript.textContent;
                                }
                                document.body.appendChild(newScript);
                            });
                        }).catch(error => alert("Failed to load zone: " + error));
                    }
                } else {
                    openZone(zone);
                }
            }
        }
        } catch(error){}
        let alltags = [];
        for (const obj of json) {
            if (Array.isArray(obj.special)) {
                alltags.push(...obj.special);
            }
        }

        alltags = [...new Set(alltags)];
        let filteroption = document.getElementById("filterOptions");
        if (filteroption && filteroption.children.length > 1) {
            while (filteroption.children.length > 1) {
                filteroption.removeChild(filteroption.lastElementChild);
            }
        }
        for (const tag of alltags) {
            const opt = document.createElement("option");
            opt.value = tag;
            opt.textContent = toTitleCase(tag);
            filteroption.appendChild(opt);
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = `Error loading zones: ${error}`;
    }
}
async function fetchPopularity(duration) {
    try {
        if (!popularityData[duration]) {
            popularityData[duration] = {};
        }
        const response = await fetch(
            "https://data.jsdelivr.com/v1/stats/packages/gh/%67%6e%2d%6d%61%74%68/html@main/files?period=" + duration
        );
        const data = await response.json();
        data.forEach(file => {
            const idMatch = file.name.match(/\/(\d+)\.html$/);
            if (idMatch) {
                const id = parseInt(idMatch[1]);
                popularityData[duration][id] = file.hits?.total ?? 0;
            }
        });
    } catch (error) {
        if (!popularityData[duration]) {
            popularityData[duration] = {};
        }
        popularityData[duration][0] = 0;
    }
}


function sortZones() {
    const sortBy = sortOptions.value;
    if (sortBy === 'name') {
        zones.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'id') {
        zones.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'popular') {
        zones.sort((a, b) => ((popularityData['year']?.[b.id]) ?? 0) - ((popularityData['year']?.[a.id]) ?? 0));
    } else if (sortBy === 'trendingMonth') {
        zones.sort((a, b) => ((popularityData['month']?.[b.id]) ?? 0) - ((popularityData['month']?.[a.id]) ?? 0));
    } else if (sortBy === 'trendingWeek') {
        zones.sort((a, b) => ((popularityData['week']?.[b.id]) ?? 0) - ((popularityData['week']?.[a.id]) ?? 0));
    } else if (sortBy === 'trendingDay') {
        zones.sort((a, b) => ((popularityData['day']?.[b.id]) ?? 0) - ((popularityData['day']?.[a.id]) ?? 0));
    }
    zones.sort((a, b) => (a.id === -1 ? -1 : b.id === -1 ? 1 : 0));
    startupFavorites();
    if (featuredContainer.innerHTML === "") {
        const featured = zones.filter(z => z.featured);
        displayFeaturedZones(featured);
    }
    displayZones(zones);
}

function displayFeaturedZones(featuredZones) {
    featuredContainer.innerHTML = "";
    featuredZones.forEach((file, index) => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item";
        zoneItem.onclick = () => openZone(file);
        const favoriteButton = document.createElement("div");
        favoriteButton.classList = 'favorite-button';
        favoriteButton.textContent = '★';
        favoriteButton.onclick = (event) => {
            console.log(file.name)
            event.stopPropagation()
            toggleFavorite(favoriteButton, file)
        };
        if (zoneFavorites.some(fav => fav && fav.name === file.name)) {
            favoriteButton.className = 'favorite-button starred'
        }
        favoriteButton.setAttribute('data-zone-name', file.name);
        zoneItem.appendChild(favoriteButton);
        const img = document.createElement("img");
        img.dataset.src = file.cover.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        img.alt = file.name;
        img.loading = "lazy";
        img.className = "lazy-zone-img";
        zoneItem.appendChild(img);
        const button = document.createElement("button");
        button.textContent = file.name;
        button.onclick = (event) => {
            event.stopPropagation();
            openZone(file);
        };
        zoneItem.appendChild(button);
        featuredContainer.appendChild(zoneItem);
    });
    if (featuredContainer.innerHTML === "") {
        featuredContainer.innerHTML = "No featured zones found.";
    } else {
        document.getElementById("allZonesSummary").textContent = `Featured Zones (${featuredZones.length})`;
    }

    const lazyImages = document.querySelectorAll('#featuredZones img.lazy-zone-img');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !zoneViewer.hidden) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy-zone-img");
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: "100px", 
        threshold: 0.1
    });

    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
}
function displayZones(zones) {
    container.innerHTML = "";
    zones.forEach((file, index) => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item";
        zoneItem.onclick = () => openZone(file);
        const favoriteButton = document.createElement("div");
        favoriteButton.classList = 'favorite-button';
        favoriteButton.textContent = '★';
        favoriteButton.id = 'favorite-' + file.id;
        favoriteButton.onclick = (event) => {
            console.log(file.name)
            event.stopPropagation()
            toggleFavorite(favoriteButton, file)
        };
        if (zoneFavorites.some(fav => fav && fav.name === file.name)) {
            favoriteButton.className = 'favorite-button starred'
        }
        zoneItem.appendChild(favoriteButton);
        favoriteButton.setAttribute('data-zone-name', file.name);
        const img = document.createElement("img");
        img.dataset.src = file.cover.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        img.alt = file.name;
        img.loading = "lazy";
        img.className = "lazy-zone-img";
        zoneItem.appendChild(img);
        const button = document.createElement("button");
        button.textContent = file.name;
        button.onclick = (event) => {
            event.stopPropagation();
            openZone(file);
        };
        zoneItem.appendChild(button);
        container.appendChild(zoneItem);   
    });
    if (container.innerHTML === "") {
        container.innerHTML = "No zones found.";
    } else {
        document.getElementById("allSummary").textContent = `All Zones (${zones.length})`;
    }

    const lazyImages = document.querySelectorAll('img.lazy-zone-img');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !zoneViewer.hidden) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy-zone-img");
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: "100px", 
        threshold: 0.1
    });

    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
}

function filterZones2() {
    const query = filterOptions.value;
    if (query === "none") {
        displayZones(zones);
    } else {
        const filteredZones = zones.filter(zone => zone.special?.includes(query));
        if (query.length !== 0) {
            document.getElementById("featuredZonesWrapper").removeAttribute("open");
        }
        displayZones(filteredZones);
    }
}

function filterZones() {
    const query = searchBar.value.toLowerCase();
    const filteredZones = zones.filter(zone => zone.name.toLowerCase().includes(query));
    if (query.length !== 0) {
        document.getElementById("featuredZonesWrapper").removeAttribute("open");
    }
    displayZones(filteredZones);
}

function openZone(file) {
    if (file.url.startsWith("http")) {
        window.open(file.url, "_blank");
    } else {
        const url = file.url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        fetch(url+"?t="+Date.now()).then(response => response.text()).then(html => {
            if (zoneFrame.contentDocument === null) {
                zoneFrame = document.createElement("iframe");
                zoneFrame.id = "zoneFrame";
                zoneViewer.appendChild(zoneFrame);
            }
            zoneFrame.contentDocument.open();
            zoneFrame.contentDocument.write(html);
            zoneFrame.contentDocument.close();
            document.getElementById('zoneName').textContent = file.name;
            document.getElementById('zoneId').textContent = file.id;
            document.getElementById('zoneAuthor').textContent = "by " + file.author;
            if (file.authorLink) {
                document.getElementById('zoneAuthor').href = file.authorLink;
            }
            zoneViewer.style.display = "block";
            try {
                const url = new URL(window.location);
                url.searchParams.set('id', file.id);
                history.pushState(null, '', url.toString());
            } catch(error){}
            zoneViewer.hidden = true;
        }).catch(error => alert("Failed to load zone: " + error));
    }
}

function aboutBlank() {
    const newWindow = window.open("about:blank", "_blank");
    let zone = zones.find(zone => zone.id + '' === document.getElementById('zoneId').textContent).url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
    fetch(zone+"?t="+Date.now()).then(response => response.text()).then(html => {
        if (newWindow) {
            newWindow.document.open();
            newWindow.document.write(html);
            newWindow.document.close();
        }
    })
}

function closeZone() {
    zoneViewer.hidden = false;
    zoneViewer.style.display = "none";
    zoneViewer.removeChild(zoneFrame);
    try {
    const url = new URL(window.location);
    url.searchParams.delete('id');
    history.pushState(null, '', url.toString());
    } catch(error){}
}

function downloadZone() {
    let zone = zones.find(zone => zone.id + '' === document.getElementById('zoneId').textContent);
    fetch(zone.url.replace("{HTML_URL}", htmlURL)+"?t="+Date.now()).then(res => res.text()).then(text => {
        const blob = new Blob([text], {
            type: "text/plain;charset=utf-8"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zone.name + ".html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function fullscreenZone() {
    if (zoneFrame.requestFullscreen) {
        zoneFrame.requestFullscreen();
    } else if (zoneFrame.mozRequestFullScreen) {
        zoneFrame.mozRequestFullScreen();
    } else if (zoneFrame.webkitRequestFullscreen) {
        zoneFrame.webkitRequestFullscreen();
    } else if (zoneFrame.msRequestFullscreen) {
        zoneFrame.msRequestFullscreen();
    }
}

function sanitizeData(obj, maxStringLen = 1000, maxArrayLen = 10000) {
    if (typeof obj === 'string') {
      return obj.length > maxStringLen ? obj.slice(0, maxStringLen) + '...[truncated]' : obj;
    }
    
    if (obj instanceof Uint8Array) {
      if (obj.length > maxArrayLen) {
        return `[Uint8Array too large (${obj.length} bytes), truncated]`;
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeData(item, maxStringLen, maxArrayLen));
    }
    
    if (obj && typeof obj === 'object') {
      const newObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[key] = sanitizeData(obj[key], maxStringLen, maxArrayLen);
        }
      }
      return newObj;
    }
    
    return obj;
  }

async function saveData() {
    alert("This might take a while, dont touch anything other than this OK button");
    const result = {};
    result.cookies = document.cookie;
    result.localStorage = {...localStorage};
    result.sessionStorage = {...sessionStorage};
    result.indexedDB = {};
    const dbs = await indexedDB.databases();
    for (const dbInfo of dbs) {
      if (!dbInfo.name) continue;
      result.indexedDB[dbInfo.name] = {};
      await new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(dbInfo.name, dbInfo.version);
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          const storeNames = Array.from(db.objectStoreNames);
          if (storeNames.length === 0) {
            resolve();
            return;
          }
          const transaction = db.transaction(storeNames, "readonly");
          const storePromises = [];
          for (const storeName of storeNames) {
            result.indexedDB[dbInfo.name][storeName] = [];
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();
            const p = new Promise((res, rej) => {
              getAllRequest.onsuccess = () => {
                result.indexedDB[dbInfo.name][storeName] = sanitizeData(getAllRequest.result, 1000, 100);
                res();
              };
              getAllRequest.onerror = () => rej(getAllRequest.error);
            });
            storePromises.push(p);
          }
          Promise.all(storePromises).then(() => resolve());
        };
      });
    }

    result.caches = {};
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      result.caches[cacheName] = [];
      for (const req of requests) {
        const response = await cache.match(req);
        if (!response) continue;
        const cloned = response.clone();
        const contentType = cloned.headers.get('content-type') || '';
        let body;
        try {
          if (contentType.includes('application/json')) {
            body = await cloned.json();
          } else if (contentType.includes('text') || contentType.includes('javascript')) {
            body = await cloned.text();
          } else {
            const buffer = await cloned.arrayBuffer();
            body = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          }
        } catch (e) {
          body = '[Unable to read body]';
        }
        result.caches[cacheName].push({
          url: req.url,
          body,
          contentType
        });
      }
    }
  
    alert("Done, wait for the download to come");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(result)], {
        type: "application/octet-stream"
    }));
    link.download = `${Date.now()}.data`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  async function loadData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        const data = JSON.parse(e.target.result);
        if (data.cookies) {
            data.cookies.split(';').forEach(cookie => {
              document.cookie = cookie.trim();
            });
          }
        
          if (data.localStorage) {
            for (const key in data.localStorage) {
              localStorage.setItem(key, data.localStorage[key]);
            }
          }
        
          if (data.sessionStorage) {
            for (const key in data.sessionStorage) {
              sessionStorage.setItem(key, data.sessionStorage[key]);
            }
          }
        
          if (data.indexedDB) {
            for (const dbName in data.indexedDB) {
              const stores = data.indexedDB[dbName];
              await new Promise((resolve, reject) => {
                const request = indexedDB.open(dbName, 1);
                request.onupgradeneeded = e => {
                  const db = e.target.result;
                  for (const storeName in stores) {
                    if (!db.objectStoreNames.contains(storeName)) {
                      db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    }
                  }
                };
                request.onsuccess = e => {
                  const db = e.target.result;
                  const transaction = db.transaction(Object.keys(stores), 'readwrite');
                  transaction.onerror = () => reject(transaction.error);
                  let pendingStores = Object.keys(stores).length;
        
                  for (const storeName in stores) {
                    const objectStore = transaction.objectStore(storeName);
                    objectStore.clear().onsuccess = () => {
                      for (const item of stores[storeName]) {
                        objectStore.put(item);
                      }
                      pendingStores--;
                      if (pendingStores === 0) resolve();
                    };
                  }
                };
                request.onerror = () => reject(request.error);
              });
            }
          }
        
          if (data.caches) {
            for (const cacheName in data.caches) {
              const cache = await caches.open(cacheName);
              await cache.keys().then(keys => Promise.all(keys.map(k => cache.delete(k)))); // clear existing
        
              for (const entry of data.caches[cacheName]) {
                let responseBody;
                if (entry.contentType.includes('application/json')) {
                  responseBody = JSON.stringify(entry.body);
                } else if (entry.contentType.includes('text') || entry.contentType.includes('javascript')) {
                  responseBody = entry.body;
                } else {
                  const binaryStr = atob(entry.body);
                  const len = binaryStr.length;
                  const bytes = new Uint8Array(len);
                  for (let i = 0; i < len; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                  }
                  responseBody = bytes.buffer;
                }
                const headers = new Headers({ 'content-type': entry.contentType });
                const response = new Response(responseBody, { headers });
                await cache.put(entry.url, response);
              }
            }
          }
        alert("Data loaded");
    };
    alert("This might take a while, dont touch anything other than this OK button");
    reader.readAsText(file);
  }

function darkMode() {
    document.body.classList.toggle("dark-mode");
}

function cloakIcon(url) {
    const link = document.querySelector("link[rel~='icon']");
    link.rel = "icon";
    if ((url+"").trim().length === 0) {
        link.href = "favicon.png";
    } else {
        link.href = url;
    }
    document.head.appendChild(link);
}
function cloakName(string) {
    if ((string+"").trim().length === 0) {
        document.title = "gn-math";
        return;
    }
    document.title = string;
}

function tabCloak() {
    closePopup();
    document.getElementById('popupTitle').textContent = "Tab Cloak";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <label for="tab-cloak-textbox" style="font-weight: bold;">Set Tab Title:</label><br>
        <input type="text" id="tab-cloak-textbox" placeholder="Enter new tab name..." oninput="cloakName(this.value)">
        <br><br><br><br>
        <label for="tab-cloak-textbox" style="font-weight: bold;">Set Tab Icon:</label><br>
        <input type="text" id="tab-cloak-textbox" placeholder="Enter new tab icon..." oninput='cloakIcon(this.value)'>
        <br><br><br>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

const settings = document.getElementById('settings');
settings.addEventListener('click', () => {
    document.getElementById('popupTitle').textContent = "Settings";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
    <button class="settings-button" onclick="darkMode()">Toggle Dark Mode</button>
    <br><br>
    <button class="settings-button" onclick="tabCloak()">Tab Cloak</button>
    <br><br>
    <button class="settings-button" onclick="erudaToggle()">Toggle Console</button>
    <br>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
});


function showContact() {
    document.getElementById('popupTitle').textContent = "Contact";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
    <p>Discord: https://discord.gg/NAFw4ykZ7n</p>
    <p>Email: gn.math.business@gmail.com</p>`;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

function loadPrivacy() {
    document.getElementById('popupTitle').textContent = "Privacy Policy";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <h2>PRIVACY POLICY</h2>
            <p>Last updated Feburary 20, 2026</p>
            <p>This Privacy Notice for gn-math ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:</p>
            <ul>
                <li>Visit our website at <a href="https://gn-math.dev">https://gn-math.dev</a>, or any website of ours that links to this Privacy Notice</li>
                <li>Engage with us in other related ways, including any sales, marketing, or events</li>
            </ul>
            <p>Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="https://discord.gg/NAFw4ykZ7n">https://discord.gg/NAFw4ykZ7n</a>.</p>
            
            <h3>SUMMARY OF KEY POINTS</h3>
            <p>This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.</p>
            
            <p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about personal information you disclose to us.</p>
            
            <p><strong>Do we process any sensitive personal information?</strong> Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.</p>
            
            <p><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>
            
            <p><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about how we process your information.</p>
            
            <p><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties. Learn more about when and with whom we share your personal information.</p>
            
            <p><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Learn more about how we keep your information safe.</p>
            
            <p><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about your privacy rights.</p>
            
            <p><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</p>
        </div>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

function loadDMCA() {
    document.getElementById('popupTitle').textContent = "DMCA";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <div class="dmca-content">
            <p>
                If you own or developed a game that is on <strong>gn-math</strong> 
                and would like it removed, please do one of the following:
            </p>
            <ol>
                <li>
                    <a href="https://discord.gg/D4c9VFYWyU" target="_blank" rel="noopener noreferrer">
                        Join the Discord
                    </a> and DM <strong>breadbb</strong> or ping me in a public channel 
                    <strong>[INSTANT RESPONSE]</strong>
                </li>
                <li>
                    Email me at 
                    <a href="mailto:gn.math.business@gmail.com">gn.math.business@gmail.com</a> 
                    with the subject starting with <code>!DMCA</code>.
                    <strong>[DELAYED RESPONSE]</strong>
                </li>
            </ol>
            <p>
                If you are going to do an email, please show proof you own the game before I have to ask.
            </p>
        </div>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

let _allStatsCache = null;

async function getAllStats() {
  if (_allStatsCache) {
    return _allStatsCache;
  }

  const BASE_URL =
    "https://data.jsdelivr.com/v1/stats/packages/gh/%67%6e%2d%6d%61%74%68/html@main/files";
  const PERIOD = "year";
  const PAGE_BATCH = 5;

  let page = 1;
  let done = false;
  const combinedMap = Object.create(null);

  while (!done) {
    const pages = Array.from({ length: PAGE_BATCH }, (_, i) => page + i);

    const responses = await Promise.all(
      pages.map(p =>
        fetch(`${BASE_URL}?period=${PERIOD}&page=${p}&limit=100`)
          .then(r => (r.ok ? r.json() : []))
      )
    );

    for (const data of responses) {
      if (!Array.isArray(data) || data.length === 0) {
        done = true;
        break;
      }

      for (const item of data) {
        if (!item?.name) continue;

        const match = item.name.match(/^\/(\d+)([.-])/);
        if (!match) continue;

        const id = match[1];

        if (!combinedMap[id]) {
          combinedMap[id] = {
            hits: 0,
            bandwidth: 0
          };
        }

        combinedMap[id].hits += item.hits?.total ?? 0;
        combinedMap[id].bandwidth += item.bandwidth?.total ?? 0;
      }
    }

    page += PAGE_BATCH;
  }

  _allStatsCache = combinedMap;
  return combinedMap;
}

async function getStats(id) {
  id = String(id);
  const allStats = await getAllStats();

  return allStats[id]?.hits ?? 0;
}

function showZoneInfo() {
    let id = Number(document.getElementById('zoneId').textContent);
    document.getElementById('popupTitle').textContent = "Info";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `<p>Loading...</p>`
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
    fetch(`https://api.github.com/repos/%67%6e%2d%6d%61%74%68/html/commits?path=${id}.html`).then(res => res.json()).then(async json => {
        let stats = await getStats (id);
        idjson = zones.filter(a=>a.id===id)[0]
        document.getElementById('popupTitle').textContent = `${idjson.name} Info`;
        const date = new Date(json.at(-1).commit.author.date);
        let formatteddate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
}).format(date);
        popupBody.innerHTML = `
        <p>
        <b>Id</b>: ${id}<br>
        <b>Name</b>: ${idjson.name}<br>
        ${idjson.author?`<b>Game Author</b>: ${idjson.author}<br>`:""}
        ${idjson.authorLink?`<b>Game Author Link</b>: <a style="color:#FFFF00;" href=${idjson.authorLink}>${idjson.authorLink}</a><br>`:""}
        ${idjson.special?`<b>Tags</b>: ${idjson.special}<br>`:""}
        <b>Gn-Math Adder</b>: ${json.at(-1).commit.author.name}<br>
        <b>Date Added</b>: ${formatteddate}<br>
        <b>Times Played (Globally)</b>: ${Number(stats).toLocaleString("en-US")}
        </p>`;
    })
}

function closePopup() {
    document.getElementById('popupOverlay').style.display = "none";
}
listZones();

HTMLCanvasElement.prototype.toDataURL = function (...args) {
    return "";

};

        // console

eStatus = false

function erudaToggle() {
    if (eStatus == true) {
        eStatus = false
        erudaDisable()
        localStorage.setItem('gn-math-eruda-status', false);
    } else {
        eStatus = true
        erudaEnable()
        localStorage.setItem('gn-math-eruda-status', true);
    }
}

function erudaEnable() {
    var script = document.createElement('script'); 
    script.src="https://cdn.jsdelivr.net/npm/eruda"; 
    document.body.append(script); 
    script.onload = function () { eruda.init(); };
}

function erudaDisable() {
    eruda.destroy();
}

// load console on startup

if (localStorage.getItem('gn-math-eruda-status') == 'true') {
    eStatus = true;
    erudaEnable();
} else {
    localStorage.setItem('gn-math-eruda-status', false);
}

// favorites


zoneFavorites = []
const favoriteZones = document.getElementById('favoriteZones');

function toggleFavorite(e = 'none', file) {
    
    const index = zoneFavorites.findIndex(z => z.name === file.name);
    let isFav = false
    if (index !== -1) {
        zoneFavorites.splice(index, 1);
    } else {
        zoneFavorites.push(file);
        isFav = true
    }

    const zoneStars = document.querySelectorAll(`[data-zone-name="${file.name}"]`);
    zoneStars.forEach(star => {
        if (isFav) {
            star.classList.add('starred');
        } else {
            star.classList.remove('starred');
        }
    });
    
    localStorage.setItem('gn-math-favorites', JSON.stringify(zoneFavorites))
    sendFavoriteZones()
}

function sendFavoriteZones() {
    favoriteZones.innerHTML = "";
    zoneFavorites.forEach((file, index) => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item";

        const favoriteButton = document.createElement("div");
        favoriteButton.className = 'favorite-button starred';
        favoriteButton.textContent = '★';
        favoriteButton.onclick = (event) => {
            event.stopPropagation()
            toggleFavorite(favoriteButton, file)
        };
        zoneItem.appendChild(favoriteButton);
        favoriteButton.setAttribute('data-zone-name', file.name);

        zoneItem.onclick = () => openZone(file);
        const img = document.createElement("img");
        img.dataset.src = file.cover.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        img.alt = file.name;
        img.loading = "lazy";
        img.className = "lazy-zone-img";
        zoneItem.appendChild(img);
        
        const button = document.createElement("button");
        button.textContent = file.name;
        button.onclick = (event) => {
            event.stopPropagation();
            openZone(file);
        };

        zoneItem.appendChild(button);
        favoriteZones.appendChild(zoneItem);   
    });

    if (favoriteZones.innerHTML === "") {
        favoriteZones.innerHTML = "No favorite zones.";
    }

    const lazyImages = document.querySelectorAll('img.lazy-zone-img');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !zoneViewer.hidden) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy-zone-img");
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: "100px", 
        threshold: 0.1
    });

    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
}

// load favorites on startup
function startupFavorites() {
   const stored = localStorage.getItem('gn-math-favorites');
    if (stored) {
        try {
            zoneFavorites = JSON.parse(stored);
            if (!Array.isArray(zoneFavorites)) zoneFavorites = [];
        } catch (e) {
            zoneFavorites = [];
        }
    }
    sendFavoriteZones()
}

