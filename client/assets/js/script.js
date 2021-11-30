// #######################################################
// Rotinas para tratamento de URL
// #######################################################

const getUrl = (pathUrl) => `${window.location.origin}/${pathUrl}`;

const getUrlParameter = (parameter) => {
    const params = new URLSearchParams(window.location.search);
    for (const param of params) {
        if (param[0] === parameter) {
            return param[1];
        }
    }
    return null;
}

const makeUrl = (path, origin) => {
    if (!path)
        path = "";

    path = path.trim();
    if (path[0] !== "/") 
        path = `/${path}`;
    
    if (!origin)
        origin = window.location.origin

    origin = origin.trim();
    if (origin[origin.length - 1] === "/")
        origin = origin.slice(0, origin.length - 1);
    return `${origin}${path}`;
};

// #######################################################
// Rotinas para chamadas HTTP 
// #######################################################

// HTTP GET 
async function sendGetRest(path, origin) {
    const url = makeUrl(path, origin);

    console.log(`Enviando transacao para o servidor: [GET] ${url}`);
    try {
        const response = await fetch(url);
        if (response.status !== 200)
            throw new Error(`${response.status} (${response.statusText})`);
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`${error}`);
        return {};
    }
}

// HTTP POST,PUT, etc.
function sendHttpRest(path, origin, method, data, callbackSuccess){
    const url = makeUrl(path, origin);

    $.ajax({
        url: `${url}`,
        type: method,
        data: JSON.stringify(data),
        processData: false,
        contentType: "application/json; charset=UTF-8",
        beforeSend : function(){
            console.log(`Enviando transacao para o servidor: [${method}] ${this.url}`);
        },
        success: function(data){
            console.log(`Dados retornado da transacao com o servidor: ${JSON.stringify(data)}`);
            if (callbackSuccess)
                callbackSuccess(data);
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log(`Ocorreu um erro na transacao com o servidor: ${this.url}`);
        }
    });
}

// #######################################################
// Funcoes auxiliares
// #######################################################

const pad = (n) => n < 10 ? '0' + n : n;
const getHM = (dateTime) => getHMS(dateTime, false);

function getHMS(dateTime, seconds = true){
    let strTime = `${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}`

    if (seconds)
        strTime += `:${pad(dateTime.getSeconds())}`

    return strTime;
}




