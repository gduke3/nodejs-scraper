const path = require('path');
const fs = require('fs');
const Excel = require('exceljs');
const appRoot = require('app-root-path');

const write = (name, data) => new Promise(async (resolve, reject) => {
    await new Promise((resolve_, _) => fs.exists(path.join(appRoot.path, 'data', 'temp', `${name}.json`), exists => {
        if (!exists) {
            fs.open(path.join(appRoot.path, 'data', 'temp', `${name}.json`), "w", err => {
                if (err) throw err;
                resolve_();
            });
        } else {
            resolve_();
        }
    }));
    await new Promise((resolve_, _) => fs.writeFile(path.join(appRoot.path, 'data', 'temp', `${name}.json`), JSON.stringify(data), "utf-8", err => {
        if (err) throw err;
        resolve_();
    }));
    resolve();
});

const read = (name) => new Promise((resolve, _) => fs.exists(path.join(appRoot.path, 'data', 'temp', `${name}.json`), exists => {
    if(exists) {
        fs.readFile(path.join(appRoot.path, 'data', 'temp', `${name}.json`), (err, data) => {
            if (err) throw err;
            resolve(JSON.parse(data));
        });
    } else {
        resolve({});
    }
}));

const excel = (name, parameters) => new Promise((resolve, _) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Parsed data");
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Название', key: 'name', width: 32, style: { font: { bold: true } } },
        { header: 'Телефон', key: 'phone', width: 25 },
        { header: 'Почта', key: 'mail', width: 25 },
        { header: 'Адрес', key: 'address', width: 15 },
        { header: 'Сайт', key: 'site', width: 10, style: { font: { color: { argb: '0000BBAA' } } } },
        { header: '2GIS', key: 'gis', width: 10 },
        { header: 'Рубрика', key: 'category', width: 15 }, 
        { header: 'Подрубрика', key: 'underCategory', width: 15 }
    ];
    console.log(parameters.data.length);
    for (let i = 0; i < parameters.data.length; ++i) {
        worksheet.addRow({
            id: i + 1,
            name: parameters.data[i].name,
            phone: parameters.data[i].payload.phone.join("\n"),
            mail: parameters.data[i].payload.mail.join("\n"),
            address: parameters.data[i].payload.address.join("\n"),
            site: (parameters.data[i].payload.site[0]) ? {
                text: 'Перейти', 
                hyperlink: `http://${parameters.data[i].payload.site[0]}`,
            } : '',
            gis: { 
                text: 'Перейти',
                hyperlink: `https://2gis.ru/firm/${parameters.data[i].id}`, 
            },
            category: parameters.data[i].category,
            underCategory: parameters.data[i].underCategory,
        });
    }
    workbook.xlsx.writeFile(path.join(appRoot.path, 'data', 'output', `${name}.xlsx`)).then(function() {
        resolve();
    });
});

module.exports = {
    read: read,
    write: write,
    excel: excel
}