


class InstagramBot {

    constructor() {
        this.firebase_db = require('./db');
        this.config = require('./config/puppeteer.json');
    };

    async initPuppeter() {
        const puppeteer = require('puppeteer');
        this.browser = await puppeteer.launch({
            headless: this.config.settings.headless,
            args: ['--no-sandbox'],
        });
        const context = await this.browser.createIncognitoBrowserContext();
        this.page = await context.newPage();
        this.page.setViewport({width: 1500, height: 764});
        this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    };

    async loginInstagram() {
        await this.page.goto(this.config.login_url, {timeout:60000});
        await this.page.waitFor(2500);
        await this.page.click(this.config.selectors.username_field);
        await this.page.keyboard.type(this.config.username);
        await this.page.click(this.config.selectors.password_field);
        await this.page.keyboard.type(this.config.password);
        await this.page.click(this.config.selectors.login_button);
        await this.page.waitForNavigation();
        //Close Turn On Nofications madal after login
        await this.page.click(this.config.selectors.not_now_button);
    };

    async visitHashtagUrl() {
        const shuffle = require('shuffle-array');
        let hashTags = shuffle(this.config.hashTags);

        for (let tagIndex = 0; tagIndex < hashTags.length; tagIndex++) {
            console.log('<<<< Currently Exploring>>>> #' + hashTags[tagIndex]);
            // visit the hash tag url
            await this.page.goto(`${this.config.base_url}/explore/tags/` + hashTags[tagIndex] + '/?hl=en');
            // lop through posts
            await this._doPostLikeAndFollow(this.config.selectors.hash_tags_base_class, this.page)
        }
    };


    async visitUserProfile() {
        await this._scrapeUserProfile('https://www.instagram.com/mentionables_/', this.page)
    };

    async _doPostLikeAndFollow (parentClass, page) {

        for (let r = 1; r < 4; r++) {//loops through each row
            for (let c = 1; c < 4; c++) {//loops through each item in row
                
                let br = false;

                await page.click(`${parentClass} > div > div > .Nnq7C:nth-child(${r}) > .v1Nh3:nth-child(${c}) > a`)
                    .catch((e) => {
                        console.log(e.message);
                        br = true;
                    });
                await page.waitFor(2250 + Math.floor(Math.random() * 250));
                if (br) continue;


                let hasEmptyHeart = await page.$(this.config.selectors.post_heart_grey);


                let username = await page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, this.config.selectors.post_username);
                console.log(`INTERACTING WITH ${username}'s POST`);


                //like post if not already liked.  check against like ratio
                if (hasEmptyHeart !== null && Math.random() < this.config.settings.like_ratio) {
                    await page.click(this.config.selectors.post_like_button);
                    await page.waitFor(10000 + Math.floor(Math.random() * 5000));
                }


                let isArchivedUser = null;
                await this.firebase_db.inHistory(username).then(data => isArchivedUser = data)
                    .catch(() => isArchivedUser = false);

                
                let followStatus= await page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, this.config.selectors.post_follow_link);

                console.log("followStatus", followStatus);



                if (followStatus === 'Follow' && !isArchivedUser) {
                    await this.firebase_db.addFollowing(username).then(() => {
                        return page.click(this.config.selectors.post_follow_link);
                    }).then(() => {
                        console.log('<<< STARTED FOLLOWING >>> ' + username);
                        return page.waitFor(10000 + Math.floor(Math.random() * 5000));
                    }).catch((e) => {
                        console.log('<<< ALREADY FOLLOWING >>> ' + username);
                        console.log('<<< POSSIBLE ERROR >>> ' + username + ':' + e.message);
                    });
                }


                await page.click(this.config.selectors.post_close_button)
                    .catch((e) => console.log('<<< ERROR CLOSING POST >>> ' + e.message));
                await page.waitFor(2250 + Math.floor(Math.random() * 250));

            }
        }
    };

    async _scrapeUserProfile(userURL, page) {

        await page.goto(userURL)

        let isUsernameNotFound = await page.evaluate(() => {
            if(document.getElementsByTagName('h2')[0]) {
                if(document.getElementsByTagName('h2')[0].textContent == "Sorry, this page isn't available.") {
                    return true;
                }
            }
        });


        if(isUsernameNotFound) {

            console.log('Account does not exsist!');

            await this.browser.close()
        }

        let username = await page.evaluate(() => {
            return document.querySelectorAll('header > section h1')[0].textContent;
        });


        let isVerifiedAccount = await page.evaluate(() => {
            if(document.getElementsByClassName('coreSpriteVerifiedBadge')[0]) {
                return true;
            } else {
                return false;
            }
        });


        let usernamePictureUrl = await page.evaluate(() => {
            return document.querySelectorAll('header img')[0].getAttribute('src');
        });

        // get total number of posts
        let postsCount = await page.evaluate(() => {
            return document.querySelectorAll('header > section > ul > li span')[0].textContent.replace(/\,/g, '');
        });
    
        // get number of total followers
        let followersCount = await page.evaluate(() => {
            return document.querySelectorAll('header > section > ul > li span')[1].getAttribute('title').replace(/\,/g, '');
        });
    
        // get number of total followings
        let followingsCount = await page.evaluate(() => {
            return document.querySelectorAll('header > section > ul > li span')[2].textContent.replace(/\,/g, '');
        });
    
        // get bio name
        let name = await page.evaluate(() => {
            // check selector exists
            if(document.querySelectorAll('header > section h1')[1]) {
                return document.querySelectorAll('header > section h1')[1].textContent;
            } else {
                return '';
            }
        });
    
        // get bio description
        let bio = await page.evaluate(() => {
            if(document.querySelectorAll('header h1')[1].parentNode.querySelectorAll('span')[0]) {
                return document.querySelectorAll('header h1')[1].parentNode.querySelectorAll('span')[0].textContent;
            } else {
                return '';
            }
        });
    
        // get bio URL
        let bioUrl = await page.evaluate(() => {
            // check selector exists
            if(document.querySelectorAll('header > section div > a')[1]) {
                return document.querySelectorAll('header > section div > a')[1].getAttribute('href');
            } else {
                return '';
            }
        });
    
        // get bio display
        let bioUrlDisplay = await page.evaluate(() => {
            // check selector exists
            if(document.querySelectorAll('header > section div > a')[1]) {
                return document.querySelectorAll('header > section div > a')[1].textContent;
            } else {
                return '';
            }
        });
    
        // check if account is private or not
        let isPrivateAccount = await page.evaluate(() => {
            // check selector exists
            if(document.getElementsByTagName('h2')[0]) {
                // check selector text content
                if(document.getElementsByTagName('h2')[0].textContent == 'This Account is Private') {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        });
    
        // get recent posts (array of url and photo)
        let recentPosts = await page.evaluate(() => {
            let results = [];
    
            // loop on recent posts selector
            document.querySelectorAll('[href]').forEach((el) => {
                // init the post object (for recent posts)
                let post = {};

                if(el.getAttribute('href').includes('/p/')) {
                    
                    post.url = 'https://www.instagram.com' + el.getAttribute('href');
                    post.photo = el.querySelector('img').getAttribute('src');
                    results.push(post);
                }
    
                // fill the post object with URL and photo data
    
                // add the object to results array (by push operation)
            });
    
            // recentPosts will contains data from results
            return results;
        });
    
        // display the result to console
        console.log({'username': username,
                     'is_verified_account': isVerifiedAccount,
                     'username_picture_url': usernamePictureUrl,
                     'posts_count': postsCount,
                     'followers_count': followersCount,
                     'followings_count': followingsCount,
                     'name': name,
                     'bio': bio,
                     'bio_url': bioUrl,
                     'bio_url_display': bioUrlDisplay,
                     'is_private_account': isPrivateAccount,
                     'recent_posts': recentPosts});








    };

    async unFollowUsers() {
        let date_range = new Date().getTime() - (this.config.settings.unfollow_after_days * 86400000);


        let following = await this.firebase_db.getFollowings();
        let users_to_unfollow = []
        if (following) {
            const all_users = Object.keys(following);

            users_to_unfollow = all_users.filter(user => following[user].added < date_range)
        }

        if (users_to_unfollow.length) {
            for (let n = 0; n < users_to_unfollow.length; n++) {
                let user = users_to_unfollow[n];
                await this.page.goto(`${this.config.base_url}/${user}/?hl=en`);
                await this.page.waitFor(1500 + Math.floor(Math.random() * 500));

                let followStatus = await this.page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, this.config.selectors.user_unfollow_button);

                if (followStatus === 'Following') {
                    console.log('<<< UNFOLLOW USER >>>' + user);

                    await this.page.click(this.config.selectors.user_unfollow_button);

                    await this.page.waitFor(1000);

                    await this.page.click(this.config.selectors.user_unfollow_confirm_button)

                    await this.page.waitFor(20000 + Math.floor(Math.random() * 5000));

                    await this.firebase_db.unFollow(user);
                } else {
                  
                    this.firebase_db.unFollow(user);
                }
            }

        }
    };

    async closeBrowser() {
        await this.browser.close();
    };

    async scrapeInfiniteScrollItems(
        targetSelector,
        itemTargetCount,
        scrollDelay = 1000,
    ) {
        let items = [];
        try {
            let previousHeight;
            while (items.length < itemTargetCount){
                items = await this.page.evaluate(this._extractItems);
                previousHeight = await this.page.evaluate('document.body.scrollHeight');
                await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await this.page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
                await this.page.waitFor(scrollDelay);
            }
        } catch(e) {
            console.log(e)
        }
        console.log(items)
        return items;

    }

    _extractItems() {
        const extractedElements = document.querySelectorAll('.BrX75');
        console.log(extractedElements)
        const items = []
        for (let element of extractedElements) {
            items.push(element);
        }
        return items
    }

};

module.exports = InstagramBot;