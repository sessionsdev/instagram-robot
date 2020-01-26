const Bot = require('./bot');
const config = require('./bot/config/puppeteer');


const run = async () => {
    const bot = new Bot();

    const startTime = Date();

    await bot.initPuppeter().then(() => console.log("PUPPETTER INITIALIZED"));

    await bot.loginInstagram().then(() => console.log("BROWSING INSTAGRAM"));

    // await bot.scrapeInfiniteScrollItems('[href]', 10)

    // await bot.visitHashtagUrl().then(() => console.log("VISITED HASH-TAG URL"));

    // await bot.unFollowUsers();

    // await bot.visitUserProfile()

    await bot.visitPostUrl()
    
    await bot.closeBrowser().then(() => console.log("BROWSER CLOSE"));
    
    const endTime = Date()

    console.log(`START TIME - ${startTime} / END TIME = ${endTime}`)
};

run().catch(e=>console.log(e.message));



// setInterval(run, config.settings.run_every_x_hours * 3600000);



