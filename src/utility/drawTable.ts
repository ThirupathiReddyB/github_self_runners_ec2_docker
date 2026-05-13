import { PDFPage, PDFFont, rgb, PDFDocument } from "pdf-lib";

export const drawTable = (
  pdfDoc: PDFDocument,
  font: PDFFont,
  startX: number,
  startY: number,
  rowHeight: number,
  colWidths: number[],
  headers: string[],
  mergedHeaders: { header: string; span: number; startColumn: number }[],
  rows: Array<Record<string, any>>,
  initialPage: PDFPage
) => {
  const textSize = 12;
  const mergedHeaderHeight = rowHeight;
  const subHeaderHeight = rowHeight;

  let page = initialPage;
  let y = startY;

  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);

  const drawLine = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    page.drawLine({
      start,
      end,
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  };

  const drawHeaders = () => {
    const hasMergedHeaders = mergedHeaders.length > 0;

    // TOP LINE ABOVE HEADERS
    drawLine({ x: startX, y }, { x: startX + totalTableWidth, y });

    let x = startX;

    if (hasMergedHeaders) {
      // Draw merged headers
      mergedHeaders.forEach((merged) => {
        const spanWidth = colWidths
          .slice(merged.startColumn, merged.startColumn + merged.span)
          .reduce((a, b) => a + b, 0);

        const textWidth = font.widthOfTextAtSize(merged.header, textSize);
        const textX = x + (spanWidth - textWidth) / 2;
        const textY = y - (mergedHeaderHeight + textSize) / 2 + 4;

        page.drawText(merged.header, {
          x: textX,
          y: textY,
          size: textSize,
          font,
          color: rgb(0, 0, 0),
        });

        drawLine({ x, y }, { x, y: y - mergedHeaderHeight });
        drawLine(
          { x: x + spanWidth, y },
          { x: x + spanWidth, y: y - mergedHeaderHeight }
        );

        x += spanWidth;
      });

      drawLine(
        { x: startX, y: y - mergedHeaderHeight },
        { x: startX + totalTableWidth, y: y - mergedHeaderHeight }
      );
      y -= mergedHeaderHeight;
    }

    // Draw subheaders
    x = startX;
    headers.forEach((header, i) => {
      const width = colWidths[i];
      const textWidth = font.widthOfTextAtSize(header, textSize);
      const textX = x + (width - textWidth) / 2;
      const textY = y - (subHeaderHeight + textSize) / 2 + 4;

      page.drawText(header, {
        x: textX,
        y: textY,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });

      drawLine({ x, y }, { x, y: y - subHeaderHeight });
      drawLine({ x: x + width, y }, { x: x + width, y: y - subHeaderHeight });

      x += width;
    });

    drawLine(
      { x: startX, y: y - subHeaderHeight },
      { x: startX + totalTableWidth, y: y - subHeaderHeight }
    );

    y -= subHeaderHeight;
  };

  const handlePageBreak = () => {
    if (y - rowHeight < 50) {
      page = pdfDoc.addPage([600, 800]);
      y = page.getHeight() - 40;
      drawHeaders();
    }
  };

  drawHeaders();

  // Draw body rows
  rows.forEach((row) => {
    handlePageBreak();

    let x = startX;

    drawLine({ x: startX, y }, { x: startX, y: y - rowHeight });

    row.forEach((cell:any, i:any) => {
      const cellWidth = colWidths[i];
      const textWidth = font.widthOfTextAtSize(cell, textSize);
      const textX = x + (cellWidth - textWidth) / 2;
      const textY = y - (rowHeight + textSize) / 2 + 4;

      page.drawText(cell, {
        x: textX,
        y: textY,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });

      x += cellWidth;
      drawLine({ x, y }, { x, y: y - rowHeight });
    });

    drawLine(
      { x: startX, y: y - rowHeight },
      { x: startX + totalTableWidth, y: y - rowHeight }
    );

    y -= rowHeight;
  });
};
