Promise.retry = (fn, times = 3, delay = 500, ...args) => {
  return new Promise((resolve, reject) => {
    let count = 0;
    const retry = () => {
      fn(...args)
        .then(resolve)
        .catch(err => {
          count++;
          if (count < times) {
            setTimeout(retry, delay);
          } else {
            reject(err);
          }
        });
    };
    retry();
  });
};
// fileData.replace(/(JSON\.parse\(\'=?)(.+)(?=\'\))/g, '\'{}');

// 检查资源状态
const checkResourceStatus = async url => {
  try {
    const response = await fetch(url);
    const status = response.status;
    if (status >= 200 && status < 300) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
};

module.exports = {
  checkResourceStatus
};
