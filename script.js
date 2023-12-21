const excludeParts = 'minutely,daily,alerts';
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
    let moreCount = 0;
    const moreMax = 8 * 16;
    for(let [url, title, icon] of contentData.more) {
        if (url.length <= 0) {
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
    }

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

    axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=${excludeParts}&appid=${apiKey}&units=metric`).then(
        r => {
            { // Set Current
                let {icon, description} = r.data.current.weather[0];
                let imgUrl = `http://openweathermap.org/img/wn/${icon}@2x.png`;
                let img = document.getElementById('main-weather-img');
                let text = document.getElementById('current-weather');
                img.src = imgUrl;
                text.innerText = description + ' ' + Math.round(r.data.current.temp,0) + '°';
            }

            { // Set Hours
                let smallWeatherRow = document.getElementById('small-weather-row');
                for(let i = 1; i < 8; i++) {
                    let itm = r.data.hourly[i];
                    let time = new Date();
                    let timeHours = time.getHours();
                    timeHours += i;
                    time.setHours(timeHours);
    
                    let {icon, description} = itm.weather[0];
                    let imgUrl = `http://openweathermap.org/img/wn/${icon}@2x.png`;
                    
                    let img = document.createElement('img');
                    img.alt = '';
                    img.title = ((time.getHours()<10)?('0'+time.getHours()):time.getHours()) + ':00 ' + description + ' ' + Math.round(itm.temp,0) + '°';
                    img.className = 'weather-img-small';
                    img.src = imgUrl;
    
                    let text3 = document.createElement('div');
                    text3.className = "small-weather-time";
                    text3.innerHTML = Math.round(itm.temp,0) + '&deg;';
    
                    let hourItm = document.createElement("div");
                    hourItm.className = "weather-hourly-item";
                    hourItm.appendChild(img);
                    hourItm.appendChild(text3);
    
                    smallWeatherRow.appendChild(hourItm);
                }
            }
        }
    );

}