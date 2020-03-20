const config = {
    url: [
        'https://2gis.ru/ufa/search/%D0%A6%D0%B2%D0%B5%D1%82%D1%8B/rubricId/389',
        'https://2gis.ru/ufa/search/%D0%94%D0%BE%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%20(%D0%B7%D0%B0%D0%BA%D0%B0%D0%B7)%20%D1%86%D0%B2%D0%B5%D1%82%D0%BE%D0%B2/rubricId/22159',
    ],
    category: 'Спецмагазины',
    start: {
        full: {
            skip: true,
            file: '',
        },
        min: {
            skip: true,
            file: '',
        },
        diff: {
            skip: true,
            file: 'gis-05-02-2020_17-23-49-FULL',
        },
        ext: {
            skip: true,
        }
    },
    limits: {
        from: null,
        to: null,
        count: null,
    },
    getting: {
        sites: true,
        phones: true,
        address: true,
        mails: true,
        social: true,
        category: true,
    },
    filters: {
        withSite: true,
        withPhoto: false,
        withCard: false,
        manufactures: false,
        onlineStore: false,
        wholesale: false,
    },
    waitFor: 100,
    view: true,
};

const moment = require('moment');
const file = require('./modules/files');
const scraper = require('./modules/scraper');

(async () => {

    let date = `gis-${moment().format('DD-MM-YYYY_HH-mm-ss')}`;
    let fullData = config.start.full.skip ? await file.read(config.start.full.file) : {},
        minData = config.start.min.skip ? await file.read(config.start.min.file) : {},
        diffData = config.start.diff.skip ? await file.read(config.start.diff.file) : {},
        extData = {};

    //await scraper.initializate(config);

    if(!config.start.full.skip) {
        fullData = await scraper.parse({});
        await file.write(`${date}-FULL`, fullData);
    }

    if(!config.start.min.skip) {
        minData = await scraper.parse({filters: true});
        await file.write(`${date}-MIN`, minData);
    }

    if(!config.start.diff.skip) {
        diffData = await scraper.diff(fullData, minData);
        await file.write(`${date}-DIFF`, diffData);
    }

    if(!config.start.ext.skip) {
        extData = await scraper.parse({extendet: true, filters: false, data: diffData});
        await file.write(`${date}-EXT`, extData);
        await file.excel(`${date}`, {data: extData, getting: config.getting});
    }
    
    await file.excel(`${date}`, {data: await scraper.merger([
        'gis-04-02-2020_12-23-21-EXT', 
        'gis-04-02-2020_12-53-08-EXT', 
        'gis-04-02-2020_13-58-58-EXT', 
        'gis-04-02-2020_14-57-24-EXT',
        'gis-04-02-2020_18-17-31-EXT',
        'gis-04-02-2020_18-46-29-EXT',
        'gis-04-02-2020_22-19-15-EXT',
        'gis-05-02-2020_17-25-54-EXT'
    ]), getting: config.getting});

    //await scraper.close();

    console.log('Парсин завершен!');

})();