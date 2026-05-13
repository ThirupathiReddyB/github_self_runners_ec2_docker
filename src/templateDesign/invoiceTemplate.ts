import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, PDFImage } from "pdf-lib";
import axios from "axios";
import { companyDetails } from "../constants/invoiceData";
import { IPDFInvoice } from "../utility/DataTypes/types.subscription";
import sharp from "sharp";
//global function to draw text
const drawText = (
  text: string,
  x: number,
  y: number,
  boldFont: PDFFont,
  regularFont: PDFFont,
  page: PDFPage,
  size = 10,
  isBold = false,
  color = rgb(0, 0, 0)
) => {
  const font = isBold ? boldFont : regularFont; // Assuming you have a boldFont and regularFont loaded
  page.drawText(text, { x, y, size, font, color });
};

// Helper to download and embed an image once
const fetchAndEmbedImage = async (url: string, pdfDoc: PDFDocument): Promise<PDFImage | null> => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    
    // RESIZE STEP: Scale down the image to a max width of 300px
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 300, withoutEnlargement: true }) // Don't upscale small images
      .png({ quality: 80 })
      .toBuffer();

    return await pdfDoc.embedPng(optimizedBuffer);
  } catch (error) {
    console.error(`Failed to fetch image at ${url}:`, error);
    return null;
  }
};

//global function to draw image
// const drawImage = async (
//   imageUrl: string, // e.g. './assets/logo.png'
//   x: number,
//   y: number,
//   width: number,
//   height: number,
//   page: PDFPage,
//   pdfDoc: PDFDocument
// ) => {
//   try {
//     const response = await axios.get(imageUrl, {
//       responseType: "arraybuffer",
//     });
//     const imageBuffer = Buffer.from(response.data);

//     // Step 3: Embed the image (choose based on file type)
//     const image = await pdfDoc.embedPng(imageBuffer); // Embed once

//     // Draw the image on the page
//     page.drawImage(image, { x, y, width, height });
//   } catch (err) {
//     console.error(`Failed to embed image from ${imageUrl}:`, err);
//   }
// };
// 1. Modify drawImage to accept the embedded object instead of a URL
// Modified drawImage: now takes the PDFImage object directly
const drawImage = (
  image: PDFImage | null,
  x: number,
  y: number,
  width: number,
  height: number,
  page: PDFPage
) => {
  if (!image) return;
  page.drawImage(image, { x, y, width, height });
};

const fitsInLine = (
  content: string,
  font: PDFFont,
  fontSize: number,
  padding: number,
  maxWidth: number
) => {
  return font.widthOfTextAtSize(content, fontSize) + 2 * padding <= maxWidth;
};

const splitLongWord = (
  word: string,
  font: PDFFont,
  fontSize: number,
  padding: number,
  maxWidth: number
) => {
  const parts: string[] = [];
  let cutWord = "";

  for (const ch of word) {
    const testWord = cutWord + ch;
    if (!fitsInLine(testWord, font, fontSize, padding, maxWidth)) {
      if (cutWord) parts.push(cutWord);
      cutWord = ch;
    } else {
      cutWord = testWord;
    }
  }
  if (cutWord) parts.push(cutWord);
  return parts;
};

// Wrap text function
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  padding: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (fitsInLine(testLine, font, fontSize, padding, maxWidth)) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) lines.push(currentLine);

    if (!fitsInLine(testLine, font, fontSize, padding, maxWidth)) {
      lines.push(...splitLongWord(word, font, fontSize, padding, maxWidth));
      currentLine = "";
    } else {
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
const shouldDrawBorder = (
  side: "left" | "right",
  index: number,
  isHeader: boolean,
  isBold: boolean,
  fill: boolean,
  textsLength: number,
  customBorders?: {
    drawLeft?: (index: number) => boolean;
    drawRight?: (index: number) => boolean;
  }
) => {
  const isFirstCol = index === 0;
  const isLastCol = index === textsLength - 1;

  if (side === "left" && customBorders?.drawLeft)
    return customBorders.drawLeft(index);
  if (side === "right" && customBorders?.drawRight)
    return customBorders.drawRight(index);

  return isHeader || fill || !isBold || isFirstCol || isLastCol;
};

//function to draw table
const drawInvoiceTable = (
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  startX: number,
  startY: number,
  colWidths: number[],
  textSize: number,
  data: {
    headers: string[];
    row: Array<Array<string>>;
    totalAmount: string;
    amountInWords: string;
  },
  pdfDoc: PDFDocument,
  height: number,
  yLimit: number
) => {
  let yOffset = startY;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const padding = 8;

  const drawRow = (
    texts: string[],
    y: number,
    isHeader = false,
    isBold = false,
    fill = false,
    customBorders?: {
      drawLeft?: (index: number) => boolean;
      drawRight?: (index: number) => boolean;
    }
  ): number => {
    const currentFont = isHeader || isBold ? boldFont : font;

    //  Wrap and store lines for each cell
    const wrappedLines: string[][] = [];
    const rowHeights: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const lines = wrapText(
        texts[i],
        currentFont,
        textSize,
        colWidths[i] || totalWidth,
        padding
      );
      wrappedLines.push(lines);
      rowHeights.push(lines.length * (textSize + 2) + 2 * padding);
    }

    const rowHeight = Math.max(...rowHeights);

    let x = startX;

    if (fill && !isBold) {
      page.drawRectangle({
        x,
        y: y - rowHeight,
        width: totalWidth,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95),
      });
    }

    for (let i = 0; i < texts.length; i++) {
      const isFirstCol = i === 0;
      const isLastCol = i === texts.length - 1;
      const drawLeftLine = shouldDrawBorder(
        "left",
        i,
        isHeader,
        isBold,
        fill,
        texts.length,
        customBorders
      );
      const drawRightLine = shouldDrawBorder(
        "right",
        i,
        isHeader,
        isBold,
        fill,
        texts.length,
        customBorders
      );

      if (drawLeftLine) {
        page.drawLine({
          start: { x, y },
          end: { x, y: y - rowHeight },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
      }

      drawWrappedCellText(
        x,
        y,
        colWidths[i] || totalWidth,
        wrappedLines[i],
        currentFont,
        isLastCol && isBold ? "left" : isFirstCol ? "left" : "center"
      );

      if (drawRightLine) {
        page.drawLine({
          start: { x: x + (colWidths[i] || totalWidth), y },
          end: { x: x + (colWidths[i] || totalWidth), y: y - rowHeight },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
      }

      x += colWidths[i] || totalWidth;
    }

    // Top line
    page.drawLine({
      start: { x: startX, y },
      end: { x: startX + totalWidth, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Bottom line
    page.drawLine({
      start: { x: startX, y: y - rowHeight },
      end: { x: startX + totalWidth, y: y - rowHeight },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    return rowHeight;
  };

  const drawWrappedCellText = (
    x: number,
    y: number,
    width: number,
    lines: string[],
    font: PDFFont,
    align: "left" | "center" = "center"
  ) => {
    const lineHeight = textSize + 2;
    const startY = y - padding - textSize;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let lineWidth = font.widthOfTextAtSize(line, textSize);
      let textX: number;

      if (align === "center") {
        textX = x + (width - lineWidth) / 2;
      } else {
        textX = x + padding;
      }

      // !uncomment if any issue for clipping removed due to sonar qube issue
      // // if (lineWidth > width - 2 * padding) {
      //   // Optionally reduce font size dynamically here (not recommended)
      // //   lineWidth = width - 2 * padding;
      // // }

      const textY = startY - i * lineHeight;

      page.drawText(line, {
        x: textX,
        y: textY,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
        maxWidth: width - 2 * padding, // <- Important
      });
    }
  };

  // Draw Headers
  const headerHeight = drawRow(data.headers, yOffset, true, true);
  yOffset -= headerHeight;

  // Draw Table Rows
  for (const row of data.row) {
    if (yOffset - 40 < yLimit) {
      page = pdfDoc.addPage([750, 900]);
      yOffset = height - 40;
      const headerHeight = drawRow(data.headers, yOffset, true, true); // redraw header
      yOffset -= headerHeight; // deduct actual header height
    }
    const rowHeight = drawRow(row, yOffset);
    yOffset -= rowHeight;
  }

  // Adjust space for total invoice Amount if necessary
  if (yOffset - 40 < yLimit) {
    page = pdfDoc.addPage([750, 900]);
    yOffset = height - 40;
    //remove this in case client doesnt require header if only last 2 rows goes on next page
    const headerHeight = drawRow(data.headers, yOffset, true, true); // redraw header
    yOffset -= headerHeight; // deduct actual header height
  }
  // Total Invoice Amount Row
  const totalHeight = drawRow(
    ["Total Invoice Amount", "", "", "", "", "", "", data.totalAmount],
    yOffset,
    false,
    true,
    false,
    {
      drawLeft: (i) => i === 0 || i === 7,
      drawRight: (i) => i === 7,
    }
  );
  yOffset -= totalHeight;

  // Adjust space for Amount in Words Row if necessary
  if (yOffset - 40 < yLimit) {
    page = pdfDoc.addPage([750, 900]);
    yOffset = height - 40;
    const headerHeight = drawRow(data.headers, yOffset, true, true); // redraw header
    yOffset -= headerHeight; // d
  }

  const remainingWidths = totalWidth; // Amount in Words spans entire width
  const labelHeight = textSize + 2;
  const lineHeight = textSize + 2;
  const verticalGap = 5;

  const wordsLine = wrapText(
    data.amountInWords,
    font,
    textSize,
    remainingWidths - 2 * padding,
    padding
  );
  const valueHeight = wordsLine.length * lineHeight;

  const amountRowHeight = labelHeight + verticalGap + valueHeight + 2 * padding;

  // Top Border
  page.drawLine({
    start: { x: startX, y: yOffset },
    end: { x: startX + totalWidth, y: yOffset },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Left Border
  page.drawLine({
    start: { x: startX, y: yOffset },
    end: { x: startX, y: yOffset - amountRowHeight },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  // "Amount in words:" label
  page.drawText("Amount in words:", {
    x: startX + padding,
    y: yOffset - padding - textSize,
    size: textSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Wrapped value
  const valueStartY = yOffset - padding - labelHeight - verticalGap;
  drawWrappedCellText(
    startX,
    valueStartY + lineHeight, // text draw starts from top of first line
    remainingWidths - 2 * padding,
    wordsLine,
    font,
    "left"
  );

  // Right Border
  page.drawLine({
    start: { x: startX + totalWidth, y: yOffset },
    end: { x: startX + totalWidth, y: yOffset - amountRowHeight },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Bottom Border
  page.drawLine({
    start: { x: startX, y: yOffset - amountRowHeight },
    end: { x: startX + totalWidth, y: yOffset - amountRowHeight },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Update yOffset at the end
  yOffset -= amountRowHeight;

  return { latestY: yOffset, latestPage: page };
};

// function to draw header
const drawFrontPageHeader = async (
  page: PDFPage,
  height: number,
  width: number,
  boldFont: PDFFont,
  regularFont: PDFFont,
  invoiceData: IPDFInvoice,
 logoImg: PDFImage | null // Added
) => {
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width: 390,
    height: 75,
    color: rgb(1, 138 / 252, 50 / 252), // light gray background
  });

  drawText(
    "Reg. Address:",
    110,
    height - 65,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  drawText(
    "E-101, Suncrest Accolade CHS,",
    200,
    height - 65,
    boldFont,
    regularFont,
    page,
    12,
    false
  );
  drawText(
    "Louiswadi, Green Road, Thane (West) - 400604,",
    110,
    height - 85,
    boldFont,
    regularFont,
    page,
    12,
    false
  );
  drawText("CIN:", 110, height - 107, boldFont, regularFont, page, 13, true);
  drawText(
    `${invoiceData.companyDetails.cin}`,
    140,
    height - 107,
    boldFont,
    regularFont,
    page,
    12,
    false
  );
  drawImage(logoImg, width - 155, height - 118, 130, 75, page);
  // await drawImage(
  //   invoiceData.companyDetails.companyLogo,
  //   width - 155,
  //   height - 118,
  //   130,
  //   75,
  //   page,
  //   pdfDoc
  // );
  drawText(
    "Tax Invoice/Bill of Supply/Cash Memo (Original for Recipient)",
    190,
    height - 170,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  // Invoice details
  drawText(
    `Invoice Number:`,
    width - 253,
    height - 260,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  drawText(
    `${invoiceData.invoiceNo}`,
    width - 148,
    height - 260,
    boldFont,
    regularFont,
    page,
    13,
    false
  );
  drawText(
    `Invoice Date:`,
    width - 180,
    height - 278,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  drawText(
    `${invoiceData.invoiceDate}`,
    width - 95,
    height - 278,
    boldFont,
    regularFont,
    page,
    13,
    false
  );
  drawText(
    `GST No:`,
    width - 205,
    height - 296,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  drawText(
    `${invoiceData.companyDetails.gstin}`,
    width - 152,
    height - 296,
    boldFont,
    regularFont,
    page,
    13,
    false
  );
  drawText(
    `MSME No:`,
    width - 250,
    height - 314,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  drawText(
    `${invoiceData.companyDetails.msmeNo}`,
    width - 181,
    height - 314,
    boldFont,
    regularFont,
    page,
    13,
    false
  );
  drawText(`To,`, 25, height - 330, boldFont, regularFont, page, 13, true);
  drawText(
    `Customer Name:`,
    25,
    height - 348,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  drawText(
    `${invoiceData.userName}`,
    132,
    height - 348,
    boldFont,
    regularFont,
    page,
    13,
    false
  );
  drawText(
    `Customer Address:`,
    25,
    height - 366,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  const addressBaseY = height - 366;
  const lineHeight = 16;
  const addressLines = wrapText(
    invoiceData.userAddress ?? "-",
    regularFont,
    13,
    width - 149 - 30, // available space from x=149 to page end
    0 // no need for extra padding inside plain text
  );
  addressLines.forEach((line, i) => {
    drawText(
      line,
      149,
      addressBaseY - i * lineHeight,
      boldFont,
      regularFont,
      page,
      13,
      false
    );
  });
   drawText(
    `Customer GST No: `,
    25,
    height - 384,
    boldFont,
    regularFont,
    page,
    13,
    true
  );
  drawText(
    `${invoiceData.customerGst}`,
    142,
    height - 384,
    boldFont,
    regularFont,
    page,
    13,
    false
  );
  return {
    addressBaseY,
    addressLines,
    lineHeight,
  };
  
};

//function to draw footer
export const drawFooter = async (
  latestY: number,
  latestPage: PDFPage,
  pdfDoc: PDFDocument,
  height: number,
  invoiceData: IPDFInvoice,
  width: number,
  icons: { 
    signImg: PDFImage | null, 
    webIcon: PDFImage | null, 
    emailIcon: PDFImage | null, 
    phoneIcon: PDFImage | null 
  } // Added
) => {
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 0;
  if (latestY - 40 < 50) {
    latestPage = pdfDoc.addPage([750, 900]);
    latestY = height - 120;
  } else {
    y = 80;
  }
  drawImage(icons.signImg, width - 120, latestY - y, 80, 75, latestPage);
  if (latestY - 40 < 40) {
    latestPage = pdfDoc.addPage([750, 900]);
    latestY = height - 40;
  } else {
    latestY = latestY - y;
    y = 8;
  }

  drawText(
    "Authorized Signatory",
    width - 155,
    latestY - y,
    boldFont,
    regularFont,
    latestPage,
    12,
    true
  );
  if (latestY - 40 < 40) {
    latestPage = pdfDoc.addPage([750, 900]);
    latestY = height - 40;
  } else {
    latestY = latestY - y;
    y = 50;
  }

  drawText(
    `${invoiceData.companyDetails.name}`,
    270,
    latestY - y,
    boldFont,
    regularFont,
    latestPage,
    13,
    false
  );
  if (latestY - 40 < 40) {
    latestPage = pdfDoc.addPage([750, 900]);
    latestY = height - 40;
  } else {
    latestY = latestY - y;
    y = 30;
  }

  drawText(
    "Please note that this invoice is not a demand for payment.",
    210,
    latestY - y,
    boldFont,
    regularFont,
    latestPage,
    13,
    false
  );
  let isNewPage = false;
  if (latestY - 50 < 50) {
    latestPage = pdfDoc.addPage([750, 900]);
    latestY = height - 40;
    isNewPage = true;
  } else {
    latestY = latestY - y;
    y = 70;
  }

  latestPage.drawRectangle({
    x: 0,
    y: latestY - y,
    width,
    height: 50,
    color: rgb(1, 138 / 252, 50 / 252), // light gray background
  });
  y = 10;
  drawImage(icons.webIcon, 120, isNewPage ? latestY - 13 : latestY - 50, 15, 15, latestPage);
  drawText(
    `${invoiceData.companyDetails.website}`,
    140,
    isNewPage ? latestY - y : latestY - 47,
    boldFont,
    regularFont,
    latestPage,

    12,
    false,
    rgb(1, 1, 1)
  );

  drawImage(icons.emailIcon,  330,
    isNewPage ? latestY - 14 : latestY - 51,

    16,
    16, latestPage);
  drawText(
    `${invoiceData.companyDetails.email}`,
    350,
    isNewPage ? latestY - y : latestY - 47,
    boldFont,
    regularFont,
    latestPage,
    12,
    false,
    rgb(1, 1, 1)
  );
   drawImage(icons.phoneIcon, 540,
    isNewPage ? latestY - 15 : latestY - 52,
    17,
    17, latestPage);
  drawText(
    `${invoiceData.companyDetails.phoneNumber}`,
    563,
    isNewPage ? latestY - y : latestY - 47,
    boldFont,
    regularFont,
    latestPage,
    12,
    false,
    rgb(1, 1, 1)
  );
};

//main function
export const invoiceTemplates = async (invoiceData: IPDFInvoice) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([750, 900]);
  const { height, width } = page.getSize();
  
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // --- PRE-EMBED IMAGES HERE ---
  const [logoImg, signImg, webIcon, emailIcon, phoneIcon] = await Promise.all([
    fetchAndEmbedImage(invoiceData.companyDetails.companyLogo, pdfDoc),
    fetchAndEmbedImage(invoiceData.companyDetails.signatory, pdfDoc),
    fetchAndEmbedImage(companyDetails.website, pdfDoc), // From your constants
    fetchAndEmbedImage(companyDetails.email, pdfDoc),
    fetchAndEmbedImage(companyDetails.phoneNumber, pdfDoc),
  ]);

  // Pass images into the header/footer functions
  const { addressBaseY, addressLines, lineHeight } = await drawFrontPageHeader(
    page,
    height,
    width,
    boldFont,
    regularFont,
    invoiceData,
    // pdfDoc,
    logoImg // Added
  );

  const tableStartY = addressBaseY - addressLines.length * lineHeight - 30;
  const rowData = invoiceData.items.map((item) => [
    item.particulars, item.unitCost.toString(), item.quantity.toString(),
    item.netCost.toString(), item.tax, item.type, item.taxAmount.toString(),
    item.totalAmount.toString(),
  ]);

  let { latestY, latestPage } = drawInvoiceTable(
    page, regularFont, boldFont, 25, tableStartY,
    [250, 80, 40, 70, 45, 65, 75, 70], 12,
    {
      headers: ["Particulars", "Unit Price", "Qty", "Net Amount", "Tax rate", "Tax Type", "Tax Amount", "Total Amount"],
      row: rowData,
      totalAmount: `Rs ${invoiceData.total}`,
      amountInWords: `${invoiceData.amountInWords}`,
    },
    pdfDoc, height, 40
  );

  // Pass the footer images
  await drawFooter(
    latestY, latestPage, pdfDoc, height, invoiceData, width,
    { signImg, webIcon, emailIcon, phoneIcon } // Added
  );

  // CRITICAL: Use object streams for better compression
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return pdfBytes;
};

// export const invoiceTemplates = async (invoiceData: IPDFInvoice) => {
//   const pdfDoc = await PDFDocument.create();
//   const page = pdfDoc.addPage([750, 900]); // A4 size
//   const { height, width } = page.getSize();
//   const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
//   const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//   const { addressBaseY, addressLines, lineHeight } = await drawFrontPageHeader(
//     page,
//     height,
//     width,
//     boldFont,
//     regularFont,
//     invoiceData,
//     pdfDoc
//   );

//   // Calculate Y position after the last address line, with a small gap
//   const tableStartY = addressBaseY - addressLines.length * lineHeight - 10;

//   //fetch row data of table
//   const rowData = invoiceData.items.map((item) => [
//     item.particulars,
//     item.unitCost.toString(),
//     item.quantity.toString(),
//     item.netCost.toString(),
//     item.tax,
//     item.type,
//     item.taxAmount.toString(),
//     item.totalAmount.toString(),
//   ]);

//   //draw table
//   let { latestY, latestPage } = drawInvoiceTable(
//     page,
//     regularFont,
//     boldFont,
//     25,
//     tableStartY,
//     [250, 80, 40, 70, 45, 65, 75, 70],
//     12,
//     {
//       headers: [
//         "Particulars",
//         "Unit Price",
//         "Qty",
//         "Net Amount",
//         "Tax rate",
//         "Tax Type",
//         "Tax Amount",
//         "Total Amount",
//       ],
//       row: rowData,

//       totalAmount: `Rs ${invoiceData.total}`,
//       amountInWords: `${invoiceData.amountInWords}`,
//     },
//     pdfDoc,
//     height,
//     40 // yLimit, the bottom margin limit before adding a new page
//   );

//   //draw footer
//   await drawFooter(latestY, latestPage, pdfDoc, height, invoiceData, width);
//   const pdfBytes = await pdfDoc.save();
//   return pdfBytes;
// };
