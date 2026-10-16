const months = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Oct','Nov','Dez'];

let config = null;
let configText = '';
let commands = [];
const defaultTitle = document.title;
let tabIconVersion = 0;
// Hausfarbe = Farbe des Standard-Favicons; ohne gewählte Farbe erscheinen alle Tab-Icons darin.
const HOUSE_COLOR = '#717171';

window.addEventListener("wheel", event => {
    var page = document.getElementById('page1');
    if (event.deltaY < 0) {
        if (page.classList.contains('page-out')) {
            page.classList.remove('page-out');
            page.classList.add('page-in');
        }
    } else {
        page.classList.remove('page-in');
        page.classList.add('page-out');
    }
});

function pageLoaded() {

    updateDateTime();
    setInterval(updateDateTime, 1000);

    loadConfig();
    setInterval(loadConfig, 1000);

    document.getElementById('error-overlay').addEventListener('click', hideError);

    document.getElementById('settings-button').addEventListener('click', () => {
        fetch('open-settings', { method: 'POST' });
    });

    applyTabIdentity();
    window.addEventListener('hashchange', applyTabIdentity);
    let titleInput = document.getElementById('tab-title-input');
    titleInput.addEventListener('input', () => {
        let value = titleInput.value.trim();
        setTabIdentity('title', value === defaultTitle ? '' : value);
    });
    titleInput.addEventListener('blur', applyTabIdentity);
    // Der erste Klick ins Feld markiert den ganzen Titel, weitere Klicks setzen den Cursor wie gewohnt.
    titleInput.addEventListener('mousedown', event => {
        if (document.activeElement === titleInput) return;
        event.preventDefault();
        titleInput.focus();
        titleInput.select();
    });
    document.getElementById('tab-icon-button').addEventListener('click', event => {
        event.stopPropagation();
        toggleIconPicker();
    });
    document.getElementById('tab-color-button').addEventListener('click', event => {
        event.stopPropagation();
        toggleColorPicker();
    });
    setupColorPicker();
    document.addEventListener('click', event => {
        for (let dropdown of document.querySelectorAll('.tab-dropdown')) {
            if (!dropdown.contains(event.target)) dropdown.hidden = true;
        }
    });

    var commandInput = document.getElementById('cmd-input');

    commandInput.addEventListener('keydown', event => {
        console.log('Key pressed: ' + event.key);
        if (event.key === 'Enter') {
            console.log('Enter key detected, processing command: ' + commandInput.value);
            let value = commandInput.value.trim();
            let matched = false;
            for(let command of commands) {
                console.log('Trying pattern: ' + command.pattern + ' against value: ' + value);
                let match = value.match(command.regex);
                console.log('Match result: ' + match);
                if (match) {
                    try {
                        command.run(match);
                    } catch (err) {
                        showError(`Command "${command.pattern}" failed`, err.stack ?? String(err));
                    }
                    matched = true;
                    break;
                }
            }
            if (matched) {
                commandInput.value = '';
            }
        }
    });

    var searchInput = document.getElementById('search-input');

    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            let value = searchInput.value.trim();
            if (value.length > 0) {
                let searchUrl = config.general.search_engine.replace('%s', encodeURIComponent(value));
                window.location = searchUrl;
            }
        }
    });

    // Auto focus command input
    setTimeout(() => {
        commandInput.value = '';
        commandInput.focus();
    }, 100);
}

// Die Settings-App schreibt config.json; jede Änderung wird ohne Reload neu gezeichnet.
function loadConfig() {
    fetch('config.json', { cache: 'no-store' })
        .then(r => r.text())
        .then(text => {
            if (text === configText) return;
            let newConfig = JSON.parse(text);
            let oldGeneral = config?.general;
            config = newConfig;
            configText = text;

            compileCommands();
            renderFavorites();
            renderLinkList('tools-container', config.tools);
            renderLinkList('books-container', config.books);
            renderMore();
            updateDateTime();

            let general = config.general;
            if (!oldGeneral || oldGeneral.api_key !== general.api_key
                || oldGeneral.latitude !== general.latitude || oldGeneral.longitude !== general.longitude) {
                loadWeather();
            }
        })
        .catch(err => console.error('Config error:', err));
}

// Fehlerhafte Commands (Regex oder JS) werden übersprungen und wie bei einem Dev-Server als Overlay gemeldet.
function compileCommands() {
    commands = [];
    let errors = [];
    for(let command of config.commands) {
        if (!command.pattern) continue;
        try {
            commands.push({
                pattern: command.pattern,
                regex: new RegExp(command.pattern, 'im'),
                run: new Function('match', command.code)
            });
        } catch (err) {
            errors.push(`${command.pattern}\n    ${err}`);
        }
    }
    if (errors.length > 0) {
        showError('Command error', errors.join('\n\n'));
    } else {
        hideError();
    }
}

function showError(title, message) {
    document.getElementById('error-title').innerText = title;
    document.getElementById('error-text').innerText = message;
    document.getElementById('error-overlay').hidden = false;
}

function hideError() {
    document.getElementById('error-overlay').hidden = true;
}

// Titel, Icon und Icon-Farbe des Tabs stehen im Anker (#title=…&icon=…&color=…), damit ein Tab oder Lesezeichen sie behält.
function applyTabIdentity() {
    let params = new URLSearchParams(location.hash.slice(1));
    let title = params.get('title') ?? '';
    let icon = params.get('icon') ?? '';
    let color = params.get('color') ?? '';
    let iconUrl = icon ? `gfx/icons/${icon}` : 'gfx/favicon.png';
    document.title = title || defaultTitle;
    // Das Feld zeigt immer den echten Titel; während der Eingabe bleibt es unangetastet.
    let input = document.getElementById('tab-title-input');
    if (document.activeElement !== input) input.value = document.title;
    let iconColor = color ? '#' + color : HOUSE_COLOR;
    document.getElementById('tab-color-icon').style.backgroundColor = iconColor;
    document.getElementById('tab-color-button').classList.toggle('unset', !color);

    let version = ++tabIconVersion;
    tintedIcon(iconUrl, iconColor).then(url => {
        // Bei schnellen Änderungen gewinnt nur die zuletzt angeforderte Variante.
        if (version !== tabIconVersion) return;
        document.getElementById('favicon').href = url;
        document.getElementById('tab-icon-button').src = url;
    });
}

// Färbt ein Icon auf einem Canvas ein, wie die CSS-Maske der Links: Form des Icons, Farbe der Auswahl.
function tintedIcon(url, color) {
    return new Promise(resolve => {
        let img = new Image();
        img.onload = () => {
            let canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            let context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, 64, 64);
            context.globalCompositeOperation = 'source-in';
            context.fillStyle = color;
            context.fillRect(0, 0, 64, 64);
            resolve(canvas.toDataURL());
        };
        img.onerror = () => resolve(url);
        img.src = url;
    });
}

function setTabIdentity(key, value) {
    let params = new URLSearchParams(location.hash.slice(1));
    if (value) {
        params.set(key, value);
    } else {
        params.delete(key);
    }
    history.replaceState(null, '', params.size > 0 ? '#' + params : location.pathname);
    applyTabIdentity();
}

// Farbe des Tab-Icons als #rrggbb, leer für "keine Farbe".
function tabColor() {
    let color = new URLSearchParams(location.hash.slice(1)).get('color');
    return color ? '#' + color : '';
}

function toggleIconPicker() {
    let picker = document.getElementById('tab-icon-picker');
    document.getElementById('tab-color-picker').hidden = true;
    if (!picker.hidden) {
        picker.hidden = true;
        return;
    }
    fetch('icons').then(r => r.json()).then(icons => {
        picker.replaceChildren();
        // Der leere Eintrag steht für das Standard-Favicon; alle Einträge zeigen die gewählte Farbe.
        for (let icon of ['', ...icons]) {
            let item = document.createElement('span');
            item.title = icon ? icon.replace(/\.[^.]+$/, '') : 'default';
            let img = document.createElement('img');
            setIcon(img, icon ? `gfx/icons/${icon}` : 'gfx/favicon.png', tabColor() || HOUSE_COLOR);
            item.appendChild(img);
            item.addEventListener('click', () => {
                setTabIdentity('icon', icon);
                picker.hidden = true;
            });
            picker.appendChild(item);
        }
        picker.hidden = false;
    });
}

// Eigener Farbwähler: Feld für Sättigung/Helligkeit, Farbton-Leiste, Vorgaben und Hex-Feld.
// Jede Änderung färbt das Tab-Icon sofort, damit man das Ergebnis während der Auswahl sieht.
const colorPresets = ['', '#ffffff', '#888888', '#e5484d', '#f48024', '#f8d64e', '#46c26f', '#3bb3e0', '#5865f2', '#a371f7', '#ff5fa2', '#a2c0ce'];
let pickerHsv = { h: 0, s: 0, v: 1 };

function setupColorPicker() {
    let swatches = document.getElementById('color-swatches');
    for (let preset of colorPresets) {
        let swatch = document.createElement('span');
        swatch.title = preset || 'no color';
        if (preset) {
            swatch.style.backgroundColor = preset;
        } else {
            swatch.className = 'no-color';
        }
        swatch.addEventListener('click', () => setPickerColor(preset));
        swatches.appendChild(swatch);
    }

    // Beim Ziehen bleibt der Farbton im HSV-Zustand erhalten, auch wenn Sättigung oder Helligkeit 0 erreichen.
    dragOn(document.getElementById('color-sv'), (x, y) => {
        pickerHsv.s = x;
        pickerHsv.v = 1 - y;
        setPickerColor(hsvToHex(pickerHsv), true);
    });
    dragOn(document.getElementById('color-hue'), x => {
        pickerHsv.h = x * 360;
        setPickerColor(hsvToHex(pickerHsv), true);
    });

    let hexInput = document.getElementById('color-hex');
    hexInput.addEventListener('input', () => {
        let value = '#' + hexInput.value.trim().replace(/^#/, '').toLowerCase();
        if (/^#[0-9a-f]{6}$/.test(value)) setPickerColor(value);
    });
}

function toggleColorPicker() {
    let picker = document.getElementById('tab-color-picker');
    document.getElementById('tab-icon-picker').hidden = true;
    if (picker.hidden) {
        let color = tabColor();
        pickerHsv = color ? hexToHsv(color) : { h: 0, s: 0, v: 1 };
        updateColorPicker();
    }
    picker.hidden = !picker.hidden;
}

function setPickerColor(color, keepHsv = false) {
    if (color && !keepHsv) pickerHsv = hexToHsv(color);
    setTabIdentity('color', color.slice(1));
    updateColorPicker();
}

function updateColorPicker() {
    let { h, s, v } = pickerHsv;
    document.getElementById('color-sv').style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    let svCursor = document.getElementById('color-sv-cursor');
    svCursor.style.left = `${s * 100}%`;
    svCursor.style.top = `${(1 - v) * 100}%`;
    document.getElementById('color-hue-cursor').style.left = `${h / 360 * 100}%`;
    let hexInput = document.getElementById('color-hex');
    if (document.activeElement !== hexInput) hexInput.value = tabColor();
}

// Ruft onMove mit der relativen Zeigerposition (0..1) auf, solange auf dem Element gezogen wird.
function dragOn(element, onMove) {
    element.addEventListener('pointerdown', event => {
        let move = moveEvent => {
            let rect = element.getBoundingClientRect();
            let clamp = value => Math.min(1, Math.max(0, value));
            onMove(clamp((moveEvent.clientX - rect.left) / rect.width), clamp((moveEvent.clientY - rect.top) / rect.height));
        };
        element.setPointerCapture(event.pointerId);
        element.onpointermove = move;
        element.onpointerup = () => element.onpointermove = null;
        move(event);
    });
}

function hsvToHex({ h, s, v }) {
    let channel = n => {
        let k = (n + h / 60) % 6;
        return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return '#' + [channel(5), channel(3), channel(1)].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}

function hexToHsv(hex) {
    let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    let max = Math.max(r, g, b);
    let delta = max - Math.min(r, g, b);
    let h = 0;
    if (delta > 0) {
        if (max === r) {
            h = ((g - b) / delta + 6) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
    }
    return { h: h * 60, s: max === 0 ? 0 : delta / max, v: max };
}

function linkTarget() {
    return config.general.open_in_new_tab ? '_blank' : '_self';
}

// Eine gesetzte Farbe färbt das Icon per CSS-Maske ein: das Bild wird zur Maske, die Hintergrundfarbe füllt sie.
function setIcon(img, src, color) {
    if (color) {
        img.src = 'gfx/empty.gif';
        img.className = 'tinted';
        img.style.backgroundColor = color;
        img.style.maskImage = `url("${src}")`;
    } else {
        img.src = src;
    }
}

function renderFavorites() {
    let favoritesDiv = document.getElementById('favorits-container');
    favoritesDiv.replaceChildren();

    // Leere Plätze bis zum letzten belegten bleiben als unsichtbare Kachel stehen, damit die Positionen zum Settings-Fenster passen.
    let lastIndex = config.favorites.findLastIndex(fav => fav);
    for(let fav of config.favorites.slice(0, lastIndex + 1)) {
        let a = document.createElement('a');
        if (!fav) {
            a.className = 'empty';
            favoritesDiv.appendChild(a);
            continue;
        }
        let urlMatches = fav.url.match(/^(https?:\/\/)([\w.]+)(\/)/gis);
        a.title = fav.title;
        a.href = fav.url;
        a.target = linkTarget();
        let img = document.createElement('img');
        img.alt = fav.title;
        if (fav.icon) {
            setIcon(img, `gfx/icons/${fav.icon}`, fav.color);
        } else if (urlMatches?.length > 0) {
            img.src = `${urlMatches[0]}favicon.ico`;
        } else {
            img.src = 'gfx/link.svg';
        }
        a.appendChild(img);
        favoritesDiv.appendChild(a);
    }
}

function renderLinkList(containerId, links) {
    let listDiv = document.getElementById(containerId);
    listDiv.querySelectorAll('a').forEach(a => a.remove());
    for(let link of links) {
        if (!link) continue;
        let a = document.createElement('a');
        a.innerText = link.title;
        a.href = link.url;
        a.target = linkTarget();
        listDiv.appendChild(a);
    }
}

function renderMore() {
    let moreDiv = document.getElementById('page2');
    moreDiv.replaceChildren();
    let moreCols = config.more.map[0]?.length | 0;

    for(let i = 0; i < moreCols; i++) {
        let colDiv = document.createElement('div');
        colDiv.className = 'more-col';
        moreDiv.appendChild(colDiv);

        for(let y = 0; y < config.more.map.length; y++) {
            let key = (config.more.map[y][i]) + '';
            key = key.trim();
            if (key == '0') {
                let span = document.createElement('span');
                span.className = 'more empty';
                colDiv.appendChild(span);
            }
            else if (key in config.more.links) {
                let {url, title, icon, color} = config.more.links[key];

                if (url.length <= 0) {
                    let span = document.createElement('span');
                    span.className = 'more title';

                    let text = document.createElement('span');
                    text.innerText = title;
                    span.appendChild(text);

                    colDiv.appendChild(span);

                } else {
                    if (!title) title = url;

                    let a = document.createElement('a');
                    a.href = url;
                    a.target = linkTarget();
                    a.className = 'more';

                    let img = document.createElement('img');
                    setIcon(img, icon ? `gfx/icons/${icon}` : 'gfx/link.svg', color);
                    a.appendChild(img);

                    let text = document.createElement('span');
                    text.innerText = title;
                    a.appendChild(text);

                    colDiv.appendChild(a);
                }
            }
        }
    }
}

function updateDateTime() {
    let clockEle = document.getElementById('clock');
    let dateEle = document.getElementById('date');
    let greetingEle = document.getElementById('greeting');
    let time = new Date();
    clockEle.innerText = time.toTimeString().substr(0,5);
    dateEle.innerText = months[time.getMonth()] + ' ' + time.getDate();
    let name = config?.general.user_name ?? '';
    let greeting = "Good morning, ";
    if (time.getHours() >= 11) greeting = "Good day, ";
    if (time.getHours() >= 14) greeting = "Good afternoon, ";
    if (time.getHours() >= 17) greeting = "Good evening, ";
    greetingEle.innerText = greeting + name;
}

function loadWeather() {
    let { api_key: apiKey, latitude: lat, longitude: lon } = config.general;
    let currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    let forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=8`;

    // Set Current Weather
    axios.get(currentUrl).then(r => {
        let {icon, description} = r.data.weather[0];
        let imgUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        let img = document.getElementById('main-weather-img');
        let text = document.getElementById('current-weather');
        img.src = imgUrl;
        text.innerText = description + ' ' + Math.round(r.data.main.temp) + '°';
    }).catch(err => {
        console.error('Current weather API error:', err);
        let text = document.getElementById('current-weather');
        text.innerText = 'Weather unavailable';
    });

    // Set Forecast (3-hour intervals)
    axios.get(forecastUrl).then(r => {
        let smallWeatherRow = document.getElementById('small-weather-row');
        smallWeatherRow.replaceChildren();
        for(let i = 0; i < r.data.list.length; i++) {
            let itm = r.data.list[i];
            let time = new Date(itm.dt * 1000);

            let {icon, description} = itm.weather[0];
            let imgUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

            let img = document.createElement('img');
            img.alt = '';
            img.title = ((time.getHours()<10)?('0'+time.getHours()):time.getHours()) + ':00 ' + description + ' ' + Math.round(itm.main.temp) + '°';
            img.className = 'weather-img-small';
            img.src = imgUrl;

            let text3 = document.createElement('div');
            text3.className = "small-weather-time";
            text3.innerHTML = Math.round(itm.main.temp) + '&deg;';

            let hourItm = document.createElement("div");
            hourItm.className = "weather-hourly-item";
            hourItm.appendChild(img);
            hourItm.appendChild(text3);

            smallWeatherRow.appendChild(hourItm);
        }
    }).catch(err => {
        console.error('Forecast API error:', err);
    });
}
