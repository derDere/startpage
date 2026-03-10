const months = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Oct','Nov','Dez'];

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

    let [ lat, lon ] = document.getLocation();
    let apiKey = document.getApiKey();
    let contentData = document.getContentData();

    let favoritesDiv = document.getElementById('favorits-container');
    for(let fav of contentData.favorites) {
        let urlMatches = fav.url.match(/^(https?:\/\/)([\w.]+)(\/)/gis);
        let a = document.createElement('a');
        a.title = fav.title;
        a.href = fav.url;
        let img = document.createElement('img');
        img.alt = fav.alt;
        if (fav.icon) {
            img.src = `gfx/icons/${fav.icon}`;
        } else if (urlMatches.length > 0) {
            img.src = `${urlMatches[0]}favicon.ico`;
        } else {
            img.src = 'gfx/link.svg';
        }
        a.appendChild(img);
        favoritesDiv.appendChild(a);
    }
    
    let toolsDiv = document.getElementById('tools-container');
    for(let [title, url] of contentData.tools) {
        let a = document.createElement('a');
        a.innerText = title;
        a.href = url;
        toolsDiv.appendChild(a);
    }

    let booksDiv = document.getElementById('books-container');
    for(let [title, url] of contentData.books) {
        let a = document.createElement('a');
        a.innerText = title;
        a.href = url;
        booksDiv.appendChild(a);
    }

    let moreDiv = document.getElementById('page2');
    let moreCols = contentData.more.map[0]?.length | 0;

    console.log('moreCols: ' + moreCols);

    for(let i = 0; i < moreCols; i++) {
        let colDiv = document.createElement('div');
        colDiv.className = 'more-col';
        colDiv.innterText = 'I: ' + i;
        moreDiv.appendChild(colDiv);

        for(let y = 0; y < contentData.more.map.length; y++) {
            let key = (contentData.more.map[y][i]) + '';
            key = key.trim();
            if (key == '0') {
                let span = document.createElement('span');
                span.className = 'more empty';
                colDiv.appendChild(span);
            }
            else if (key in contentData.more.links) {
                let [url, title, icon] = contentData.more.links[key];

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
                    img.src = icon?`gfx/icons/${icon}`:'gfx/link.svg';
                    a.appendChild(img);
                    
                    let text = document.createElement('span');
                    text.innerText = title;
                    a.appendChild(text);

                    colDiv.appendChild(a);
                }
            }
        }
    }

    /*
    let moreCount = 0;
    const moreMax = 8 * 16;
    for(let [url, title, icon] of contentData.more) {
        if ((!url && !title && !icon) || (typeof url == 'number')) {
            let count = 1;
            if (typeof url == 'number') {
                count = url;
            }
            if (count <= 0) {
                count = 1;
            }
            for(let i = 0; i < count; i++) {
                let span = document.createElement('span');
                span.className = 'more empty';
                moreDiv.appendChild(span);
            }
        }
        else if (url.length <= 0) {
            let span = document.createElement('span');
            span.className = 'more title';

            let text = document.createElement('span');
            text.innerText = title;
            span.appendChild(text);

            moreDiv.appendChild(span);

        } else {            
            if (!title) title = url;

            let a = document.createElement('a');
            a.href = url;
            a.className = 'more';

            let img = document.createElement('img');
            img.src = icon?`gfx/icons/${icon}`:'gfx/link.svg';
            a.appendChild(img);
            
            let text = document.createElement('span');
            text.innerText = title;
            a.appendChild(text);

            moreDiv.appendChild(a);
        }

        moreCount += 1;
        if (moreCount == moreMax) break;
    }*/

    var UpdateDateTime = () => {
        let clockEle = document.getElementById('clock');
        let dateEle = document.getElementById('date');
        let greetingEle = document.getElementById('greeting');
        let time = new Date();
        clockEle.innerText = time.toTimeString().substr(0,5);
        dateEle.innerText = months[time.getMonth()] + ' ' + time.getDate();
        let name = document.getUserName();
        let greeting = "Good morning, ";
        if (time.getHours() >= 11) greeting = "Good day, ";
        if (time.getHours() >= 14) greeting = "Good afternoon, ";
        if (time.getHours() >= 17) greeting = "Good evening, ";
        greetingEle.innerText = greeting + name;
    };
    UpdateDateTime();
    setInterval(UpdateDateTime, 1000);

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

    var commandInput = document.getElementById('cmd-input');

    commandInput.addEventListener('keydown', event => {
        console.log('Key pressed: ' + event.key);
        if (event.key === 'Enter') {
            console.log('Enter key detected, processing command: ' + commandInput.value);
            let value = commandInput.value.trim();
            let commands = document.getCommands();
            let matched = false;
            for(let pattern in commands) {
                let regex = new RegExp(pattern, 'im');
                console.log('Trying pattern: ' + pattern + ' against value: ' + value);
                let match = value.match(regex);
                console.log('Match result: ' + match);
                if (match) {
                    commands[pattern](match);
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
                let searchUrl = document.getSearchEngine(value);
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