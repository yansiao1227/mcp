import { Builder, By, Key, until } from "selenium-webdriver";
import { recognizeCaptcha } from "./utils/tools";
import fs from "fs";

async function run() {
  // 创建一个Chrome浏览器实例
  let driver: any = await new Builder().forBrowser("chrome").build();

  try {
    // 导航到指定网页
    await driver.get("https://v3.chaoxing.com/toJcLogin");

    // 找到id为verifyCanvas的元素
    const verifyCanvas = await driver.findElement(By.id("verifyCanvas"));

    // 截图指定元素并保存到文件
    const screenshot = await verifyCanvas.takeScreenshot(true); // true表示以base64格式返回
    if (!fs.existsSync("verifyCanvas")) {
      fs.mkdirSync("verifyCanvas", { recursive: true });
    }
    fs.writeFileSync("verifyCanvas/verifyCanvas.png", screenshot, "base64");
    console.log("验证码图片已保存到文件");

    // 使用OCR识别验证码(效果不佳)
    // recognizeCaptcha("verifyCanvas/verifyCanvas.png");
    // 使用大模型
    
    // 抓取页面的部分内容
    // const bodyText = await driver.findElement(By.tagName('body')).getText();
    // console.log('页面内容:', bodyText.slice(0, 200), '...');
  } catch (error) {
    console.error("发生错误:", error);
  } finally {
    // 关闭浏览器
    await driver.quit();
  }
}

run().then(
  () => console.log("脚本执行成功"),
  (err) => console.error("脚本执行出错", err)
);
