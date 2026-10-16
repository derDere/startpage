const months = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Oct','Nov','Dez'];

let config = null;
let configText = '';
let commands = [];

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
