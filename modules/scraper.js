const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const file = require('./files');
const selectors = require('./selectors');

const tempData = {
    usedNames: [],
    parsed: [],
};

const settings = {
    browser: null,
    page: null,
    config: [],
};

const options = {
    blacklist: [ /.*yandex*./, /.*\.css*./, /.*\.woff2*./, /.*\.jpg*./, /.*\.jpeg*./, /.*\.png*./, /.*\.svg*./ ],
    transform: body => cheerio.load(body),
};

const getUrl = (mode, url, parameters) => {
    if(mode == 'list') {
        let filters = [];
        for (key in parameters.filters) {
            let needToPush = '';
            if(!parameters.filters[key])
                continue;
            switch (key) {
                case 'withSite': needToPush = 'has_site'; break;
                case 'withPhoto': needToPush = 'has_photo'; break;
                case 'manufactures': needToPush = 'type_of_business_type_manufacturing'; break;
                case 'withCard': needToPush = 'general_payment_type_card'; break;
                case 'onlineStore': needToPush = 'type_of_business_type_online_store'; break;
                case 'wholesale': needToPush = 'type_of_business_type_wholesale'; break;
            }
            filters.push(needToPush);
        }
        if(filters.length > 0) {
            url += "/filters/" + filters.join(";");
        }
    } else if(mode == 'firm') {
        url += `/firm/${parameters.id}/`;
    }
    return url;
};

const writeFileInterceptor = blacklist => e => {
    if (blacklist.find(item => item.test(e.url())) != undefined) {
        e.abort();
    } else {
        e.continue();
    }
};

const initializate = (config) => new Promise(async (resolve, _) => {
    console.log('Браузер поднимается..');
    settings.config = config;
    const browser = await puppeteer.launch({
        headless: (settings.config.view) ? false : true,
        ignoreHTTPSErrors: true,
    }); 
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", writeFileInterceptor(options.blacklist));
    settings.browser = browser;
    settings.page = page;
    console.log('Браузер поднялся!');
    resolve(true);
});

const parse = ($, mode, category = {}) => new Promise((resolve, _) => {
    if (mode == 'list') {
        let list = $(selectors.list.all);
        if(list.length == 0) {
            resolve(true);
        }
        for (let i = 0; i < list.length; ++i) {
            let firm = list.eq(i).find(selectors.list.head),
                name = firm.children("a").text();
            if(firm.length == 0 || tempData.usedNames.includes(name)) {
                continue;
            }
            tempData.parsed.push({
                id: firm.children("a").attr("href").match(/[a-zA-Z\/]([0-9]+)\/?/)[1],
                name: firm.children("a").text(),
                category: category.main,
                underCategory: category.under,
                payload: {},
            });
            tempData.usedNames.push(name);
        }
        resolve(true);
    } else if(mode == 'firm') {
        let payload = {
            site: [],
            phone: [],
            address: [],
            mail: [],
            social: [],
        };
        let site = $(selectors.site),
            phone = $(selectors.phone.value),
            address = $(selectors.address),
            mail = $(selectors.email),
            social = $(selectors.social);
        if(site.length > 0) {
            for (let i = 0; i < site.length; ++i) {
                payload.site.push(site.eq(i).text());
            }
        }
        if(phone.length > 0) {
            for (let i = 0; i < phone.length; ++i) {
                payload.phone.push(phone.eq(i).text());
            }
        }
        if(address.length > 0) {
            let addressArr = [];
            for (let i = 0; i < address.length; ++i) {
                addressArr.push(address.eq(i).text());
            }
            payload.address.push(addressArr.join(' '));
        }
        if(mail.length > 0) {
            for (let i = 0; i < mail.length; ++i) {
                payload.mail.push(mail.eq(i).text());
            }
        }
        if(social.length > 0) {
            for (let i = 0; i < social.length; ++i) {
                payload.social.push({
                    val: social.eq(i).attr("aria-label"),
                    url: social.eq(i).attr("href"),
                });
            }
        }
        resolve(payload);
    }
});

const scraper = (parameters) => new Promise( async (resolve, _) => {
    tempData.parsed = [];
    if(parameters.extendet) {
        let leng = parameters.data.length;
        tempData.parsed = parameters.data;
        for (let i = 0; i < leng; ++i) {
            console.log(`${i + 1} / ${leng} в процессе..`);
            let url = getUrl('firm', 'https://2gis.ru/', { filters: {}, id: tempData.parsed[i]['id'] });
            await settings.page.goto(url);
            if((await settings.page.$$(selectors.phone.show)).length > 0) {
                await settings.page.evaluate((selectors) => {
                    document.querySelector(selectors.phone.show).click();
                }, selectors);
                await settings.page.waitFor(settings.config.waitFor);
            }
            let content = await settings.page.content(),
                $ = options.transform(content);
            tempData.parsed[i].payload = await parse($, 'firm');
            console.log(tempData.parsed[i].payload);
        }
    } else {
        for (let i = 0; i < settings.config.url.length; ++i) {
            let url = getUrl('list', settings.config.url[i], { filters: parameters.filters ? settings.config.filters: {} });
            let underCategoryName = '';
            await settings.page.goto(url);
            if(settings.config.getting.category && (await settings.page.$$('input._19g3ektk')).length > 0) {
                 underCategoryName = await settings.page.evaluate(() => {
                    const input = document.querySelector("input._19g3ektk");
                    return input.value;
                });
            }
            while ((await settings.page.$$(selectors.pages.empty)).length == 0) {
                let content = await settings.page.content(),
                    $ = options.transform(content);
                await parse($, 'list', {under: underCategoryName, main: settings.config.category});
                if((await settings.page.$$(selectors.pages.checker)).length > 0) {
                    await settings.page.evaluate(selectors => {
                        let elements = document.querySelectorAll(selectors.pages.navigation),
                            elementIsActive = document.querySelector(selectors.pages.isActive);
                        for (let j = 0; j < elements.length; ++j) {
                            if(+(elements[j].textContent) > +(elementIsActive.textContent)) {
                                elements[j].click();
                                break;
                            }
                        }
                    }, selectors);
                } else {
                    break;
                }
                await settings.page.waitFor(1000);
            }
        }
    }
    console.log('Стадия парсинга завершена!');
    resolve(tempData.parsed);
});

const close = () => settings.browser.close();

const merger = (arrayOfFiles) => new Promise(async (resolve, _) => {
    let bigData = [];
    for (let i = 0; i < arrayOfFiles.length; ++i) {
        let minData = await file.read(arrayOfFiles[i]);
        bigData = [...bigData, ...minData];
    }
    resolve(bigData);
});

const diff = (full, min) => new Promise((resolve, _) => {
    let newArr = [];
    for (let i = 0; i < full.length; ++i) {
        let exists = false;
        for (let j = 0; j < min.length; ++j) {
            if(min[j].id == full[i].id) {
                exists = true;
                break;
            }
        }
        if(!exists) {
            newArr.push(full[i]);
        }
    }
    resolve(newArr);
});

module.exports = {
    initializate: initializate,
    parse: scraper,
    diff: diff,
    close: close,
    merger: merger  
};
