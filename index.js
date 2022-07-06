const puppeteer = require("puppeteer");
const { checkResourceStatus } = require("./utils");

const resources = [];
// const imageUrls = []

// 页面滚动到底部
const scrollToBottom = async page => {
  await page.evaluate(() => {
    return new Promise(resolve => {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      let scrolledHeight = 0;
      const distance = scrollHeight / 10;
      const interval = setInterval(() => {
        // alert(scrolledHeight);
        if (scrolledHeight < scrollHeight) {
          window.scrollBy(0, distance);
          scrolledHeight += distance;
        } else {
          clearInterval(interval);
          resolve(true);
        }
      }, 500);
    });
  });
};

// 获取配置信息
const getConfig = async () => {
  const config = await require("./config.json");
  return config;
};

// 启动浏览器的方法
const launchBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // devtools: true,
  });
  return browser;
};

// const

const init = async () => {
  const config = await getConfig();
  const browser = await launchBrowser();
  const page = await browser.newPage();

  // 收集页面资源
  page.on("response", async response => {
    const url = response.url();
    const status = response.status();
    resources.push({
      url,
      status,
      // type: response.resourceType(),
      page: page.url(),
    });
    // console.log("resources", resources);
  });

  await page.goto(config.url);
  await scrollToBottom(page);
  const { imageUrls } = await page.evaluate(() => {
    // 获取页面上所有的图片
    const getAllImages = () => {
      const images = document.querySelectorAll("img");
      // alert(images);
      const imageUrls = [];
      images.forEach(image => {
        imageUrls.push(image.src);
      });
      return imageUrls;
    };
    imageUrls = getAllImages();
    return {
      imageUrls,
    };
  });
  console.log("imageUrls", imageUrls);
  // map中使用异步方法的一种方式
  const isExists = await Promise.all(
    imageUrls.map(async imageUrl => {
      return await Promise.retry(checkResourceStatus, 3, 500, imageUrl);
    })
  );
  console.log(isExists);
  // await browser.close();
};

init();
