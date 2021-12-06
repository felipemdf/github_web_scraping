const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

//.env
require('dotenv').config()


//Csv
const writeStream = fs.createWriteStream('githubIssues.csv',{encoding: 'utf8'});
writeStream.write(`Titulo; Descricão; Data de criação \n`);


const loggedCheck = async (page) => {
    try {
        await page.waitForSelector(`[content=${process.env.LOGIN}]`, { timeout: 10000 });
        return true;
    } catch(err) {
        return false;
    }
};
//Start
(async () => {
    //Config
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox"
        ]
        
    });

    let isLogged = false;

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0)

    //Login
    if (!isLogged){
        await page.goto("https://github.com/login");
        console.log("sucesso ao acessar a pagina principal");

        await page.type('#login_field', process.env.LOGIN);
        await page.type('#password', process.env.PASSWORD);
        await page.click('[type="submit"]');
        await page.waitForNavigation();

        isLogged = await loggedCheck(page);
    }

        
    if (isLogged == true){
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
    } else {
        throw new Error('Incorrect username or password.')
    }
    await browser.close();
}) ().catch(err => console.log(err));