const excludeParts = 'minutely,daily,alerts';
const months = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Oct','Nov','Dez'];

function pageLoaded() {

    let [ lat, lon ] = document.getLocation();
    let apiKey = document.getApiKey();
    let contentData = document.getContentData();

    let favoritesDiv = document.getElementById('favorits-container');
    for(let fav of contentData.favorites) {
        let a = document.createElement('a');
        a.title = fav.title;
        a.href = fav.url;
        let img = document.createElement('img');
        img.alt = fav.alt;
        img.src = `gfx/icons/${fav.icon}`;
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

    axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=${excludeParts}&appid=${apiKey}`).then(
        r => {
            { // Set Current
                let {icon, description} = r.data.current.weather[0];
                let imgUrl = `http://openweathermap.org/img/wn/${icon}@2x.png`;
                let img = document.getElementById('main-weather-img');
                let text = document.getElementById('current-weather');
                img.src = imgUrl;
                text.innerText = description;
            }

            { // Set Hours
                let tableRow = document.getElementById('small-weather-row');
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
                    img.title = description;
                    img.className = 'weather-img-small';
                    img.src = imgUrl;
    
                    let text2 = document.createElement('div');
                    text2.className = "small-weather-time";
                    text2.innerText = (time.getHours()<10)?('0'+time.getHours()):time.getHours();
    
                    let td = document.createElement("td");
                    td.align="center";
                    td.appendChild(img);
                    td.appendChild(text2);
    
                    tableRow.appendChild(td);
                }
            }
        }
    );

}