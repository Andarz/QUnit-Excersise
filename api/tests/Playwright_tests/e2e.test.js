const {test, describe, beforeEach, afterEach, beforeAll, afterAll, expect } = require('@playwright/test');
const {chromium } = require('playwright');

const host = 'http://localhost:3002';

let browser;
let context;
let page;

let user = {
    email: "",
    password: "123456",
    confirmPass: "123456"
};

describe("e2e tests", () => {
    beforeAll(async () => {
        browser = await chromium.launch();
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
    });

    afterEach(async () => {
        await page.close();
        //await context.close();
    });

    describe("authentication", () => {
        test("register makes correct api calls", async () => {
            
            // arrange
            await page.goto(host);
            let random = Math.floor(Math.random() * 10000);
            user.email = `abv${random}@abv.bg`;

            // act
            await page.click("text = Register");
            await page.waitForSelector('form');

            await page.locator("#email").fill(user.email);
            await page.locator("#register-password").fill(user.password);
            await page.locator("#confirm-password").fill(user.confirmPass);

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes('/users/register')
                && response.status() === 200),

                page.click('[type = "submit"]')
            ]);

            let userData = await response.json();

            // assert
            await expect(response.ok()).toBeTruthy();
            expect(userData.email).toBe(user.email);
            expect(userData.password).toBe(user.password);

        })

        test('register not working with empty fields', async () => {

            // arrange
            await page.goto(host);

            // act
            await page.click('text=Register');
            await page.click('[type="submit"]');

            // assert
            expect(page.url()).toBe(host + '/register');
        })

        test('login makes correct api calls', async () => {
            
            // arrange
            await page.goto(host);
            await page.click('text=Login');
            await page.waitForSelector('form')

            // act
            await page.locator('#email').fill(user.email);
            await page.locator('#login-password').fill(user.password);

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes('/users/login')
                && response.status() === 200),

                page.click('[type = "submit"]')
            ]);

            let userData = await response.json();

            // assert
            expect(response.ok).toBeTruthy();
            expect(userData.email).toBe(user.email);
            expect(userData.password).toBe(user.password);
        })

        test('login fails with empty input fields', async () => {

            // arrange
            await page.goto(host);
            await page.click('text=Login');
            await page.waitForSelector('form')

            // act
            await page.click('[type="submit"]');

            // assert
            expect(page.url()).toBe(host + '/login');
        })

        test('logout makes correct api call', async () => {

            // arrange
            await page.goto(host);
            await page.click('text=Login');
            await page.waitForSelector('form');

            await page.locator('#email').fill(user.email);
            await page.locator('#login-password').fill(user.password);
            await page.click('[type="submit"]');

            // act
            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes('/users/logout')
                && response.status() === 204),

                page.click('text=Logout')
            ]);
            await page.waitForSelector('text=Login');

            // assert
            expect(response.ok).toBeTruthy();
            expect(page.url()).toBe(host + "/");
        })
    })

    describe("navigation bar", () => {
        test('logged user should see correct navi buttons', async () => {

            // arrange
            await page.goto(host);

            // act
            await page.click('text=Login');
            await page.waitForSelector('form');

            await page.locator('#email').fill(user.email);
            await page.locator('#login-password').fill(user.password);
            page.click('[type = "submit"]');

            // assert
            await expect(page.locator('nav >> text=All games')).toBeVisible();
            await expect(page.locator('nav >> text=Create Game')).toBeVisible();
            await expect(page.locator('nav >> text=Logout')).toBeVisible();
            await expect(page.locator('nav >> text=Login')).toBeHidden();
            await expect(page.locator('nav >> text=Register')).toBeHidden();

        })

        test('guest user should see correct navi buttons', async () => {

            // act
            await page.goto(host);

            // assert
            await expect(page.locator('nav >> text=All games')).toBeVisible();
            await expect(page.locator('nav >> text=Create Game')).toBeHidden();
            await expect(page.locator('nav >> text=Logout')).toBeHidden();
            await expect(page.locator('nav >> text=Login')).toBeVisible();
            await expect(page.locator('nav >> text=Register')).toBeVisible();

        })
    })

    describe("CRUD", () => {
        beforeEach(async () => {
            await page.goto(host);

            await page.click('text=Login');
            await page.waitForSelector('form');

            await page.locator('#email').fill(user.email);
            await page.locator('#login-password').fill(user.password);
            await page.click('[type = "submit"]');
        });

        test('create fails with empty fields', async () => {

            // arrange
            await page.click('text=Create Game');
            await page.waitForSelector('form');

            // act
            await page.click('[type="submit"]');

            // assert
            expect(page.url()).toBe(host + '/create');
        });

        test('create succeed with valid credentials', async () => {
            // arrange
            await page.click('text=Create Game');
            await page.waitForSelector('form');

            // act
            await page.fill('[name="title"]', "Randon title");
            await page.fill('[name="category"]', "Random category");
            await page.fill('[name="maxLevel"]', "777");
            await page.fill('[name="imageUrl"]', "https://jpeg.org/images/jpeg-home.jpg");
            await page.fill('[name="summary"]', "Some test summary");

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes('/data/games')
                && response.status() === 200),
                page.click('[type = "submit"]')
            ]);

            await expect(response.ok).toBeTruthy();
            let gameData = await response.json();

            // assert
            expect(gameData.title).toEqual('Test title');
            expect(gameData.category).toEqual('Test category');
            expect(gameData.maxLevel).toEqual('777');
            expect(gameData.summary).toEqual('Some test summary');
        });

        test('test for edit/delete buttons for owner', async () => {

            // arrange
            await page.goto(host + '/catalog');
            //console.log(user.email);

            // act
            await page.click('.allGames .allGames-info:has-text("Random title") .details-button');

            // assert
            await expect(page.locator('text=Delete')).toBeVisible();
            await expect(page.locator('text=Edit')).toBeVisible();
        });

        test('test for edit/delete buttons for  non-owner', async () => {

            // arrange
            await page.goto(host + '/catalog');
            //console.log(user.email);

            // act
            await page.click('.allGames .allGames-info:has-text("Zombie Lang") .details-button');

            // assert
            await expect(page.locator('text="Delete"')).toBeHidden();
            await expect(page.locator('text="Edit"')).toBeHidden();
        });

        test('edit succeed for game owner', async () => {

            // arrange
            await page.goto(host + '/catalog');
            await page.click('.allGames .allGames-info:has-text("Random title") .details-button');
            await page.click('text=Edit');
            await page.waitForSelector('form');

            // act
            await page.locator('[name="title"]').fill("Edited random title");

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes('/data/games')
                && response.status() === 200),
                page.click('[type = "submit"]')
            ]);

            let gameData = await response.json();

            // assert
            expect(gameData.title).toEqual('Edited random title');

        })

        test('delete succeeds', async () => {

            // arrange
            await page.goto(host + '/catalog');
            await page.click('.allGames .allGames-info:has-text("Edited title") .details-button');
            await page.click('text="Delete"');
            await page.waitForSelector('form');

            // act
            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes('/data/games')
                && response.status() === 200),
                page.click('text=Delete')
            ]);

            // assert
            expect(response.ok).toBeTruthy();
        });
    });

    describe("Home page", () => {
        test('home page view test', async () => {

            // arrange
            await page.goto(host);

            // act & assert
            const gameDivs = await page.locator('#home-page .game').all();

            expect(page.locator('.welcome-message h2')).toHaveText('ALL new games are');
            expect(page.locator('.welcome-message h3')).toHaveText('Only in GamesPlay');
            expect(page.locator('#home-page h1')).toHaveText('Latest Games');

            expect(gameDivs.length).toBeGreaterThanOrEqual(3);
        });
    });
});