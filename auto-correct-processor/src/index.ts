import { Builder, By, Key, until } from "selenium-webdriver";
import { config } from "./config";

const courseName = "人工智能与应用实践"; // 课程名称，根据实际情况修改
const fileDownloadPath = "";

async function run() {
  // 需要验证码，不采用
  // const verfiyURL="https://v3.chaoxing.com/toJcLogin"
  const baseURL = "https://passport2.chaoxing.com/login?null";
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
  const loadFileAndQA = async (driver: any, contentBox: any, name: string) => {
    try {
      const titleDiv = await contentBox.findElement(By.className(name));
      const lines = await titleDiv.findElements(By.tagName("p"));
      let result = "";
      for (const line of lines) {
        result += (await line.getText()) as string;
      }
      const iframe = await titleDiv.findElement(By.tagName("iframe"));
      await driver.switchTo().frame(iframe);
      const file = await driver.findElement(By.tagName("div"));
      await file.click();
      await driver.switchTo().defaultContent();
    } catch (error) {
      console.log(error);
    }
  };
  // 创建一个Chrome浏览器实例
  let driver: any = await new Builder().forBrowser("chrome").build();
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
        const contentBox = contentBoxList[0];
        const titleDiv = await contentBox.findElement(
          By.className("hiddenTitle")
        );
        const lines = await titleDiv.findElements(By.tagName("p"));
        let result = "";
        for (const line of lines) {
          result += (await line.getText()) as string;
        }
        console.log("question: " + result);
        const iframe = await titleDiv.findElement(By.tagName("iframe"));
        await driver.executeScript("arguments[0].scrollIntoView(true);", iframe);
        await driver.switchTo().frame(iframe);
        const file = await driver.findElement(By.className("attach"));
        console.log(await file.getText());
        await file.click();
        await driver.switchTo().defaultContent();
        // needToCorrect.forEach(async (work) => {
        //   correctWork(driver, work);
        // });
      }
    } else {
      throw new Error("登录失败");
    }
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
