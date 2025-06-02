import { Builder, By, Key, until } from "selenium-webdriver";
import { config } from "./config";
import fs from "fs";
import path from "path";
import chrome from "selenium-webdriver/chrome";

const courseName = "人工智能与应用实践"; // 课程名称，根据实际情况修改
const optionArr = new chrome.Options();
// 禁用下载安全提示和安全浏览检查
optionArr.setUserPreferences({
  "download.prompt_for_download": false, // 跳过下载提示
  "safebrowsing.enabled": false, // 禁用安全浏览检查
  "download.default_directory": path.join(__dirname, "../data/temp"), // 下载路径（根据实际调整）
  "--unsafely-treat-insecure-origin-as-secure":
    "https://mooc2-ans.chaoxing.com",
});

const login = async (driver: any) => {
  const phone = await driver.findElement(By.id("phone"));
  await phone.sendKeys(config.phone);
  const password = await driver.findElement(By.id("pwd"));
  await password.sendKeys(config.password);
  const loginButton = await driver.findElement(By.id("loginBtn"));
  await loginButton.click();
  try {
    const res = await driver.wait(
      until.elementLocated(By.className("zt_u_name")),
      config.timeout
    );
    const userName = await res.getText();
    if (userName === config.userName) {
      console.log(userName + "：登录成功");
      return "登录成功";
    } else {
      return "登录失败";
    }
  } catch (error) {
    return "登录失败";
  }
};
const getTaskList = async (driver: any, courseName: string) => {
  try {
    const tab = await driver.findElement(By.css('[coursetype="0"]'));
    // 等加载完再点击
    setTimeout(async () => {
      await tab.click();
    }, 500);
    const courseDiv = await driver.wait(
      until.elementLocated(
        By.xpath("//*[contains(text(),'" + courseName + "')]")
      ),
      config.timeout
    );
    await courseDiv.click();
    // 操作完成后切换回主文档
    await driver.switchTo().defaultContent();
    // 获取所有窗口句柄
    const handles = await driver.getAllWindowHandles();
    // 切换到新打开的标签页
    await driver.switchTo().window(handles[1]);

    const zyicon = await driver.wait(
      until.elementLocated(By.css('li[dataname="zy"]')),
      config.timeout
    );
    await zyicon.click();

    const iframe = await driver.findElement(By.id("frame_content-zy"));
    await driver.switchTo().frame(iframe);
    const taskList = await driver.findElement(By.className("taskList"));
    return taskList;
  } catch (error) {
    return "获取作业列表失败:" + error;
  }
};
async function run() {
  // 需要验证码，不采用
  // const verfiyURL="https://v3.chaoxing.com/toJcLogin"
  const baseURL = "https://passport2.chaoxing.com/login?null";
  // 创建一个Chrome浏览器实例
  let driver: any = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(optionArr)
    .build();
  try {
    // 导航到指定网页
    await driver.get(baseURL);
    const isSuccess = await login(driver);
    if (isSuccess === "登录成功") {
      // 先切换到iframe
      const iframe = await driver.findElement(By.id("frame_content"));
      await driver.switchTo().frame(iframe);
      // 目前先只考虑批第一页的第一个非零作业
      const taskList = await getTaskList(driver, courseName);
      if (typeof taskList === "string") {
        throw new Error(taskList);
      } else {
        const workList = await taskList.findElements(By.tagName("li"));
        const needToCorrect = [];
        for (const work of workList) {
          const tmp = await work.findElement(By.className("piyuePcon color3"));
          const waitForCorrect = await tmp.findElement(By.className("fs28"));
          const num = await waitForCorrect.getText();
          if (Number(num) > 0) {
            needToCorrect.push(work);
          }
        }
        // 先只处理第一个还有未批改的作业
        const correctBtn = await needToCorrect[0].findElement(
          By.className("wid9")
        );
        await correctBtn.click();
        const td = await driver.wait(
          until.elementsLocated(By.className("dataBody_td")),
          config.timeout
        );
        const firstCorrectWork = await td[0].findElement(By.className("cz_py"));
        await firstCorrectWork.click();
        await driver.switchTo().defaultContent();
        const handles = await driver.getAllWindowHandles();
        await driver.switchTo().window(handles[2]);
        const contentBoxList = await driver.wait(
          until.elementsLocated(By.className("mark_item1")),
          config.timeout
        );
        for (let i = 0; i < 1; i++) {
          const targetDir = path.join(__dirname, "../data/temp");
          await fs.mkdir(targetDir, { recursive: true }, () => {});
          const contentBox = contentBoxList[i];
          const titleDivQ = await contentBox.findElement(
            By.className("hiddenTitle")
          );
          const linesQ = await titleDivQ.findElements(By.tagName("p"));
          let resultQ = "";
          for (const line of linesQ) {
            resultQ += (await line.getText()) as string;
          }
          // 保存问题到q.txt
          const filePathQ = path.join(targetDir, "q.txt");
          await fs.writeFile(filePathQ, resultQ, "utf-8", () => {});
          const iframeQ = await titleDivQ.findElement(By.tagName("iframe"));
          await driver.executeScript(
            "arguments[0].scrollIntoView(true);",
            iframeQ
          );
          await driver.switchTo().frame(iframeQ);
          const fileBtnQ = await driver.findElement(By.className("attach"));
          await fileBtnQ.click();
          // 等待下载完成
          await driver.sleep(1000);
          await driver.switchTo().defaultContent();

          const titleDivA = await contentBox.findElement(
            By.className("stuAnswerWords textwrap")
          );
          const linesA = await titleDivA.findElements(By.tagName("p"));
          let resultA = "";
          for (const line of linesA) {
            resultA += (await line.getText()) as string;
          }
          // 保存问题到a.txt
          const filePathA = path.join(targetDir, "a.txt");
          await fs.writeFile(filePathA, resultA, "utf-8", () => {});
          const iframeA = await titleDivA.findElement(By.tagName("iframe"));
          await driver.executeScript(
            "arguments[0].scrollIntoView(true);",
            iframeA
          );
          await driver.switchTo().frame(iframeA);
          const fileBtnA = await driver.findElement(By.className("attach"));
          await fileBtnA.click();
          // 等待下载完成
          await driver.sleep(1000);
          await driver.switchTo().defaultContent();

          // 清除临时文件
          // await fs.rm(targetDir, { recursive: true, force: true }, () => {
          //   console.log("删除目录成功");
          // });
        }
      }
    } else {
      throw new Error("登录失败");
    }
  } catch (error) {
    console.error("发生错误:", error);
  } finally {
    // 关闭浏览器
    await driver.sleep(config.timeout);
    await driver.quit();
  }
}

run().then(
  () => console.log("脚本执行成功"),
  (err) => console.error("脚本执行出错", err)
);
