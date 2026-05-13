import { parse } from "json2csv";
import { writeFile } from "fs/promises";
import path from "path";
import { uploadGenImage } from "../aws/uploadFile";
import HTTPError from "../HttpError";
import fs from "fs";
import prisma from "../../prisma";

export async function exportSyncChangesData() {
  try {
    console.log("Exporting sync changes archive data...");

    // Get the first date of the current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Step 1: Fetch data from the database
    const data = await prisma.syncChanges.findMany({
      where: {
        createdAt: {
          lt: firstDayOfMonth,
        },
        synced: true,
      },
    });

    // Step 2: Convert JSON data to CSV
    const csv = parse(data);

    // Step 3: Define the file path and write the CSV data to a file
    const filePath = path.join(
      __dirname,
      `../../uploads/sync_changes_data_${Date.now()}.csv`
    );
    await writeFile(filePath, csv);
    const fileStream = fs.createReadStream(filePath);
    // console.log("FILEPATH::", fileStream.path);

    //Step 4: Upload csv file to s3 under syncingData folder
    const result = await uploadGenImage(fileStream, "syncing-archive");
    if (!result) throw new HTTPError("Could not upload data to s3", 502);

    console.log(`Data has been successfully exported to ${filePath}`);
  } catch (error) {
    console.error("Error exporting data to CSV:", error);
  } finally {
    await prisma.$disconnect();
  }
}
