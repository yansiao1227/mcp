import Tesseract from "tesseract.js";
import { Jimp } from "jimp";

// 图像预处理函数
async function preprocessImage(inputPath: string, outputPath: any) {
  const image = await Jimp.read(inputPath);
  image
    .resize({ w: 300 })
    .greyscale() // 转灰度图
    .contrast(1) // 增强对比度
    .write(outputPath); // 保存处理后的图像
}

export const recognizeCaptcha = async (inputPath: string) => {
  Tesseract.recognize(inputPath, "eng", {
    logger: (m) => console.log(m.status, m.progress),
  }).then(({ data: { text } }) => {
    console.log("识别结果：", text.trim());
  });
};
