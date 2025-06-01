import Tesseract from "tesseract.js";
import { Jimp } from "jimp";
import path from "path";
import fs from "fs";  

// 图像预处理函数
async function preprocessImage(inputPath: string, outputPath: any) {
  const image = await Jimp.read(inputPath);
  image
    .resize({ w: 300 })
    .greyscale() // 转灰度图
    .contrast(1) // 增强对比度
    .write(outputPath); // 保存处理后的图像
}

// 识别验证码函数
export const recognizeCaptcha = async (inputPath: string) => {
  const worker = await Tesseract.createWorker('eng',3,{
    // logger: (m: any) => console.log(m),
    errorHandler: (err: any) => console.log('[error:]', err),
    // 使用离线训练数据
    langPath: path.resolve(__dirname, '../tessdata'),
  });
  await worker.load();
  await worker.setParameters({
    // 验证码只为数字的情况下，设定白名单
    tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });
  const image =  fs.readFileSync(inputPath);
  const { data: { text } } = await worker.recognize(image);
  console.log(text);
  await worker.terminate();
  // 简单调用
  // Tesseract.recognize(inputPath, "eng", {
  //   logger: (m) => console.log(m.status, m.progress),
  // }).then(({ data: { text } }) => {
  //   console.log("识别结果：", text.trim());
  // });
};
