const puppeteer = require("puppeteer");
const { checkResourceStatus } = require("./utils");

let resources = [];

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

// 获取网页中图片资源
const getAllImages = async page => {
  return await page.evaluate(() => {
    const images = document.querySelectorAll("img");
    const srcsetImages = document.querySelectorAll("img[srcset]");
    const aLinks = document.querySelectorAll("a[href]");

    // 展开srcset图片，浏览器中运行，无法放到外部
    const flattenSrcSetImages = srcsetImages => {
      let images = [];
      [...srcsetImages]
        .map(image => image.srcset)
        .forEach(srcsetImage => {
          const image = srcsetImage.split(",");
          images = images.concat(image);
        });
      return images
        .map(image => image.trim())
        .map(image => image.slice(0, image.lastIndexOf(" ")));
    };

    const flattenSrcImages = flattenSrcSetImages(srcsetImages);

    return {
      imageUrls: [...images].map(image => image.src).concat(flattenSrcImages),
      aLinks: [...aLinks].map(a => a.href),
    };
  });
};

// 处理倍图中没有出现的图片
const handleSrcsetImages = async (resources, images, page) => {
  const hideenImages = images.filter(image => {
    return !resources.find(resource => resource.url === image);
  });
  console.log("hideenImages", hideenImages, hideenImages.length);
  const hideenResources = [];
  if (hideenImages.length > 0) {
    await Promise.all(
      hideenImages.map(async imageUrl => {
        const status = await Promise.retry(
          checkResourceStatus,
          3,
          500,
          imageUrl
        );
        hideenResources.push({
          url: imageUrl,
          status,
          type: "image",
          from: page.url(),
        });
        return status;
      })
    );
    console.log(hideenResources);
    resources = resources.concat(hideenResources);
  }
};

//  判断资源status是否正常，如果不正常，重新尝试获取，否则抛出错误
const resolveResources  = async resources => {
  const promises = resources.map(async resource => {
    if (resource.status > 400) {
      const status = await Promise.retry(
        checkResourceStatus,
        3,
        500,
        resource.url
      );
      resource.status = status;
    }
    return resource;
  }).filter(resource => resource.status === 200);
  const resolvedResources = await Promise.all(promises);
  console.log(resolvedResources);
}

// 获取配置信息
const getConfig = async () => {
  const config = await require("./config.json");
  return config;
};

// 启动浏览器的方法
const launchBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // devtools: true,
  });
  return browser;
};

// 处理前台资源（图片、链接）
const handleFrontAssets = async () => {
  const config = await getConfig();
  const browser = await launchBrowser();
  const page = await browser.newPage();

  // 收集页面资源
  // page.on("response", response => {
  //   const url = response.url();
  //   const status = response.status();
  //   const type = response.request().resourceType();
  //   const from = page.url();
  //   resources.push({
  //     url,
  //     status,
  //     type,
  //     from,
  //   });
  //   console.log(resources);
  // });
  resources = config.resources;

  await page.goto(config.url);
  // await scrollToBottom(page);
  // const { imageUrls } = await getAllImages(page);
  const imageUrls = config.images; // 先用本地文件代替
  // console.log("imageUrls", imageUrls);
  handleSrcsetImages(resources, imageUrls, page);
  await resolveResources(resources);
  // console.log(isExists);
  await browser.close();
};

handleFrontAssets()
  .then(() => {
    console.log("handleFrontAssets success");
  })
  .catch(err => {
    console.log("handleFrontAssets error", err);
  });
