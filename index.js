const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

//.env
require('dotenv').config()


console.log(process.env.LOGIN);
console.log(process.env.PASSWORD);

//Csv
const writeStream = fs.createWriteStream('githubIssues.csv',{encoding: 'utf8'});
writeStream.write(`Titulo; Descricão; Data de criação \n`);

//Start
(async () => {
    //Config
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox"
        ]
        
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0)
    await page.goto("https://github.com/login");
    console.log("sucesso ao acessar a pagina principal");


    //Login
    await page.type('#login_field', process.env.LOGIN);
    await page.type('#password', process.env.PASSWORD);
    await page.click('[type="submit"]');
    await page.waitForNavigation();
    console.log("sucesso ao logar");


    //Track to issue list
    await page.click('[href="/issues"]');
    await page.waitForSelector('.Link--primary.v-align-middle.no-underline.h4.js-navigation-open.markdown-title');
    console.log("sucesso ao carregar pagina de issues");


    //Load href of issues
    const hrefs = await page.evaluate(
        () => Array.from(
          document.querySelectorAll('.Link--primary.v-align-middle.no-underline.h4.js-navigation-open.markdown-title'),
          a => a.getAttribute('href')
        )
    );


    //Access issue page
    for(const href of hrefs){
        await page.goto('https://github.com' + href)
        console.log('Acessado com sucesso a pagina: https://github.com' + href);
        await page.waitForSelector('.js-issue-title.markdown-title');
        const issuePage = await page.content();

        //Get title, date and description with cheerio
        const $ = cheerio.load(issuePage);
        const title = $('.js-issue-title.markdown-title').text();
        const date = $('relative-time').attr('datetime');
        const description = $('[dir="auto"]').text();

        writeStream.write(`${title}; ${description}; ${date} \n`);
        
        await page.goBack();
    }
    
    await browser.close(); 
}) ().catch(err => console.log(err));